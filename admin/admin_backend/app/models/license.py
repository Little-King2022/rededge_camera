"""
授权码模型
"""
from datetime import datetime, timedelta
from sqlalchemy.ext.mutable import MutableDict
from app import db


class LicenseCode(db.Model):
    """授权码表"""
    __tablename__ = 'license_codes'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    code = db.Column(db.String(100), unique=True, nullable=False, index=True)
    license_type = db.Column(db.Enum('trial', 'standard', 'professional', 'enterprise'),
                             default='standard', index=True)
    duration_days = db.Column(db.Integer, default=365)
    max_activations = db.Column(db.Integer, default=1)
    current_activations = db.Column(db.Integer, default=0)
    offline_mode = db.Column(db.Boolean, default=False)
    is_active = db.Column(db.Boolean, default=True)
    license_status = db.Column(db.Enum('unactivated', 'activated', 'revoked'),
                               default='unactivated', index=True)
    license_log = db.Column(MutableDict.as_mutable(db.JSON), default=dict)

    activated_by_client_id = db.Column(db.Integer, db.ForeignKey('clients.id', ondelete='SET NULL'))
    activated_at = db.Column(db.DateTime)
    expires_at = db.Column(db.DateTime)

    notes = db.Column(db.Text)
    created_by = db.Column(db.Integer, db.ForeignKey('admin_users.id', ondelete='SET NULL'))
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)

    # 关系
    activated_by = db.relationship('Client', backref='licenses', foreign_keys=[activated_by_client_id])
    creator = db.relationship('AdminUser', backref='licenses', foreign_keys=[created_by])

    def _append_log(self, event_type, payload=None):
        log_data = self.license_log or {}
        events = log_data.get('events')
        if not isinstance(events, list):
            events = []
        entry = {
            'type': event_type,
            'at': datetime.now().isoformat(),
            'payload': payload or {}
        }
        events.append(entry)
        log_data['events'] = events
        self.license_log = log_data

    def activate(self, client_id, client_info=None):
        """激活授权码"""
        if self.license_status == 'revoked':
            raise ValueError('授权码已吊销')

        if self.activated_by_client_id == client_id and self.current_activations > 0:
            # Reactivation for same client: refresh expiry without consuming another activation.
            self.activated_at = datetime.now()
            self.expires_at = datetime.now() + timedelta(days=self.duration_days)
            self.license_status = 'activated'
            self._append_log('reactivated', client_info)
            return

        if self.current_activations >= self.max_activations:
            raise ValueError('授权码已达到最大激活次数')

        if not self.is_active:
            raise ValueError('授权码已被禁用')

        self.activated_by_client_id = client_id
        self.activated_at = datetime.now()
        self.expires_at = datetime.now() + timedelta(days=self.duration_days)
        self.current_activations += 1
        self.license_status = 'activated'
        self._append_log('activated', client_info)

    def deactivate(self, client_id, reason='released', client_info=None):
        """撤销授权码占用"""
        if self.activated_by_client_id != client_id:
            return

        if self.current_activations > 0:
            self.current_activations -= 1

        self.activated_by_client_id = None
        self.activated_at = None
        self.expires_at = None
        self.license_status = 'revoked' if reason == 'revoked' else 'unactivated'
        self._append_log('revoked' if reason == 'revoked' else 'released', client_info)

    def is_expired(self):
        """检查是否过期"""
        if not self.expires_at:
            return False
        return datetime.now() > self.expires_at

    def to_dict(self):
        """转换为字典"""
        resolved_status = self.license_status
        if not resolved_status:
            resolved_status = 'activated' if self.current_activations > 0 else 'unactivated'
        return {
            'id': self.id,
            'code': self.code,
            'license_type': self.license_type,
            'duration_days': self.duration_days,
            'max_activations': self.max_activations,
            'current_activations': self.current_activations,
            'offline_mode': self.offline_mode,
            'is_active': self.is_active,
            'license_status': resolved_status,
            'license_log': self.license_log or {},
            'activated_by_client_id': self.activated_by_client_id,
            'activated_at': self.activated_at.isoformat() if self.activated_at else None,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'notes': self.notes,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

    def __repr__(self):
        return f'<LicenseCode {self.code}>'
