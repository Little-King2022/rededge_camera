"""
客户端信息模型
"""
from datetime import datetime
from app import db


class Client(db.Model):
    """客户端信息表"""
    __tablename__ = 'clients'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    device_fingerprint = db.Column(db.String(64), unique=True, nullable=False, index=True)
    hostname = db.Column(db.String(255))
    platform = db.Column(db.String(50))
    arch = db.Column(db.String(50))

    # 扩展信息
    cpu_model = db.Column(db.String(255))
    total_memory = db.Column(db.BigInteger)
    ip_address = db.Column(db.String(45))
    mac_address = db.Column(db.String(17))

    app_version = db.Column(db.String(20))
    license_status = db.Column(db.Enum('trial', 'activated', 'expired', 'revoked'),
                               default='trial', index=True)
    activation_code = db.Column(db.String(100))
    license_expiry_at = db.Column(db.DateTime)
    offline_mode = db.Column(db.Boolean, default=False)
    last_heartbeat_at = db.Column(db.DateTime, index=True)

    camera_config_id = db.Column(db.Integer, db.ForeignKey('camera_configs.id', ondelete='SET NULL'))
    notes = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)

    # 关系
    camera_config = db.relationship('CameraConfig', backref='clients')
    usage_stats = db.relationship('ClientUsageStats', backref='client', cascade='all, delete-orphan')

    def to_dict(self, include_extended=False):
        """转换为字典"""
        data = {
            'id': self.id,
            'device_fingerprint': self.device_fingerprint,
            'hostname': self.hostname,
            'platform': self.platform,
            'arch': self.arch,
            'app_version': self.app_version,
            'license_status': self.license_status,
            'activation_code': self.activation_code,
            'license_expiry_at': self.license_expiry_at.isoformat() if self.license_expiry_at else None,
            'offline_mode': self.offline_mode,
            'last_heartbeat_at': self.last_heartbeat_at.isoformat() if self.last_heartbeat_at else None,
            'camera_config_id': self.camera_config_id,
            'notes': self.notes,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

        if include_extended:
            data.update({
                'cpu_model': self.cpu_model,
                'total_memory': self.total_memory,
                'ip_address': self.ip_address,
                'mac_address': self.mac_address
            })

        return data

    def is_online(self, timeout_minutes=10):
        """判断客户端是否在线"""
        if not self.last_heartbeat_at:
            return False
        return (datetime.now() - self.last_heartbeat_at).total_seconds() < timeout_minutes * 60

    def __repr__(self):
        return f'<Client {self.hostname or self.device_fingerprint}>'
