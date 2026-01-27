"""
软件版本模型
"""
from datetime import datetime
from app import db


class SoftwareVersion(db.Model):
    """软件版本表"""
    __tablename__ = 'software_versions'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    version = db.Column(db.String(20), unique=True, nullable=False, index=True)
    release_type = db.Column(db.Enum('stable', 'beta', 'alpha'), default='stable')
    platform = db.Column(db.Enum('win32', 'darwin', 'linux'), nullable=False)
    arch = db.Column(db.Enum('x64', 'arm64'), default='x64')

    installer_filename = db.Column(db.String(255), nullable=False)
    installer_path = db.Column(db.String(500), nullable=False)
    file_size = db.Column(db.BigInteger)
    checksum_sha256 = db.Column(db.String(64))

    release_notes = db.Column(db.Text)
    is_latest = db.Column(db.Boolean, default=False, index=True)
    is_mandatory = db.Column(db.Boolean, default=False)
    download_count = db.Column(db.Integer, default=0)

    uploaded_by = db.Column(db.Integer, db.ForeignKey('admin_users.id', ondelete='SET NULL'))
    published_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)

    # 关系
    uploader = db.relationship('AdminUser', backref='uploaded_versions')

    # 索引
    __table_args__ = (
        db.Index('idx_platform_arch', 'platform', 'arch'),
    )

    def increment_download(self):
        """增加下载次数"""
        self.download_count += 1

    def to_dict(self):
        """转换为字典"""
        return {
            'id': self.id,
            'version': self.version,
            'release_type': self.release_type,
            'platform': self.platform,
            'arch': self.arch,
            'installer_filename': self.installer_filename,
            'file_size': self.file_size,
            'checksum_sha256': self.checksum_sha256,
            'release_notes': self.release_notes,
            'is_latest': self.is_latest,
            'is_mandatory': self.is_mandatory,
            'download_count': self.download_count,
            'uploaded_by': self.uploaded_by,
            'published_at': self.published_at.isoformat() if self.published_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

    def __repr__(self):
        return f'<SoftwareVersion {self.version} {self.platform}-{self.arch}>'
