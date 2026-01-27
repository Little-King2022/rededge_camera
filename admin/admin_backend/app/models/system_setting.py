"""
系统配置模型
"""
from datetime import datetime
from app import db


class SystemSetting(db.Model):
    """系统配置表"""
    __tablename__ = 'system_settings'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    setting_key = db.Column(db.String(100), unique=True, nullable=False, index=True)
    setting_value = db.Column(db.Text)
    description = db.Column(db.String(255))
    updated_by = db.Column(db.Integer, db.ForeignKey('admin_users.id', ondelete='SET NULL'))
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)

    # 关系
    updater = db.relationship('AdminUser', backref='updated_settings')

    @classmethod
    def get_value(cls, key, default=None):
        """获取配置值"""
        setting = cls.query.filter_by(setting_key=key).first()
        return setting.setting_value if setting else default

    @classmethod
    def set_value(cls, key, value, description=None, user_id=None):
        """设置配置值"""
        setting = cls.query.filter_by(setting_key=key).first()

        if setting:
            setting.setting_value = value
            setting.updated_by = user_id
        else:
            setting = cls(
                setting_key=key,
                setting_value=value,
                description=description,
                updated_by=user_id
            )
            db.session.add(setting)

        return setting

    def to_dict(self):
        """转换为字典"""
        return {
            'id': self.id,
            'setting_key': self.setting_key,
            'setting_value': self.setting_value,
            'description': self.description,
            'updated_by': self.updated_by,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

    def __repr__(self):
        return f'<SystemSetting {self.setting_key}>'
