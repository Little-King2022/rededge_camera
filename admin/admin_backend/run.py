"""
Flask 应用启动脚本
"""
import os
from dotenv import load_dotenv
from app import create_app

# 加载 .env 文件中的环境变量
# 优先级：系统环境变量 > .env 文件
load_dotenv()

# 获取配置环境
config_name = os.environ.get('FLASK_ENV', 'development')

# 创建应用实例
app = create_app(config_name)

if __name__ == '__main__':
    # 从环境变量获取运行参数
    host = os.environ.get('FLASK_RUN_HOST', '127.0.0.1')
    port = int(os.environ.get('FLASK_RUN_PORT', 5000))

    # 开发环境运行
    app.run(
        host=host,
        port=port,
        debug=app.config['DEBUG']
    )
