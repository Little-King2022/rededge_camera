"""
客户端使用统计模型
"""
from datetime import datetime, date
from app import db


class ClientUsageStats(db.Model):
    """客户端使用统计表"""
    __tablename__ = 'client_usage_stats'

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    client_id = db.Column(db.Integer, db.ForeignKey('clients.id', ondelete='CASCADE'),
                         nullable=False)
    stat_date = db.Column(db.Date, nullable=False, index=True)
    app_start_count = db.Column(db.Integer, default=0)
    total_usage_seconds = db.Column(db.Integer, default=0)
    last_start_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)

    # 唯一约束
    __table_args__ = (
        db.UniqueConstraint('client_id', 'stat_date', name='uk_client_date'),
    )

    @classmethod
    def update_stats(cls, client_id, start_count=1, usage_seconds=0):
        """更新或创建统计记录"""
        today = date.today()
        stats = cls.query.filter_by(client_id=client_id, stat_date=today).first()

        if stats:
            stats.app_start_count += start_count
            stats.total_usage_seconds += usage_seconds
            stats.last_start_at = datetime.now()
        else:
            stats = cls(
                client_id=client_id,
                stat_date=today,
                app_start_count=start_count,
                total_usage_seconds=usage_seconds,
                last_start_at=datetime.now()
            )
            db.session.add(stats)

        return stats

    def to_dict(self):
        """转换为字典"""
        return {
            'id': self.id,
            'client_id': self.client_id,
            'stat_date': self.stat_date.isoformat() if self.stat_date else None,
            'app_start_count': self.app_start_count,
            'total_usage_seconds': self.total_usage_seconds,
            'last_start_at': self.last_start_at.isoformat() if self.last_start_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

    def __repr__(self):
        return f'<ClientUsageStats client={self.client_id} date={self.stat_date}>'
