"""
客户端管理 API 蓝图
"""
from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
from sqlalchemy import func, desc
from app import db, limiter
from app.models import Client, CameraConfig, LicenseCode, AuditLog, ClientUsageStats
from app.utils import jwt_required_custom

client_bp = Blueprint('clients', __name__)


@client_bp.route('', methods=['GET'])
@jwt_required_custom
def get_clients():
    """获取客户端列表（分页、筛选）"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        license_status = request.args.get('license_status', type=str)
        platform = request.args.get('platform', type=str)
        is_active = request.args.get('is_active', type=str)

        # 构建查询
        query = Client.query

        # 筛选授权状态
        if license_status:
            query = query.filter_by(license_status=license_status)

        # 筛选平台
        if platform:
            query = query.filter_by(platform=platform)

        # 筛选激活状态
        if is_active is not None:
            query = query.filter_by(is_active=(is_active.lower() == 'true'))

        # 排序和分页（MySQL兼容方式：NULL值自然排在最后）
        query = query.order_by(
            Client.last_heartbeat_at.is_(None),  # NULL值排在后面
            Client.last_heartbeat_at.desc()      # 非NULL值按时间降序
        )
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)

        # 转换为字典并添加在线状态
        clients_data = []
        for client in pagination.items:
            client_dict = client.to_dict(include_extended=True)
            client_dict['is_online'] = client.is_online()
            clients_data.append(client_dict)

        return jsonify({
            'success': True,
            'data': clients_data,
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


@client_bp.route('/<int:client_id>', methods=['GET'])
@jwt_required_custom
def get_client(client_id):
    """获取客户端详情"""
    try:
        client = Client.query.get(client_id)

        if not client:
            return jsonify({
                'success': False,
                'error': '客户端不存在'
            }), 404

        client_dict = client.to_dict(include_extended=True)
        client_dict['is_online'] = client.is_online()

        return jsonify({
            'success': True,
            'data': client_dict
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@client_bp.route('/<int:client_id>/stats', methods=['GET'])
@jwt_required_custom
def get_client_stats(client_id):
    """获取客户端使用统计"""
    try:
        client = Client.query.get(client_id)

        if not client:
            return jsonify({
                'success': False,
                'error': '客户端不存在'
            }), 404

        # 获取统计数据
        days = request.args.get('days', 30, type=int)

        stats = ClientUsageStats.query.filter_by(client_id=client_id)\
            .order_by(desc(ClientUsageStats.stat_date))\
            .limit(days)\
            .all()

        # 计算总计
        total_starts = sum(s.app_start_count for s in stats)
        total_seconds = sum(s.total_usage_seconds for s in stats)

        return jsonify({
            'success': True,
            'data': {
                'stats': [s.to_dict() for s in stats],
                'summary': {
                    'total_starts': total_starts,
                    'total_usage_seconds': total_seconds,
                    'average_usage_seconds': total_seconds // len(stats) if stats else 0
                }
            }
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@client_bp.route('/<int:client_id>', methods=['PUT'])
@jwt_required_custom
def update_client(client_id):
    """更新客户端信息"""
    try:
        client = Client.query.get(client_id)

        if not client:
            return jsonify({
                'success': False,
                'error': '客户端不存在'
            }), 404

        data = request.get_json()
        user_id = get_jwt_identity()

        # 更新字段
        if 'notes' in data:
            client.notes = data['notes']
        if 'is_active' in data:
            client.is_active = data['is_active']

        db.session.commit()

        # 记录审计日志
        AuditLog.log(
            user_id=user_id,
            action='update_client',
            resource_type='client',
            resource_id=client.id,
            ip_address=request.remote_addr,
            details={'hostname': client.hostname}
        )
        db.session.commit()

        return jsonify({
            'success': True,
            'data': client.to_dict(include_extended=True)
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@client_bp.route('/<int:client_id>/assign-camera', methods=['POST'])
@jwt_required_custom
def assign_camera(client_id):
    """分配相机配置"""
    try:
        client = Client.query.get(client_id)

        if not client:
            return jsonify({
                'success': False,
                'error': '客户端不存在'
            }), 404

        data = request.get_json()
        camera_config_id = data.get('camera_config_id')

        if camera_config_id:
            camera = CameraConfig.query.get(camera_config_id)
            if not camera:
                return jsonify({
                    'success': False,
                    'error': '相机配置不存在'
                }), 404

        user_id = get_jwt_identity()
        client.camera_config_id = camera_config_id
        db.session.commit()

        # 记录审计日志
        AuditLog.log(
            user_id=user_id,
            action='assign_camera',
            resource_type='client',
            resource_id=client.id,
            ip_address=request.remote_addr,
            details={
                'hostname': client.hostname,
                'camera_config_id': camera_config_id
            }
        )
        db.session.commit()

        return jsonify({
            'success': True,
            'data': client.to_dict()
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@client_bp.route('/<int:client_id>/assign-license', methods=['POST'])
@jwt_required_custom
def assign_license(client_id):
    """分配授权码"""
    try:
        client = Client.query.get(client_id)

        if not client:
            return jsonify({
                'success': False,
                'error': '客户端不存在'
            }), 404

        data = request.get_json()
        license_code = data.get('license_code')

        if not license_code:
            return jsonify({
                'success': False,
                'error': '缺少授权码'
            }), 400

        license = LicenseCode.query.filter_by(code=license_code).first()
        if not license:
            return jsonify({
                'success': False,
                'error': '授权码不存在'
            }), 404
        client_info = {
            'client_id': client.id,
            'device_fingerprint': client.device_fingerprint,
            'hostname': client.hostname,
            'platform': client.platform,
            'arch': client.arch,
            'app_version': client.app_version
        }

        # 激活授权码
        try:
            if client.activation_code and client.activation_code != license_code:
                old_license = LicenseCode.query.filter_by(code=client.activation_code).first()
                if old_license:
                    old_license.deactivate(client.id, reason='released', client_info=client_info)

            license.activate(client.id, client_info=client_info)
        except ValueError as e:

            return jsonify({
                'success': False,
                'error': str(e)
            }), 400

        # 更新客户端信息
        client.activation_code = license_code
        client.license_status = 'activated'
        client.license_expiry_at = license.expires_at
        client.offline_mode = license.offline_mode

        user_id = get_jwt_identity()
        db.session.commit()

        # 记录审计日志
        AuditLog.log(
            user_id=user_id,
            action='assign_license',
            resource_type='client',
            resource_id=client.id,
            ip_address=request.remote_addr,
            details={
                'hostname': client.hostname,
                'license_code': license_code
            }
        )
        db.session.commit()

        return jsonify({
            'success': True,
            'data': client.to_dict()
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@client_bp.route('/<int:client_id>/revoke-license', methods=['POST'])
@jwt_required_custom
def revoke_license(client_id):
    """吊销授权"""
    try:
        client = Client.query.get(client_id)

        if not client:
            return jsonify({
                'success': False,
                'error': '客户端不存在'
            }), 404
        client_info = {
            'client_id': client.id,
            'device_fingerprint': client.device_fingerprint,
            'hostname': client.hostname,
            'platform': client.platform,
            'arch': client.arch,
            'app_version': client.app_version
        }

        # 释放客户端占用的授权码
        if client.activation_code:
            old_license = LicenseCode.query.filter_by(code=client.activation_code).first()
            if old_license:
                old_license.deactivate(client.id, reason='revoked', client_info=client_info)

        client.activation_code = None
        client.license_expiry_at = None
        client.offline_mode = False


        user_id = get_jwt_identity()
        client.license_status = 'revoked'
        db.session.commit()

        # 记录审计日志
        AuditLog.log(
            user_id=user_id,
            action='revoke_license',
            resource_type='client',
            resource_id=client.id,
            ip_address=request.remote_addr,
            details={'hostname': client.hostname}
        )
        db.session.commit()

        return jsonify({
            'success': True,
            'data': client.to_dict()
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# ===== 客户端无需JWT认证的接口 =====


@client_bp.route('/register', methods=['POST'])
@limiter.limit("10 per hour")
def register_client():
    """客户端注册（无需JWT）"""
    try:
        data = request.get_json()

        # 验证必需字段
        if 'device_fingerprint' not in data:
            return jsonify({
                'success': False,
                'error': '缺少设备指纹'
            }), 400

        device_fingerprint = data['device_fingerprint']

        # 检查是否已注册
        client = Client.query.filter_by(device_fingerprint=device_fingerprint).first()

        if client:
            # 更新系统信息
            client.hostname = data.get('hostname', client.hostname)
            client.platform = data.get('platform', client.platform)
            client.arch = data.get('arch', client.arch)
            client.cpu_model = data.get('cpu_model', client.cpu_model)
            client.total_memory = data.get('total_memory', client.total_memory)
            client.ip_address = data.get('ip_address', client.ip_address)
            client.mac_address = data.get('mac_address', client.mac_address)
            client.app_version = data.get('app_version', client.app_version)
            client.last_heartbeat_at = datetime.now()
        else:
            # 新建客户端
            client = Client(
                device_fingerprint=device_fingerprint,
                hostname=data.get('hostname'),
                platform=data.get('platform'),
                arch=data.get('arch'),
                cpu_model=data.get('cpu_model'),
                total_memory=data.get('total_memory'),
                ip_address=data.get('ip_address'),
                mac_address=data.get('mac_address'),
                app_version=data.get('app_version'),
                last_heartbeat_at=datetime.now()
            )
            db.session.add(client)

        db.session.commit()

        return jsonify({
            'success': True,
            'data': client.to_dict()
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@client_bp.route('/heartbeat', methods=['POST'])
@limiter.limit("60 per hour")
def heartbeat():
    """客户端心跳上报（无需JWT，仅在线模式）"""
    try:
        data = request.get_json()

        # 验证必需字段
        if 'device_fingerprint' not in data:
            return jsonify({
                'success': False,
                'error': '缺少设备指纹'
            }), 400

        device_fingerprint = data['device_fingerprint']
        client = Client.query.filter_by(device_fingerprint=device_fingerprint).first()

        if not client:
            return jsonify({
                'success': False,
                'error': '客户端未注册'
            }), 404

        # 离线模式客户端不应发送心跳
        if client.offline_mode:
            return jsonify({
                'success': False,
                'error': '离线模式客户端无需心跳'
            }), 400

        # 更新心跳时间和系统信息
        client.last_heartbeat_at = datetime.now()
        client.app_version = data.get('app_version', client.app_version)
        client.ip_address = data.get('ip_address', client.ip_address)

        # 更新使用统计
        usage_stats = data.get('usage_stats')
        if usage_stats:
            ClientUsageStats.update_stats(
                client_id=client.id,
                start_count=usage_stats.get('app_start_count', 0),
                usage_seconds=usage_stats.get('total_usage_seconds', 0)
            )

        db.session.commit()

        # 返回授权状态和相机配置
        response_data = {
            'license_status': client.license_status,
            'license_expiry_at': client.license_expiry_at.isoformat() if client.license_expiry_at else None
        }

        # 如果客户端有相机配置，返回配置信息
        if client.camera_config:
            response_data['camera_config'] = client.camera_config.to_dict()

        return jsonify({
            'success': True,
            'data': response_data
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
