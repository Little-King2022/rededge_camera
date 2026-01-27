"""
用户管理 API 蓝图
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
from app import db
from app.models import AdminUser, AuditLog
from app.utils import jwt_required_custom, admin_required, super_admin_required

user_bp = Blueprint('users', __name__)


@user_bp.route('', methods=['GET'])
@admin_required
def get_users():
    """获取后台用户列表"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        role = request.args.get('role', type=str)
        is_active = request.args.get('is_active', type=str)

        # 构建查询
        query = AdminUser.query

        # 筛选角色
        if role:
            query = query.filter_by(role=role)

        # 筛选激活状态
        if is_active is not None:
            query = query.filter_by(is_active=(is_active.lower() == 'true'))

        # 排序和分页
        query = query.order_by(AdminUser.created_at.desc())
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)

        return jsonify({
            'success': True,
            'data': [user.to_dict() for user in pagination.items],
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


@user_bp.route('', methods=['POST'])
@admin_required
def create_user():
    """创建后台用户"""
    try:
        data = request.get_json()
        current_user_id = get_jwt_identity()

        # 验证必需字段
        required_fields = ['username', 'password']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'error': f'缺少必需字段: {field}'
                }), 400

        # 检查用户名是否已存在
        existing = AdminUser.query.filter_by(username=data['username']).first()
        if existing:
            return jsonify({
                'success': False,
                'error': '用户名已存在'
            }), 400

        # 创建用户
        user = AdminUser(
            username=data['username'],
            email=data.get('email'),
            role=data.get('role', 'operator'),
            is_active=data.get('is_active', True)
        )
        user.set_password(data['password'])

        db.session.add(user)
        db.session.commit()

        # 记录审计日志
        AuditLog.log(
            user_id=current_user_id,
            action='create_user',
            resource_type='admin_user',
            resource_id=user.id,
            ip_address=request.remote_addr,
            details={'username': user.username, 'role': user.role}
        )
        db.session.commit()

        return jsonify({
            'success': True,
            'data': user.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@user_bp.route('/<int:user_id>', methods=['PUT'])
@admin_required
def update_user(user_id):
    """更新用户信息"""
    try:
        user = AdminUser.query.get(user_id)

        if not user:
            return jsonify({
                'success': False,
                'error': '用户不存在'
            }), 404

        data = request.get_json()
        current_user_id = get_jwt_identity()
        current_user = AdminUser.query.get(current_user_id)

        # 防止修改自己的角色和状态
        if user_id == current_user_id:
            if 'role' in data or 'is_active' in data:
                return jsonify({
                    'success': False,
                    'error': '不能修改自己的角色或激活状态'
                }), 400

        # 只有超级管理员可以修改角色
        if 'role' in data and current_user.role != 'super_admin':
            return jsonify({
                'success': False,
                'error': '需要超级管理员权限'
            }), 403

        # 更新字段
        if 'email' in data:
            user.email = data['email']
        if 'role' in data:
            user.role = data['role']
        if 'is_active' in data:
            user.is_active = data['is_active']

        db.session.commit()

        # 记录审计日志
        AuditLog.log(
            user_id=current_user_id,
            action='update_user',
            resource_type='admin_user',
            resource_id=user.id,
            ip_address=request.remote_addr,
            details={'username': user.username}
        )
        db.session.commit()

        return jsonify({
            'success': True,
            'data': user.to_dict()
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@user_bp.route('/<int:user_id>', methods=['DELETE'])
@super_admin_required
def delete_user(user_id):
    """删除用户（仅超级管理员）"""
    try:
        user = AdminUser.query.get(user_id)

        if not user:
            return jsonify({
                'success': False,
                'error': '用户不存在'
            }), 404

        current_user_id = get_jwt_identity()

        # 不能删除自己
        if user_id == current_user_id:
            return jsonify({
                'success': False,
                'error': '不能删除自己'
            }), 400

        username = user.username

        db.session.delete(user)
        db.session.commit()

        # 记录审计日志
        AuditLog.log(
            user_id=current_user_id,
            action='delete_user',
            resource_type='admin_user',
            resource_id=user_id,
            ip_address=request.remote_addr,
            details={'username': username}
        )
        db.session.commit()

        return jsonify({
            'success': True,
            'message': '用户已删除'
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@user_bp.route('/<int:user_id>/reset-password', methods=['PUT'])
@admin_required
def reset_password(user_id):
    """重置密码"""
    try:
        user = AdminUser.query.get(user_id)

        if not user:
            return jsonify({
                'success': False,
                'error': '用户不存在'
            }), 404

        data = request.get_json()

        if 'new_password' not in data:
            return jsonify({
                'success': False,
                'error': '缺少新密码'
            }), 400

        current_user_id = get_jwt_identity()
        current_user = AdminUser.query.get(current_user_id)

        # 只有超级管理员可以重置其他管理员的密码
        if user.role in ['admin', 'super_admin'] and current_user.role != 'super_admin':
            return jsonify({
                'success': False,
                'error': '需要超级管理员权限'
            }), 403

        # 重置密码
        user.set_password(data['new_password'])
        db.session.commit()

        # 记录审计日志
        AuditLog.log(
            user_id=current_user_id,
            action='reset_password',
            resource_type='admin_user',
            resource_id=user.id,
            ip_address=request.remote_addr,
            details={'username': user.username}
        )
        db.session.commit()

        return jsonify({
            'success': True,
            'message': '密码已重置'
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
