"""
Flask 应用工厂
"""
from flask import Flask, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_migrate import Migrate

# 初始化扩展
db = SQLAlchemy()
jwt = JWTManager()
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["100 per minute"]
)
migrate = Migrate()


def create_app(config_name='default'):
    """应用工厂函数"""
    app = Flask(__name__)

    # 加载配置
    from .config import config
    config_obj = config[config_name]
    app.config.from_object(config_obj)

    # 初始化配置（生产环境会验证必需的环境变量）
    config_obj.init_app(app)

    # 初始化扩展
    db.init_app(app)
    jwt.init_app(app)
    limiter.init_app(app)
    migrate.init_app(app, db)

    # 配置 CORS
    CORS(app, resources={
        r"/api/*": {
            "origins": app.config['CORS_ORIGINS'],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"]
        }
    })

    # 注册蓝图
    register_blueprints(app)

    # 注册错误处理器
    register_error_handlers(app)

    # 健康检查
    @app.route('/api/health')
    def health_check():
        return jsonify({
            'status': 'ok',
            'service': 'rededge-admin-backend',
            'version': '1.0.0'
        })

    return app


def register_blueprints(app):
    """注册蓝图"""
    from .api import auth_bp, camera_bp, client_bp, license_bp, version_bp, user_bp, system_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(camera_bp, url_prefix='/api/cameras')
    app.register_blueprint(client_bp, url_prefix='/api/clients')
    app.register_blueprint(license_bp, url_prefix='/api/licenses')
    app.register_blueprint(version_bp, url_prefix='/api/versions')
    app.register_blueprint(user_bp, url_prefix='/api/users')
    app.register_blueprint(system_bp, url_prefix='/api/system')


def register_error_handlers(app):
    """注册错误处理器"""

    # JWT 错误处理器
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_data):
        return jsonify({
            'success': False,
            'error': 'Token Expired',
            'message': 'Token已过期，请重新登录'
        }), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return jsonify({
            'success': False,
            'error': 'Invalid Token',
            'message': 'Token无效，请重新登录'
        }), 401

    @jwt.unauthorized_loader
    def unauthorized_callback(error):
        return jsonify({
            'success': False,
            'error': 'Missing Token',
            'message': '缺少认证Token'
        }), 401

    @jwt.revoked_token_loader
    def revoked_token_callback(jwt_header, jwt_data):
        return jsonify({
            'success': False,
            'error': 'Token Revoked',
            'message': 'Token已被吊销'
        }), 401

    # HTTP 错误处理器
    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({
            'success': False,
            'error': 'Bad Request',
            'message': str(error)
        }), 400

    @app.errorhandler(401)
    def unauthorized(error):
        return jsonify({
            'success': False,
            'error': 'Unauthorized',
            'message': '未授权访问'
        }), 401

    @app.errorhandler(403)
    def forbidden(error):
        return jsonify({
            'success': False,
            'error': 'Forbidden',
            'message': '禁止访问'
        }), 403

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            'success': False,
            'error': 'Not Found',
            'message': '资源不存在'
        }), 404

    @app.errorhandler(429)
    def ratelimit_handler(error):
        return jsonify({
            'success': False,
            'error': 'Too Many Requests',
            'message': '请求过于频繁，请稍后再试'
        }), 429

    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({
            'success': False,
            'error': 'Internal Server Error',
            'message': '服务器内部错误'
        }), 500

    @app.errorhandler(Exception)
    def handle_exception(error):
        app.logger.exception('Unhandled exception')
        return jsonify({
            'success': False,
            'error': type(error).__name__,
            'message': str(error)
        }), 500
