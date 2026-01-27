"""
环境变量加载测试脚本
"""
from dotenv import load_dotenv
import os

print("=== 环境变量加载测试 ===\n")

# 加载 .env 文件
load_dotenv()
print("✓ .env 文件已加载\n")

# 测试关键环境变量
test_vars = [
    'FLASK_ENV',
    'FLASK_RUN_HOST',
    'FLASK_RUN_PORT',
    'MYSQL_HOST',
    'MYSQL_PORT',
    'MYSQL_USER',
    'MYSQL_DATABASE',
    'SECRET_KEY',
    'JWT_SECRET_KEY',
    'CORS_ORIGINS',
]

print("环境变量读取结果：\n")
for var in test_vars:
    value = os.environ.get(var)
    if value:
        # 隐藏敏感信息
        if 'SECRET' in var or 'PASSWORD' in var:
            display_value = value[:10] + '...' if len(value) > 10 else '***'
        else:
            display_value = value
        print(f"✓ {var:30} = {display_value}")
    else:
        print(f"✗ {var:30} = (未设置)")

print("\n=== 测试 Flask 配置加载 ===\n")

try:
    from app.config import config
    dev_config = config['development']
    
    print(f"✓ Flask 环境: {os.environ.get('FLASK_ENV', 'development')}")
    print(f"✓ 运行地址: {dev_config.FLASK_RUN_HOST}:{dev_config.FLASK_RUN_PORT}")
    print(f"✓ 数据库: {dev_config.MYSQL_USER}@{dev_config.MYSQL_HOST}:{dev_config.MYSQL_PORT}/{dev_config.MYSQL_DATABASE}")
    print(f"✓ CORS 来源: {dev_config.CORS_ORIGINS}")
    print(f"✓ 试用期天数: {dev_config.TRIAL_DAYS}")
    print(f"✓ 在线模式宽限期: {dev_config.ONLINE_MODE_GRACE_PERIOD_DAYS} 天")
    print(f"✓ 心跳超时: {dev_config.HEARTBEAT_TIMEOUT_MINUTES} 分钟")
    
    print("\n✓ 配置加载成功！")
    
except Exception as e:
    print(f"\n✗ 配置加载失败: {e}")

print("\n=== 测试应用创建 ===\n")

try:
    from app import create_app
    app = create_app('development')
    print(f"✓ Flask 应用创建成功")
    print(f"✓ 应用名称: {app.name}")
    print(f"✓ 调试模式: {app.config['DEBUG']}")
    print(f"✓ 数据库 URI: {app.config['SQLALCHEMY_DATABASE_URI'][:50]}...")
    print("\n✓ 所有测试通过！")
    
except Exception as e:
    print(f"\n✗ 应用创建失败: {e}")
    import traceback
    traceback.print_exc()
