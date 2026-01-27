/**
 * RSA 加密工具
 */
import { JSEncrypt } from 'jsencrypt'
import request from './request'

// RSA 公钥缓存
let cachedPublicKey = null

/**
 * 获取 RSA 公钥
 */
export async function getPublicKey() {
  if (cachedPublicKey) {
    return cachedPublicKey
  }

  try {
    const res = await request({
      url: '/auth/public-key',
      method: 'get'
    })

    if (res.success && res.data.public_key) {
      cachedPublicKey = res.data.public_key
      return cachedPublicKey
    }

    throw new Error('获取公钥失败')
  } catch (error) {
    console.error('获取 RSA 公钥失败:', error)
    throw error
  }
}

/**
 * RSA 加密
 */
export async function rsaEncrypt(plainText) {
  try {
    const publicKey = await getPublicKey()
    const encrypt = new JSEncrypt()
    encrypt.setPublicKey(publicKey)

    const encrypted = encrypt.encrypt(plainText)
    if (!encrypted) {
      throw new Error('加密失败')
    }

    return encrypted
  } catch (error) {
    console.error('RSA 加密失败:', error)
    throw error
  }
}

/**
 * 加密登录凭据
 */
export async function encryptLoginCredentials(username, password) {
  try {
    const encryptedPassword = await rsaEncrypt(password)
    return {
      username,
      password: encryptedPassword
    }
  } catch (error) {
    console.error('加密登录凭据失败:', error)
    throw error
  }
}

/**
 * 加密激活码
 */
export async function encryptActivationCode(code) {
  try {
    return await rsaEncrypt(code)
  } catch (error) {
    console.error('加密激活码失败:', error)
    throw error
  }
}

/**
 * 清除公钥缓存
 */
export function clearPublicKeyCache() {
  cachedPublicKey = null
}
