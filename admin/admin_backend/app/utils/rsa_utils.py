"""
RSA 加密解密工具
"""
from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.backends import default_backend
import base64
import os

class RSAHelper:
    """RSA 加密解密助手"""

    _private_key = None
    _public_key = None

    @classmethod
    def _generate_keys(cls):
        """生成 RSA 密钥对"""
        if cls._private_key is None:
            # 生成 2048 位 RSA 密钥对
            cls._private_key = rsa.generate_private_key(
                public_exponent=65537,
                key_size=2048,
                backend=default_backend()
            )
            cls._public_key = cls._private_key.public_key()

    @classmethod
    def get_public_key_pem(cls):
        """获取 PEM 格式的公钥"""
        cls._generate_keys()

        pem = cls._public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        )

        return pem.decode('utf-8')

    @classmethod
    def decrypt(cls, encrypted_text):
        """
        解密 RSA 加密的文本

        Args:
            encrypted_text: Base64 编码的加密文本

        Returns:
            str: 解密后的明文
        """
        cls._generate_keys()

        try:
            # Base64 解码
            encrypted_bytes = base64.b64decode(encrypted_text)

            # RSA 解密
            decrypted_bytes = cls._private_key.decrypt(
                encrypted_bytes,
                padding.PKCS1v15()
            )

            return decrypted_bytes.decode('utf-8')
        except Exception as e:
            raise ValueError(f"RSA 解密失败: {str(e)}")

    @classmethod
    def encrypt(cls, plain_text):
        """
        使用公钥加密文本（主要用于测试）

        Args:
            plain_text: 明文

        Returns:
            str: Base64 编码的加密文本
        """
        cls._generate_keys()

        try:
            encrypted_bytes = cls._public_key.encrypt(
                plain_text.encode('utf-8'),
                padding.PKCS1v15()
            )

            return base64.b64encode(encrypted_bytes).decode('utf-8')
        except Exception as e:
            raise ValueError(f"RSA 加密失败: {str(e)}")


# 导出便捷函数
def get_public_key():
    """获取公钥"""
    return RSAHelper.get_public_key_pem()


def decrypt_rsa(encrypted_text):
    """解密 RSA 加密的文本"""
    return RSAHelper.decrypt(encrypted_text)


def encrypt_rsa(plain_text):
    """使用 RSA 加密文本"""
    return RSAHelper.encrypt(plain_text)
