import { HttpProxyAgent } from 'http-proxy-agent'
import { HttpsProxyAgent } from 'https-proxy-agent'

const proxyAgentCache = new Map()

function isProxyEnabled(settings) {
  return settings?.camera_proxy_enabled === true || settings?.camera_proxy_enabled === 'true'
}

function getProxyUrl(settings) {
  return (settings?.camera_proxy_url || '').trim()
}

function isValidProxyUrl(proxyUrl) {
  if (!proxyUrl) return false
  try {
    new URL(proxyUrl)
    return true
  } catch {
    return false
  }
}

export function getProxyAgentForUrl(url, settings) {
  if (!isProxyEnabled(settings)) {
    return null
  }

  const proxyUrl = getProxyUrl(settings)
  if (!isValidProxyUrl(proxyUrl)) {
    return null
  }

  const protocol = url.protocol === 'https:' ? 'https' : 'http'
  const cacheKey = `${protocol}|${proxyUrl}`
  if (proxyAgentCache.has(cacheKey)) {
    return proxyAgentCache.get(cacheKey)
  }

  const agent = protocol === 'https'
    ? new HttpsProxyAgent(proxyUrl)
    : new HttpProxyAgent(proxyUrl)

  proxyAgentCache.set(cacheKey, agent)
  return agent
}

export function getProxyAgents(settings) {
  if (!isProxyEnabled(settings)) {
    return null
  }

  const proxyUrl = getProxyUrl(settings)
  if (!isValidProxyUrl(proxyUrl)) {
    return null
  }

  const httpAgent = new HttpProxyAgent(proxyUrl)
  const httpsAgent = new HttpsProxyAgent(proxyUrl)
  return { httpAgent, httpsAgent }
}
