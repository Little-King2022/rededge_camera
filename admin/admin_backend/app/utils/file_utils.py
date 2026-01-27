"""
文件处理工具
"""
import os
import hashlib
from werkzeug.utils import secure_filename
from flask import current_app


def allowed_file(filename):
    """检查文件扩展名是否允许"""
    if not filename:
        return False

    ext = os.path.splitext(filename)[1].lower()
    return ext in current_app.config['ALLOWED_EXTENSIONS']


def save_uploaded_file(file, subfolder='installers'):
    """
    保存上传的文件

    Args:
        file: FileStorage 对象
        subfolder: 子文件夹名

    Returns:
        dict: {'filename': ..., 'path': ..., 'size': ..., 'checksum': ...}
    """
    if not file or not allowed_file(file.filename):
        raise ValueError('不支持的文件类型')

    # 安全的文件名
    filename = secure_filename(file.filename)

    # 构建保存路径
    upload_folder = os.path.join(current_app.config['UPLOAD_FOLDER'], subfolder)
    os.makedirs(upload_folder, exist_ok=True)

    # 生成唯一文件名（避免覆盖）
    base_name, ext = os.path.splitext(filename)
    counter = 1
    final_filename = filename
    file_path = os.path.join(upload_folder, final_filename)

    while os.path.exists(file_path):
        final_filename = f"{base_name}_{counter}{ext}"
        file_path = os.path.join(upload_folder, final_filename)
        counter += 1

    # 保存文件并计算校验和
    file.save(file_path)
    file_size = os.path.getsize(file_path)
    checksum = calculate_file_checksum(file_path)

    # 返回相对路径
    relative_path = os.path.join(subfolder, final_filename).replace('\\', '/')

    return {
        'filename': final_filename,
        'path': relative_path,
        'size': file_size,
        'checksum': checksum
    }


def delete_file(relative_path):
    """
    删除文件

    Args:
        relative_path: 相对于 UPLOAD_FOLDER 的路径
    """
    if not relative_path:
        return

    file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], relative_path)

    if os.path.exists(file_path):
        os.remove(file_path)


def calculate_file_checksum(file_path, algorithm='sha256'):
    """
    计算文件校验和

    Args:
        file_path: 文件路径
        algorithm: 哈希算法（sha256, md5）

    Returns:
        str: 十六进制校验和
    """
    hash_obj = hashlib.new(algorithm)

    with open(file_path, 'rb') as f:
        for chunk in iter(lambda: f.read(8192), b''):
            hash_obj.update(chunk)

    return hash_obj.hexdigest()


def get_file_size_str(size_bytes):
    """
    格式化文件大小

    Args:
        size_bytes: 字节数

    Returns:
        str: 格式化后的大小（如 "1.5 MB"）
    """
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 ** 2:
        return f"{size_bytes / 1024:.1f} KB"
    elif size_bytes < 1024 ** 3:
        return f"{size_bytes / (1024 ** 2):.1f} MB"
    else:
        return f"{size_bytes / (1024 ** 3):.2f} GB"
