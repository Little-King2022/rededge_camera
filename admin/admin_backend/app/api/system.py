"""
系统设置 API 蓝图
"""
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
from sqlalchemy import func, and_
from app import db
from app.models import SystemSetting, AuditLog, Client, LicenseCode, SoftwareVersion, ClientUsageStats
from app.utils import jwt_required_custom, admin_required

system_bp = Blueprint('system', __name__)


@system_bp.route('/settings', methods=['GET'])
@jwt_required_custom
def get_settings():
    """获取所有系统设置"""
    try:
        settings = SystemSetting.query.all()

        # 转换为字典格式
        settings_dict = {s.setting_key: s.setting_value for s in settings}

        return jsonify({
            'success': True,
            'data': settings_dict
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@system_bp.route('/settings', methods=['PUT'])
@admin_required
def update_settings():
    """批量更新系统设置"""
    try:
        data = request.get_json()
        user_id = get_jwt_identity()

        if not data:
            return jsonify({
                'success': False,
                'error': '缺少设置数据'
            }), 400

        # 更新设置
        for key, value in data.items():
            SystemSetting.set_value(key, value, user_id=user_id)

        db.session.commit()

        # 记录审计日志
        AuditLog.log(
            user_id=user_id,
            action='update_settings',
            resource_type='system_setting',
            ip_address=request.remote_addr,
            details={'keys': list(data.keys())}
        )
        db.session.commit()

        return jsonify({
            'success': True,
            'message': '设置已更新'
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@system_bp.route('/stats', methods=['GET'])
@jwt_required_custom
def get_stats():
    """获取系统统计数据"""
    try:
        # 客户端统计
        total_clients = Client.query.count()
        active_clients = Client.query.filter_by(is_active=True).count()

        # 在线客户端（最近10分钟有心跳）
        heartbeat_timeout = SystemSetting.get_value('heartbeat_timeout_minutes', '10')
        timeout_minutes = int(heartbeat_timeout)
        timeout_time = datetime.now() - timedelta(minutes=timeout_minutes)

        online_clients = Client.query.filter(
            Client.last_heartbeat_at >= timeout_time
        ).count()

        # 授权状态统计
        license_stats = db.session.query(
            Client.license_status,
            func.count(Client.id)
        ).group_by(Client.license_status).all()

        license_status_dict = {status: count for status, count in license_stats}

        # 授权码统计
        total_licenses = LicenseCode.query.count()
        active_licenses = LicenseCode.query.filter_by(is_active=True).count()
        used_licenses = LicenseCode.query.filter(LicenseCode.current_activations > 0).count()

        # 版本统计
        total_versions = SoftwareVersion.query.count()
        total_downloads = db.session.query(
            func.sum(SoftwareVersion.download_count)
        ).scalar() or 0

        # 今日使用统计
        today = datetime.now().date()
        today_stats = ClientUsageStats.query.filter_by(stat_date=today).all()

        today_starts = sum(s.app_start_count for s in today_stats)
        today_usage_seconds = sum(s.total_usage_seconds for s in today_stats)

        return jsonify({
            'success': True,
            'data': {
                'clients': {
                    'total': total_clients,
                    'active': active_clients,
                    'online': online_clients,
                    'offline': total_clients - online_clients
                },
                'license_status': license_status_dict,
                'licenses': {
                    'total': total_licenses,
                    'active': active_licenses,
                    'used': used_licenses,
                    'available': total_licenses - used_licenses
                },
                'versions': {
                    'total': total_versions,
                    'total_downloads': total_downloads
                },
                'today_usage': {
                    'total_starts': today_starts,
                    'total_usage_seconds': today_usage_seconds,
                    'active_clients': len(today_stats)
                }
            }
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@system_bp.route('/usage-stats', methods=['GET'])
@jwt_required_custom
def get_usage_stats():
    """获取全局使用统计（按日期范围）"""
    try:
        # 获取日期范围参数
        days = request.args.get('days', 30, type=int)
        end_date = datetime.now().date()
        start_date = end_date - timedelta(days=days - 1)

        # 按日期汇总统计
        stats = db.session.query(
            ClientUsageStats.stat_date,
            func.sum(ClientUsageStats.app_start_count).label('total_starts'),
            func.sum(ClientUsageStats.total_usage_seconds).label('total_seconds'),
            func.count(func.distinct(ClientUsageStats.client_id)).label('active_clients')
        ).filter(
            and_(
                ClientUsageStats.stat_date >= start_date,
                ClientUsageStats.stat_date <= end_date
            )
        ).group_by(
            ClientUsageStats.stat_date
        ).order_by(
            ClientUsageStats.stat_date.desc()
        ).all()

        # 转换为列表
        stats_list = [
            {
                'date': stat.stat_date.isoformat(),
                'total_starts': stat.total_starts or 0,
                'total_usage_seconds': stat.total_seconds or 0,
                'active_clients': stat.active_clients or 0
            }
            for stat in stats
        ]

        # 计算总计
        total_starts = sum(s['total_starts'] for s in stats_list)
        total_seconds = sum(s['total_usage_seconds'] for s in stats_list)
        unique_clients = len(set(
            stat.client_id for stat in ClientUsageStats.query.filter(
                and_(
                    ClientUsageStats.stat_date >= start_date,
                    ClientUsageStats.stat_date <= end_date
                )
            ).all()
        ))

        return jsonify({
            'success': True,
            'data': {
                'stats': stats_list,
                'summary': {
                    'total_starts': total_starts,
                    'total_usage_seconds': total_seconds,
                    'unique_clients': unique_clients,
                    'average_usage_seconds': total_seconds // len(stats_list) if stats_list else 0
                }
            }
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@system_bp.route('/logs', methods=['GET'])
@admin_required
def get_logs():
    """获取审计日志"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        action = request.args.get('action', type=str)
        user_id = request.args.get('user_id', type=int)

        # 构建查询
        query = AuditLog.query

        # 筛选操作类型
        if action:
            query = query.filter_by(action=action)

        # 筛选用户
        if user_id:
            query = query.filter_by(user_id=user_id)

        # 排序和分页
        query = query.order_by(AuditLog.created_at.desc())
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)

        # 添加用户名信息
        logs_data = []
        for log in pagination.items:
            log_dict = log.to_dict()
            if log.user:
                log_dict['username'] = log.user.username
            logs_data.append(log_dict)

        return jsonify({
            'success': True,
            'data': logs_data,
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


@system_bp.route('/dashboard', methods=['GET'])
@jwt_required_custom
def get_dashboard_data():
    """获取仪表盘数据（汇总）"""
    try:
        # 客户端统计
        total_clients = Client.query.count()
        active_clients = Client.query.filter_by(is_active=True).count()
        heartbeat_timeout = SystemSetting.get_value('heartbeat_timeout_minutes', '10')
        timeout_minutes = int(heartbeat_timeout)
        timeout_time = datetime.now() - timedelta(minutes=timeout_minutes)
        online_clients = Client.query.filter(Client.last_heartbeat_at >= timeout_time).count()
        offline_clients = max(total_clients - online_clients, 0)
        online_rate = round((online_clients / total_clients) * 100, 2) if total_clients else 0

        # 客户端授权分布
        license_stats = db.session.query(
            Client.license_status,
            func.count(Client.id)
        ).group_by(Client.license_status).all()
        license_distribution = {status or 'unknown': count for status, count in license_stats}

        # 客户端平台分布
        platform_stats = db.session.query(
            Client.platform,
            func.count(Client.id)
        ).group_by(Client.platform).all()
        platform_distribution = {platform or 'unknown': count for platform, count in platform_stats}

        # 客户端版本分布
        app_version_stats = db.session.query(
            Client.app_version,
            func.count(Client.id)
        ).group_by(Client.app_version).all()
        app_version_distribution = {version or 'unknown': count for version, count in app_version_stats}

        # 授权码统计
        total_licenses = LicenseCode.query.count()
        active_licenses = LicenseCode.query.filter_by(is_active=True).count()
        used_licenses = LicenseCode.query.filter(LicenseCode.current_activations > 0).count()
        available_licenses = max(total_licenses - used_licenses, 0)

        # 版本统计
        total_versions = SoftwareVersion.query.count()
        total_downloads = db.session.query(
            func.sum(SoftwareVersion.download_count)
        ).scalar() or 0
        latest_versions = SoftwareVersion.query.filter_by(is_latest=True).order_by(
            SoftwareVersion.published_at.desc()
        ).all()
        top_downloaded_versions = SoftwareVersion.query.order_by(
            SoftwareVersion.download_count.desc()
        ).limit(5).all()

        # 最近客户端活动（MySQL兼容方式）
        recent_client_rows = Client.query.order_by(
            Client.last_heartbeat_at.is_(None),
            Client.last_heartbeat_at.desc()
        ).limit(5).all()
        recent_clients = []
        for client in recent_client_rows:
            client_data = client.to_dict()
            client_data['is_online'] = client.is_online(timeout_minutes)
            recent_clients.append(client_data)

        # 今日统计
        today = datetime.now().date()
        today_stats = ClientUsageStats.query.filter_by(stat_date=today).all()
        today_starts = sum(s.app_start_count for s in today_stats)
        today_usage_seconds = sum(s.total_usage_seconds for s in today_stats)
        today_active_clients = len(today_stats)

        return jsonify({
            'success': True,
            'data': {
                'overview': {
                    'total_clients': total_clients,
                    'active_clients': active_clients,
                    'online_clients': online_clients,
                    'offline_clients': offline_clients,
                    'online_rate': online_rate,
                    'total_licenses': total_licenses,
                    'active_licenses': active_licenses,
                    'used_licenses': used_licenses,
                    'available_licenses': available_licenses,
                    'total_versions': total_versions,
                    'total_downloads': total_downloads,
                    'today_starts': today_starts,
                    'today_usage_seconds': today_usage_seconds,
                    'today_active_clients': today_active_clients,
                    'heartbeat_timeout_minutes': timeout_minutes
                },
                'license_distribution': license_distribution,
                'platform_distribution': platform_distribution,
                'app_version_distribution': app_version_distribution,
                'latest_versions': [v.to_dict() for v in latest_versions],
                'top_downloaded_versions': [v.to_dict() for v in top_downloaded_versions],
                'recent_clients': recent_clients
            }
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
