"""
Flask 应用配置
"""
import os
from datetime import timedelta


class Config:
    """基础配置"""
    # Flask 运行配置
    FLASK_RUN_HOST = os.environ.get('FLASK_RUN_HOST', '127.0.0.1')
    FLASK_RUN_PORT = int(os.environ.get('FLASK_RUN_PORT', 5000))

    # 应用配置
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'

    # 数据库配置
    MYSQL_HOST = os.environ.get('MYSQL_HOST', 'localhost')
    MYSQL_PORT = int(os.environ.get('MYSQL_PORT', 3306))
    MYSQL_USER = os.environ.get('MYSQL_USER', 'root')
    MYSQL_PASSWORD = os.environ.get('MYSQL_PASSWORD', '')
    MYSQL_DATABASE = os.environ.get('MYSQL_DATABASE', 'rededge_admin')

    SQLALCHEMY_DATABASE_URI = (
        f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}@"
        f"{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DATABASE}?charset=utf8mb4"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = os.environ.get('SQLALCHEMY_ECHO', 'False').lower() == 'true'

    # Database connection pool configuration
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,        # Detect and remove stale connections
        'pool_recycle': 3600,         # Recycle connections every hour
        'pool_size': 10,              # Standard pool size
        'max_overflow': 20,           # Allow extra connections when pool is full
        'pool_timeout': 30            # Wait up to 30s for a connection
    }

    # JWT 配置
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or SECRET_KEY
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=int(os.environ.get('JWT_ACCESS_TOKEN_HOURS', 2)))
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=int(os.environ.get('JWT_REFRESH_TOKEN_DAYS', 7)))

    # 禁用 CSRF 保护（API使用，不需要CSRF保护）
    JWT_COOKIE_CSRF_PROTECT = False
    JWT_CSRF_CHECK_FORM = False

    # 文件上传配置
    UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER') or os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads')
    MAX_CONTENT_LENGTH = int(os.environ.get('MAX_CONTENT_LENGTH', 500 * 1024 * 1024))  # 默认 500MB
    ALLOWED_EXTENSIONS = {'.exe', '.dmg', '.AppImage', '.deb', '.rpm'}

    # CORS 配置
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173').split(',')

    # API 限流配置
    RATELIMIT_STORAGE_URL = os.environ.get('RATELIMIT_STORAGE_URL', 'memory://')

    # 授权配置
    TRIAL_DAYS = int(os.environ.get('TRIAL_DAYS', 7))  # 试用期天数
    ONLINE_MODE_GRACE_PERIOD_DAYS = int(os.environ.get('ONLINE_MODE_GRACE_PERIOD_DAYS', 3))  # 在线模式宽限期

    # 心跳配置
    HEARTBEAT_TIMEOUT_MINUTES = int(os.environ.get('HEARTBEAT_TIMEOUT_MINUTES', 10))  # 心跳超时（分钟）
    OFFLINE_THRESHOLD_MINUTES = int(os.environ.get('OFFLINE_THRESHOLD_MINUTES', 15))  # 离线判定时间（分钟）

    @staticmethod
    def init_app(app):
        """初始化应用配置（子类可重写以添加验证）"""
        pass


class DevelopmentConfig(Config):
    """开发环境配置"""
    DEBUG = True
    SQLALCHEMY_ECHO = True


class ProductionConfig(Config):
    """生产环境配置"""
    DEBUG = False
    SQLALCHEMY_ECHO = False

    @classmethod
    def init_app(cls, app):
        """初始化生产环境配置，验证必需的环境变量"""
        Config.init_app(app)

        # 生产环境必须设置环境变量
        if not os.environ.get('SECRET_KEY'):
            raise ValueError('生产环境必须设置 SECRET_KEY 环境变量')

        if not os.environ.get('JWT_SECRET_KEY'):
            raise ValueError('生产环境必须设置 JWT_SECRET_KEY 环境变量')


# 配置字典
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}
