"""
数据库初始化脚本
"""
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

from app import create_app, db
from app.models import (
    AdminUser, CameraConfig, Client, LicenseCode,
    SoftwareVersion, AuditLog, ClientUsageStats, SystemSetting
)


def init_database():
    """初始化数据库"""
    app = create_app('development')

    with app.app_context():
        # 删除所有表（谨慎使用）
        print('删除所有表...')
        db.drop_all()

        # 创建所有表
        print('创建所有表...')
        db.create_all()

        # 创建默认管理员账户
        print('创建默认管理员账户...')
        admin = AdminUser(
            username='admin',
            email='admin@rededge.com',
            role='super_admin',
            is_active=True
        )
        admin.set_password('admin123')
        db.session.add(admin)

        # 创建默认系统设置
        print('创建默认系统设置...')
        default_settings = [
            {
                'key': 'site_name',
                'value': 'RedEdge 后台管理系统',
                'description': '站点名称'
            },
            {
                'key': 'trial_duration_days',
                'value': '7',
                'description': '试用期天数'
            },
            {
                'key': 'online_grace_period_days',
                'value': '3',
                'description': '在线模式宽限期（天）'
            },
            {
                'key': 'heartbeat_timeout_minutes',
                'value': '10',
                'description': '心跳超时判定时间（分钟）'
            }
        ]

        for setting in default_settings:
            sys_setting = SystemSetting(
                setting_key=setting['key'],
                setting_value=setting['value'],
                description=setting['description'],
                updated_by=admin.id
            )
            db.session.add(sys_setting)

        # 提交事务
        db.session.commit()

        print('数据库初始化完成！')
        print('默认管理员账户：')
        print('  用户名：admin')
        print('  密码：admin123')
        print('  角色：super_admin')
        print('\n请务必在生产环境中修改默认密码！')


if __name__ == '__main__':
    init_database()
