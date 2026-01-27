"""
JWT 工具函数
"""
from functools import wraps
from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity, get_jwt
from app.models import AdminUser


def jwt_required_custom(fn):
    """
    自定义 JWT 认证装饰器，包含用户验证

    Usage:
        @jwt_required_custom
        def protected_route():
            user_id = get_jwt_identity()
            ...
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        try:
            verify_jwt_in_request()
        except Exception as e:
            return jsonify({
                'success': False,
                'error': 'Token Verification Failed',
                'message': f'Token验证失败: {str(e)}'
            }), 401

        # 获取用户 ID（从字符串转为整数）
        user_id = int(get_jwt_identity())

        # 验证用户是否存在且激活
        user = AdminUser.query.get(user_id)
        if not user or not user.is_active:
            return jsonify({
                'success': False,
                'error': 'Unauthorized',
                'message': '用户不存在或已被禁用'
            }), 401

        return fn(*args, **kwargs)

    return wrapper


def admin_required(fn):
    """
    管理员权限装饰器（需要 admin 或 super_admin 角色）

    Usage:
        @admin_required
        def admin_only_route():
            ...
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()

        user_id = get_jwt_identity()
        user = AdminUser.query.get(user_id)

        if not user or not user.is_active:
            return jsonify({
                'success': False,
                'error': 'Unauthorized',
                'message': '用户不存在或已被禁用'
            }), 401

        if user.role not in ['admin', 'super_admin']:
            return jsonify({
                'success': False,
                'error': 'Forbidden',
                'message': '需要管理员权限'
            }), 403

        return fn(*args, **kwargs)

    return wrapper


def super_admin_required(fn):
    """
    超级管理员权限装饰器（需要 super_admin 角色）

    Usage:
        @super_admin_required
        def super_admin_only_route():
            ...
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()

        user_id = get_jwt_identity()
        user = AdminUser.query.get(user_id)

        if not user or not user.is_active:
            return jsonify({
                'success': False,
                'error': 'Unauthorized',
                'message': '用户不存在或已被禁用'
            }), 401

        if user.role != 'super_admin':
            return jsonify({
                'success': False,
                'error': 'Forbidden',
                'message': '需要超级管理员权限'
            }), 403

        return fn(*args, **kwargs)

    return wrapper


def get_current_user():
    """
    获取当前登录用户对象

    Returns:
        AdminUser: 当前用户对象，如果未找到则返回 None
    """
    try:
        user_id = get_jwt_identity()
        return AdminUser.query.get(user_id)
    except:
        return None
