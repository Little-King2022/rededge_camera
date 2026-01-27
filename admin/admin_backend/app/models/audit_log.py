"""
操作审计日志模型
"""
from datetime import datetime
from app import db


class AuditLog(db.Model):
    """操作审计日志表"""
    __tablename__ = 'audit_logs'

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('admin_users.id', ondelete='SET NULL'))
    action = db.Column(db.String(100), nullable=False)
    resource_type = db.Column(db.String(50))
    resource_id = db.Column(db.Integer)
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.Text)
    details = db.Column(db.JSON)
    created_at = db.Column(db.DateTime, default=datetime.now, index=True)

    # 关系
    user = db.relationship('AdminUser', backref='audit_logs')

    # 索引
    __table_args__ = (
        db.Index('idx_user_action', 'user_id', 'action'),
    )

    @classmethod
    def log(cls, user_id, action, resource_type=None, resource_id=None,
            ip_address=None, user_agent=None, details=None):
        """创建审计日志"""
        log = cls(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            ip_address=ip_address,
            user_agent=user_agent,
            details=details
        )
        db.session.add(log)
        return log

    def to_dict(self):
        """转换为字典"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'action': self.action,
            'resource_type': self.resource_type,
            'resource_id': self.resource_id,
            'ip_address': self.ip_address,
            'user_agent': self.user_agent,
            'details': self.details,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

    def __repr__(self):
        return f'<AuditLog {self.action} by user {self.user_id}>'
