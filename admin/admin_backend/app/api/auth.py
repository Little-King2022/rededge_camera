"""
认证 API 蓝图
"""
from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, create_refresh_token, get_jwt_identity
from app import db, limiter
from app.models import AdminUser, AuditLog
from app.utils import jwt_required_custom
from app.utils.rsa_utils import get_public_key, decrypt_rsa

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/public-key', methods=['GET'])
def get_rsa_public_key():
    """获取 RSA 公钥"""
    try:
        public_key = get_public_key()

        return jsonify({
            'success': True,
            'data': {
                'public_key': public_key
            }
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@auth_bp.route('/login', methods=['POST'])
@limiter.limit("5 per minute")
def login():
    """管理员登录"""
    try:
        data = request.get_json()

        # 验证必需字段
        if not data or 'username' not in data or 'password' not in data:
            return jsonify({
                'success': False,
                'error': '缺少用户名或密码'
            }), 400

        username = data['username']
        encrypted_password = data['password']

        # RSA 解密密码
        try:
            password = decrypt_rsa(encrypted_password)
        except Exception as e:
            return jsonify({
                'success': False,
                'error': '密码解密失败'
            }), 400

        # 查询用户
        user = AdminUser.query.filter_by(username=username).first()

        if not user or not user.check_password(password):
            return jsonify({
                'success': False,
                'error': '用户名或密码错误'
            }), 401

        if not user.is_active:
            return jsonify({
                'success': False,
                'error': '账户已被禁用'
            }), 401

        # 更新最后登录时间
        user.last_login_at = datetime.now()
        db.session.commit()

        # 生成 JWT Token
        access_token = create_access_token(identity=str(user.id))
        refresh_token = create_refresh_token(identity=str(user.id))

        # 记录审计日志
        AuditLog.log(
            user_id=user.id,
            action='login',
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )
        db.session.commit()

        return jsonify({
            'success': True,
            'data': {
                'access_token': access_token,
                'refresh_token': refresh_token,
                'user': user.to_dict()
            }
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@auth_bp.route('/logout', methods=['POST'])
@jwt_required_custom
def logout():
    """管理员登出"""
    try:
        user_id = get_jwt_identity()

        # 记录审计日志
        AuditLog.log(
            user_id=user_id,
            action='logout',
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )
        db.session.commit()

        return jsonify({
            'success': True,
            'message': '登出成功'
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@auth_bp.route('/profile', methods=['GET'])
@jwt_required_custom
def get_profile():
    """获取当前用户信息"""
    try:
        user_id = get_jwt_identity()
        user = AdminUser.query.get(user_id)

        if not user:
            return jsonify({
                'success': False,
                'error': '用户不存在'
            }), 404

        return jsonify({
            'success': True,
            'user': user.to_dict()
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@auth_bp.route('/profile', methods=['PUT'])
@jwt_required_custom
def update_profile():
    """更新当前用户信息"""
    try:
        user_id = get_jwt_identity()
        user = AdminUser.query.get(user_id)

        if not user:
            return jsonify({
                'success': False,
                'error': '用户不存在'
            }), 404

        data = request.get_json()

        # 更新邮箱
        if 'email' in data:
            user.email = data['email']

        # 更新密码
        if 'new_password' in data:
            if 'current_password' not in data:
                return jsonify({
                    'success': False,
                    'error': '需要提供当前密码'
                }), 400

            if not user.check_password(data['current_password']):
                return jsonify({
                    'success': False,
                    'error': '当前密码错误'
                }), 401

            user.set_password(data['new_password'])

        db.session.commit()

        # 记录审计日志
        AuditLog.log(
            user_id=user.id,
            action='update_profile',
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )
        db.session.commit()

        return jsonify({
            'success': True,
            'user': user.to_dict()
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@auth_bp.route('/refresh', methods=['POST'])
@jwt_required_custom
def refresh():
    """刷新访问令牌"""
    try:
        user_id = get_jwt_identity()
        access_token = create_access_token(identity=user_id)

        return jsonify({
            'success': True,
            'access_token': access_token
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
