"""
相机配置 API 蓝图
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
from app import db
from app.models import CameraConfig, AuditLog
from app.utils import jwt_required_custom

camera_bp = Blueprint('cameras', __name__)


@camera_bp.route('', methods=['GET'])
@jwt_required_custom
def get_cameras():
    """获取相机配置列表（分页）"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        is_active = request.args.get('is_active', type=str)

        # 构建查询
        query = CameraConfig.query

        # 筛选激活状态
        if is_active is not None:
            query = query.filter_by(is_active=(is_active.lower() == 'true'))

        # 排序和分页
        query = query.order_by(CameraConfig.created_at.desc())
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)

        return jsonify({
            'success': True,
            'data': [camera.to_dict() for camera in pagination.items],
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


@camera_bp.route('/<int:camera_id>', methods=['GET'])
@jwt_required_custom
def get_camera(camera_id):
    """获取单个相机配置"""
    try:
        camera = CameraConfig.query.get(camera_id)

        if not camera:
            return jsonify({
                'success': False,
                'error': '相机配置不存在'
            }), 404

        return jsonify({
            'success': True,
            'data': camera.to_dict()
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@camera_bp.route('', methods=['POST'])
@jwt_required_custom
def create_camera():
    """创建相机配置"""
    try:
        data = request.get_json()
        user_id = get_jwt_identity()

        # 验证必需字段
        required_fields = ['name', 'host', 'port']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'error': f'缺少必需字段: {field}'
                }), 400

        # 创建配置
        camera = CameraConfig(
            name=data['name'],
            protocol=data.get('protocol', 'http'),
            host=data['host'],
            port=data['port'],
            path_prefix=data.get('path_prefix', ''),
            auth_token=data.get('auth_token'),
            description=data.get('description'),
            is_active=data.get('is_active', True),
            created_by=user_id
        )

        db.session.add(camera)
        db.session.commit()

        # 记录审计日志
        AuditLog.log(
            user_id=user_id,
            action='create_camera',
            resource_type='camera_config',
            resource_id=camera.id,
            ip_address=request.remote_addr,
            details={'name': camera.name}
        )
        db.session.commit()

        return jsonify({
            'success': True,
            'data': camera.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@camera_bp.route('/<int:camera_id>', methods=['PUT'])
@jwt_required_custom
def update_camera(camera_id):
    """更新相机配置"""
    try:
        camera = CameraConfig.query.get(camera_id)

        if not camera:
            return jsonify({
                'success': False,
                'error': '相机配置不存在'
            }), 404

        data = request.get_json()
        user_id = get_jwt_identity()

        # 更新字段
        if 'name' in data:
            camera.name = data['name']
        if 'protocol' in data:
            camera.protocol = data['protocol']
        if 'host' in data:
            camera.host = data['host']
        if 'port' in data:
            camera.port = data['port']
        if 'path_prefix' in data:
            camera.path_prefix = data['path_prefix']
        if 'auth_token' in data:
            camera.auth_token = data['auth_token']
        if 'description' in data:
            camera.description = data['description']
        if 'is_active' in data:
            camera.is_active = data['is_active']

        db.session.commit()

        # 记录审计日志
        AuditLog.log(
            user_id=user_id,
            action='update_camera',
            resource_type='camera_config',
            resource_id=camera.id,
            ip_address=request.remote_addr,
            details={'name': camera.name}
        )
        db.session.commit()

        return jsonify({
            'success': True,
            'data': camera.to_dict()
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@camera_bp.route('/<int:camera_id>', methods=['DELETE'])
@jwt_required_custom
def delete_camera(camera_id):
    """删除相机配置"""
    try:
        camera = CameraConfig.query.get(camera_id)

        if not camera:
            return jsonify({
                'success': False,
                'error': '相机配置不存在'
            }), 404

        user_id = get_jwt_identity()
        camera_name = camera.name

        db.session.delete(camera)
        db.session.commit()

        # 记录审计日志
        AuditLog.log(
            user_id=user_id,
            action='delete_camera',
            resource_type='camera_config',
            resource_id=camera_id,
            ip_address=request.remote_addr,
            details={'name': camera_name}
        )
        db.session.commit()

        return jsonify({
            'success': True,
            'message': '相机配置已删除'
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@camera_bp.route('/<int:camera_id>/activate', methods=['POST'])
@jwt_required_custom
def activate_camera(camera_id):
    """激活相机配置（设为活动状态）"""
    try:
        camera = CameraConfig.query.get(camera_id)

        if not camera:
            return jsonify({
                'success': False,
                'error': '相机配置不存在'
            }), 404

        user_id = get_jwt_identity()
        camera.is_active = True
        db.session.commit()

        # 记录审计日志
        AuditLog.log(
            user_id=user_id,
            action='activate_camera',
            resource_type='camera_config',
            resource_id=camera.id,
            ip_address=request.remote_addr,
            details={'name': camera.name}
        )
        db.session.commit()

        return jsonify({
            'success': True,
            'data': camera.to_dict()
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
