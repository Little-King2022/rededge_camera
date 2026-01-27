/**
 * 客户端激活相关 API（无需 JWT 认证）
 */
import axios from 'axios'
import { encryptActivationCode } from '@/utils/rsa'

const baseURL = import.meta.env.VITE_API_BASE_URL

/**
 * 激活授权码（客户端调用，无需 JWT）
 */
export async function activateLicense(deviceFingerprint, activationCode) {
  // RSA 加密激活码
  const encryptedCode = await encryptActivationCode(activationCode)

  const res = await axios.post(`${baseURL}/licenses/activate`, {
    device_fingerprint: deviceFingerprint,
    activation_code: encryptedCode
  })

  return res.data
}

/**
 * 验证授权（客户端调用，无需 JWT）
 */
export async function validateLicense(deviceFingerprint) {
  const res = await axios.post(`${baseURL}/licenses/validate`, {
    device_fingerprint: deviceFingerprint
  })

  return res.data
}
