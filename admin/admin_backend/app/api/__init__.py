"""
API 蓝图
"""
from .auth import auth_bp
from .camera import camera_bp
from .client import client_bp
from .license import license_bp
from .version import version_bp
from .user import user_bp
from .system import system_bp

__all__ = [
    'auth_bp',
    'camera_bp',
    'client_bp',
    'license_bp',
    'version_bp',
    'user_bp',
    'system_bp'
]
