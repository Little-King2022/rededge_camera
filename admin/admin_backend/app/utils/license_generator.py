"""
授权码生成工具
"""
import secrets
import string


def generate_license_code():
    """
    生成标准格式授权码：REDEDGE-XXXX-XXXX-XXXX-XXXX

    Returns:
        str: 授权码
    """
    # 可用字符：大写字母和数字（去除容易混淆的 0OIL1）
    chars = ''.join(set(string.ascii_uppercase + string.digits) - set('0OIL1'))

    # 生成 4 组 4 位随机字符
    parts = []
    for _ in range(4):
        part = ''.join(secrets.choice(chars) for _ in range(4))
        parts.append(part)

    return f"REDEDGE-{'-'.join(parts)}"


def generate_batch_licenses(count=1, license_type='standard',
                            duration_days=365, offline_mode=False,
                            notes=''):
    """
    批量生成授权码

    Args:
        count: 生成数量（1-100）
        license_type: 授权类型
        duration_days: 有效期天数
        offline_mode: 是否离线模式
        notes: 备注

    Returns:
        list: 授权码列表 [{'code': ..., 'license_type': ..., ...}, ...]
    """
    if count < 1 or count > 100:
        raise ValueError('生成数量必须在 1-100 之间')

    licenses = []
    generated_codes = set()

    while len(licenses) < count:
        code = generate_license_code()

        # 确保唯一性
        if code in generated_codes:
            continue

        generated_codes.add(code)
        licenses.append({
            'code': code,
            'license_type': license_type,
            'duration_days': duration_days,
            'offline_mode': offline_mode,
            'notes': notes
        })

    return licenses
