"""
版本管理 API 蓝图
"""
import os
from datetime import datetime
from flask import Blueprint, request, jsonify, send_file, current_app
from flask_jwt_extended import get_jwt_identity
from werkzeug.utils import secure_filename
from app import db, limiter
from app.models import SoftwareVersion, AuditLog
from app.utils import jwt_required_custom, save_uploaded_file, delete_file

version_bp = Blueprint('versions', __name__)


@version_bp.route('', methods=['GET'])
@jwt_required_custom
def get_versions():
    """获取版本列表（分页）"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        platform = request.args.get('platform', type=str)
        release_type = request.args.get('release_type', type=str)

        # 构建查询
        query = SoftwareVersion.query

        # 筛选平台
        if platform:
            query = query.filter_by(platform=platform)

        # 筛选发布类型
        if release_type:
            query = query.filter_by(release_type=release_type)

        # 排序和分页（MySQL兼容方式）
        query = query.order_by(
            SoftwareVersion.published_at.is_(None),
            SoftwareVersion.published_at.desc()
        )
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)

        return jsonify({
            'success': True,
            'data': [version.to_dict() for version in pagination.items],
            'total': pagination.total,
            'page': page,
            'per_page': per_page,
            'pages': pagination.pages
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@version_bp.route('/<int:version_id>', methods=['GET'])
@jwt_required_custom
def get_version(version_id):
    """获取版本详情"""
    try:
        version = SoftwareVersion.query.get(version_id)

        if not version:
            return jsonify({
                'success': False,
                'error': '版本不存在'
            }), 404

        return jsonify({
            'success': True,
            'data': version.to_dict()
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@version_bp.route('/upload', methods=['POST'])
@jwt_required_custom
def upload_version():
    """上传安装包"""
    try:
        # 检查文件
        if 'file' not in request.files:
            return jsonify({
                'success': False,
                'error': '未找到上传文件'
            }), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({
                'success': False,
                'error': '文件名为空'
            }), 400

        # 获取表单数据
        version = request.form.get('version')
        platform = request.form.get('platform')
        arch = request.form.get('arch', 'x64')
        release_type = request.form.get('release_type', 'stable')
        release_notes = request.form.get('release_notes', '')
        is_latest = request.form.get('is_latest', 'false').lower() == 'true'
        is_mandatory = request.form.get('is_mandatory', 'false').lower() == 'true'

        # 验证必需字段
        if not version or not platform:
            return jsonify({
                'success': False,
                'error': '缺少版本号或平台信息'
            }), 400

        # 检查版本是否已存在
        existing = SoftwareVersion.query.filter_by(version=version, platform=platform, arch=arch).first()
        if existing:
            return jsonify({
                'success': False,
                'error': '该版本已存在'
            }), 400

        # 保存文件
        file_info = save_uploaded_file(file, subfolder='installers')

        # 创建版本记录
        user_id = get_jwt_identity()
        software_version = SoftwareVersion(
            version=version,
            release_type=release_type,
            platform=platform,
            arch=arch,
            installer_filename=file_info['filename'],
            installer_path=file_info['path'],
            file_size=file_info['size'],
            checksum_sha256=file_info['checksum'],
            release_notes=release_notes,
            is_latest=is_latest,
            is_mandatory=is_mandatory,
            uploaded_by=user_id,
            published_at=datetime.now()
        )

        db.session.add(software_version)

        # 如果设为最新版本，取消其他版本的最新标记
        if is_latest:
            SoftwareVersion.query.filter(
                SoftwareVersion.platform == platform,
                SoftwareVersion.arch == arch,
                SoftwareVersion.id != software_version.id
            ).update({'is_latest': False})

        db.session.commit()

        # 记录审计日志
        AuditLog.log(
            user_id=user_id,
            action='upload_version',
            resource_type='software_version',
            resource_id=software_version.id,
            ip_address=request.remote_addr,
            details={'version': version, 'platform': platform}
        )
        db.session.commit()

        return jsonify({
            'success': True,
            'data': software_version.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@version_bp.route('/<int:version_id>', methods=['PUT'])
@jwt_required_custom
def update_version(version_id):
    """更新版本信息"""
    try:
        version = SoftwareVersion.query.get(version_id)

        if not version:
            return jsonify({
                'success': False,
                'error': '版本不存在'
            }), 404

        data = request.get_json()
        user_id = get_jwt_identity()

        # 更新字段
        if 'release_notes' in data:
            version.release_notes = data['release_notes']
        if 'is_mandatory' in data:
            version.is_mandatory = data['is_mandatory']

        db.session.commit()

        # 记录审计日志
        AuditLog.log(
            user_id=user_id,
            action='update_version',
            resource_type='software_version',
            resource_id=version.id,
            ip_address=request.remote_addr,
            details={'version': version.version}
        )
        db.session.commit()

        return jsonify({
            'success': True,
            'data': version.to_dict()
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@version_bp.route('/<int:version_id>', methods=['DELETE'])
@jwt_required_custom
def delete_version(version_id):
    """删除版本"""
    try:
        version = SoftwareVersion.query.get(version_id)

        if not version:
            return jsonify({
                'success': False,
                'error': '版本不存在'
            }), 404

        user_id = get_jwt_identity()
        version_number = version.version
        installer_path = version.installer_path

        # 删除数据库记录
        db.session.delete(version)
        db.session.commit()

        # 删除文件
        try:
            delete_file(installer_path)
        except:
            pass

        # 记录审计日志
        AuditLog.log(
            user_id=user_id,
            action='delete_version',
            resource_type='software_version',
            resource_id=version_id,
            ip_address=request.remote_addr,
            details={'version': version_number}
        )
        db.session.commit()

        return jsonify({
            'success': True,
            'message': '版本已删除'
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@version_bp.route('/<int:version_id>/set-latest', methods=['POST'])
@jwt_required_custom
def set_latest(version_id):
    """设为最新版本"""
    try:
        version = SoftwareVersion.query.get(version_id)

        if not version:
            return jsonify({
                'success': False,
                'error': '版本不存在'
            }), 404

        user_id = get_jwt_identity()

        # 取消同平台其他版本的最新标记
        SoftwareVersion.query.filter(
            SoftwareVersion.platform == version.platform,
            SoftwareVersion.arch == version.arch,
            SoftwareVersion.id != version.id
        ).update({'is_latest': False})

        version.is_latest = True
        db.session.commit()

        # 记录审计日志
        AuditLog.log(
            user_id=user_id,
            action='set_latest_version',
            resource_type='software_version',
            resource_id=version.id,
            ip_address=request.remote_addr,
            details={'version': version.version}
        )
        db.session.commit()

        return jsonify({
            'success': True,
            'data': version.to_dict()
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# ===== 客户端无需JWT认证的接口 =====


@version_bp.route('/check-update', methods=['POST'])
@limiter.limit("60 per hour")
def check_update():
    """客户端检查更新（无需JWT）"""
    try:
        data = request.get_json()

        # 验证必需字段
        if 'current_version' not in data or 'platform' not in data:
            return jsonify({
                'success': False,
                'error': '缺少当前版本或平台信息'
            }), 400

        current_version = data['current_version']
        platform = data['platform']
        arch = data.get('arch', 'x64')

        # 查找最新版本
        latest_version = SoftwareVersion.query.filter_by(
            platform=platform,
            arch=arch,
            is_latest=True
        ).first()

        if not latest_version:
            return jsonify({
                'success': True,
                'has_update': False,
                'message': '暂无可用更新'
            })

        # 比较版本号（简单字符串比较）
        has_update = latest_version.version != current_version

        response_data = {
            'has_update': has_update
        }

        if has_update:
            response_data['latest_version'] = {
                'id': latest_version.id,
                'version': latest_version.version,
                'release_type': latest_version.release_type,
                'file_size': latest_version.file_size,
                'checksum_sha256': latest_version.checksum_sha256,
                'release_notes': latest_version.release_notes,
                'is_mandatory': latest_version.is_mandatory,
                'published_at': latest_version.published_at.isoformat() if latest_version.published_at else None
            }

        return jsonify({
            'success': True,
            **response_data
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@version_bp.route('/<int:version_id>/download', methods=['GET'])
def download_version(version_id):
    """下载安装包（无需JWT）"""
    try:
        version = SoftwareVersion.query.get(version_id)

        if not version:
            return jsonify({
                'success': False,
                'error': '版本不存在'
            }), 404

        # 构建文件路径
        file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], version.installer_path)

        if not os.path.exists(file_path):
            return jsonify({
                'success': False,
                'error': '文件不存在'
            }), 404

        # 增加下载计数
        version.increment_download()
        db.session.commit()

        # 返回文件
        return send_file(
            file_path,
            as_attachment=True,
            download_name=version.installer_filename,
            mimetype='application/octet-stream'
        )

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
