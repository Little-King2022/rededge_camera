"""
相机配置模型
"""
from datetime import datetime
from app import db


class CameraConfig(db.Model):
    """相机配置表"""
    __tablename__ = 'camera_configs'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(100), nullable=False, index=True)
    protocol = db.Column(db.Enum('http', 'https'), default='http')
    host = db.Column(db.String(255), nullable=False)
    port = db.Column(db.Integer, nullable=False)
    path_prefix = db.Column(db.String(255), default='')
    auth_token = db.Column(db.String(500))
    description = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True)
    created_by = db.Column(db.Integer, db.ForeignKey('admin_users.id', ondelete='SET NULL'))
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)

    # 关系
    creator = db.relationship('AdminUser', backref='camera_configs', foreign_keys=[created_by])

    def to_dict(self):
        """转换为字典"""
        return {
            'id': self.id,
            'name': self.name,
            'protocol': self.protocol,
            'host': self.host,
            'port': self.port,
            'path_prefix': self.path_prefix,
            'auth_token': self.auth_token,
            'description': self.description,
            'is_active': self.is_active,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

    def __repr__(self):
        return f'<CameraConfig {self.name}>'
