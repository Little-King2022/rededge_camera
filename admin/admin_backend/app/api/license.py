"""
授权管理 API 蓝图
"""
from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
from app import db, limiter
from app.models import LicenseCode, Client, AuditLog
from app.utils import jwt_required_custom, generate_batch_licenses
from app.utils.rsa_utils import decrypt_rsa

license_bp = Blueprint('licenses', __name__)


@license_bp.route('', methods=['GET'])
@jwt_required_custom
def get_licenses():
    """获取授权码列表（分页）"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        license_type = request.args.get('license_type', type=str)
        is_active = request.args.get('is_active', type=str)
        offline_mode = request.args.get('offline_mode', type=str)

        # 构建查询
        query = LicenseCode.query

        # 筛选授权类型
        if license_type:
            query = query.filter_by(license_type=license_type)

        # 筛选激活状态
        if is_active is not None:
            query = query.filter_by(is_active=(is_active.lower() == 'true'))

        # 筛选离线模式
        if offline_mode is not None:
            query = query.filter_by(offline_mode=(offline_mode.lower() == 'true'))

        # 排序和分页
        query = query.order_by(LicenseCode.created_at.desc())
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)

        return jsonify({
            'success': True,
            'data': [license.to_dict() for license in pagination.items],
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


@license_bp.route('/<string:code>', methods=['GET'])
@jwt_required_custom
def get_license_by_code(code):
    """查询授权码详情"""
    try:
        license = LicenseCode.query.filter_by(code=code).first()

        if not license:
            return jsonify({
                'success': False,
                'error': '授权码不存在'
            }), 404

        return jsonify({
            'success': True,
            'data': license.to_dict()
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@license_bp.route('/generate', methods=['POST'])
@jwt_required_custom
def generate_licenses():
    """批量生成授权码"""
    try:
        data = request.get_json()
        user_id = get_jwt_identity()

        # 获取参数
        count = data.get('count', 1)
        license_type = data.get('license_type', 'standard')
        duration_days = data.get('duration_days', 365)
        offline_mode = data.get('offline_mode', False)
        notes = data.get('notes', '')

        # 验证参数
        if count < 1 or count > 100:
            return jsonify({
                'success': False,
                'error': '生成数量必须在 1-100 之间'
            }), 400

        # 生成授权码
        licenses_data = generate_batch_licenses(
            count=count,
            license_type=license_type,
            duration_days=duration_days,
            offline_mode=offline_mode,
            notes=notes
        )

        # 保存到数据库
        created_licenses = []
        for license_data in licenses_data:
            license = LicenseCode(
                code=license_data['code'],
                license_type=license_data['license_type'],
                duration_days=license_data['duration_days'],
                offline_mode=license_data['offline_mode'],
                notes=license_data['notes'],
                created_by=user_id
            )
            license._append_log('created', {
                'created_by': user_id
            })
            db.session.add(license)
            created_licenses.append(license)

        db.session.commit()

        # 记录审计日志
        AuditLog.log(
            user_id=user_id,
            action='create_license',
            resource_type='license_code',
            ip_address=request.remote_addr,
            details={
                'count': count,
                'license_type': license_type,
                'offline_mode': offline_mode
            }
        )
        db.session.commit()

        return jsonify({
            'success': True,
            'data': [license.to_dict() for license in created_licenses]
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@license_bp.route('/<int:license_id>', methods=['PUT'])
@jwt_required_custom
def update_license(license_id):
    """更新授权码"""
    try:
        license = LicenseCode.query.get(license_id)

        if not license:
            return jsonify({
                'success': False,
                'error': '授权码不存在'
            }), 404

        data = request.get_json()
        user_id = get_jwt_identity()

        # 更新字段
        if 'notes' in data:
            license.notes = data['notes']
        if 'is_active' in data:
            license.is_active = data['is_active']

        db.session.commit()

        # 记录审计日志
        AuditLog.log(
            user_id=user_id,
            action='update_license',
            resource_type='license_code',
            resource_id=license.id,
            ip_address=request.remote_addr,
            details={'code': license.code}
        )
        db.session.commit()

        return jsonify({
            'success': True,
            'data': license.to_dict()
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@license_bp.route('/<int:license_id>', methods=['DELETE'])
@jwt_required_custom
def delete_license(license_id):
    """删除授权码"""
    try:
        license = LicenseCode.query.get(license_id)

        if not license:
            return jsonify({
                'success': False,
                'error': '授权码不存在'
            }), 404

        # 不允许删除已激活的授权码
        if license.current_activations > 0:
            return jsonify({
                'success': False,
                'error': '无法删除已激活的授权码'
            }), 400

        user_id = get_jwt_identity()
        license_code = license.code

        db.session.delete(license)
        db.session.commit()

        # 记录审计日志
        AuditLog.log(
            user_id=user_id,
            action='delete_license',
            resource_type='license_code',
            resource_id=license_id,
            ip_address=request.remote_addr,
            details={'code': license_code}
        )
        db.session.commit()

        return jsonify({
            'success': True,
            'message': '授权码已删除'
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@license_bp.route('/<int:license_id>/revoke', methods=['POST'])
@jwt_required_custom
def revoke_license_code(license_id):
    """吊销授权码"""
    try:
        license = LicenseCode.query.get(license_id)

        if not license:
            return jsonify({
                'success': False,
                'error': '授权码不存在'
            }), 404

        user_id = get_jwt_identity()

        client = None
        if license.activated_by_client_id:
            client = Client.query.get(license.activated_by_client_id)

        client_info = {
            'client_id': client.id,
            'device_fingerprint': client.device_fingerprint,
            'hostname': client.hostname,
            'platform': client.platform,
            'arch': client.arch,
            'app_version': client.app_version
        } if client else {}

        license.is_active = False
        license.deactivate(license.activated_by_client_id, reason='revoked', client_info=client_info)

        if client and client.activation_code == license.code:
            client.activation_code = None
            client.license_expiry_at = None
            client.offline_mode = False
            client.license_status = 'revoked'

        db.session.commit()

        AuditLog.log(
            user_id=user_id,
            action='revoke_license_code',
            resource_type='license_code',
            resource_id=license.id,
            ip_address=request.remote_addr,
            details={'code': license.code}
        )
        db.session.commit()

        return jsonify({
            'success': True,
            'data': license.to_dict()
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# ===== 客户端无需JWT认证的接口 =====


@license_bp.route('/activate', methods=['POST'])
@limiter.limit("20 per hour")
def activate_license():
    """??????????JWT?"""
    try:
        data = request.get_json()

        # ??????
        if 'device_fingerprint' not in data or 'activation_code' not in data:
            return jsonify({
                'success': False,
                'error': '??????????'
            }), 400

        device_fingerprint = data['device_fingerprint']
        encrypted_activation_code = data['activation_code']

        # RSA ?????
        try:
            activation_code = decrypt_rsa(encrypted_activation_code)
        except Exception:
            return jsonify({
                'success': False,
                'error': '???????'
            }), 400

        # ?????
        client = Client.query.filter_by(device_fingerprint=device_fingerprint).first()
        if not client:
            return jsonify({
                'success': False,
                'error': '??????'
            }), 404

        # ?????
        license = LicenseCode.query.filter_by(code=activation_code).first()
        if not license:
            return jsonify({
                'success': False,
                'error': '??????'
            }), 404

        client_info = {
            'client_id': client.id,
            'device_fingerprint': client.device_fingerprint,
            'hostname': client.hostname,
            'platform': client.platform,
            'arch': client.arch,
            'app_version': client.app_version
        }

        # 如果客户端已有旧授权码且与本次不同，则释放旧授权占用
        if client.activation_code and client.activation_code != activation_code:
            old_license = LicenseCode.query.filter_by(code=client.activation_code).first()
            if old_license:
                old_license.deactivate(client.id, reason='released', client_info=client_info)

        # 激活授权码
        try:
            license.activate(client.id, client_info=client_info)
        except ValueError as e:
            return jsonify({
                'success': False,
                'error': str(e)
            }), 400

        # ???????
        client.activation_code = activation_code
        client.license_status = 'activated'
        client.license_expiry_at = license.expires_at
        client.offline_mode = license.offline_mode

        db.session.commit()

        return jsonify({
            'success': True,
            'data': {
                'license_status': 'activated',
                'license_type': license.license_type,
                'offline_mode': license.offline_mode,
                'expires_at': license.expires_at.isoformat() if license.expires_at else None
            }
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@license_bp.route('/validate', methods=['POST'])
@limiter.limit("60 per hour")
def validate_license():
    """客户端验证授权（无需JWT）"""
    try:
        data = request.get_json()

        # 验证必需字段
        if 'device_fingerprint' not in data:
            return jsonify({
                'success': False,
                'error': '缺少设备指纹'
            }), 400

        device_fingerprint = data['device_fingerprint']

        # 查找客户端
        client = Client.query.filter_by(device_fingerprint=device_fingerprint).first()
        if not client:
            return jsonify({
                'success': False,
                'error': '客户端未注册'
            }), 404

        # 检查授权状态
        if client.license_status == 'revoked':
            return jsonify({
                'success': False,
                'valid': False,
                'reason': 'revoked',
                'message': '授权已被吊销'
            })

        if client.license_status != 'activated':
            return jsonify({
                'success': False,
                'valid': False,
                'reason': 'not_activated',
                'message': '未激活授权'
            })

        # 检查是否过期
        if client.license_expiry_at and datetime.now() > client.license_expiry_at:
            client.license_status = 'expired'
            db.session.commit()

            return jsonify({
                'success': False,
                'valid': False,
                'reason': 'expired',
                'message': '授权已过期'
            })

        # 授权有效
        return jsonify({
            'success': True,
            'valid': True,
            'data': {
                'license_status': client.license_status,
                'offline_mode': client.offline_mode,
                'expires_at': client.license_expiry_at.isoformat() if client.license_expiry_at else None
            }
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
