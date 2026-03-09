import { Request, Response } from 'express'
import axios, { AxiosRequestConfig } from 'axios'

interface ServiceConfig {
  baseUrl: string
  timeout?: number
}

class ProxyService {
  private services: Record<string, ServiceConfig>

  constructor() {
    this.services = {
      news: {
        baseUrl: process.env.NEWS_API_URL || 'http://localhost:4001',
        timeout: 30000,
      },
      user: {
        baseUrl: process.env.USER_API_URL || 'http://localhost:4002',
        timeout: 30000,
      },
      admin: {
        baseUrl: process.env.ADMIN_API_URL || 'http://localhost:4003',
        timeout: 30000,
      },
    }
  }

  /**
   * Proxy request to downstream service
   */
  async proxyRequest(
    serviceName: string,
    req: Request,
    res: Response
  ): Promise<void> {
    const service = this.services[serviceName]
    if (!service) {
      res.status(502).json({
        error: 'Bad Gateway',
        message: `Unknown service: ${serviceName}`,
      })
      return
    }

    try {
      // Build target URL
      const targetPath = req.path.replace(`/api/${serviceName}`, '')
      const targetUrl = `${service.baseUrl}${targetPath}`

      // Build request config
      const config: AxiosRequestConfig = {
        method: req.method as any,
        url: targetUrl,
        params: req.query,
        data: req.body,
        headers: {
          'Content-Type': 'application/json',
          ...(req.user && {
            'X-User-Id': req.user.userId,
            'X-User-Email': req.user.email,
            'X-User-Username': req.user.username,
            'X-User-Role': req.user.role || 'user',
          }),
        },
        timeout: service.timeout,
      }

      // Forward authorization header if present
      if (req.headers.authorization) {
        config.headers!['Authorization'] = req.headers.authorization
      }

      // Make request
      const response = await axios(config)

      // Forward response
      res.status(response.status).json(response.data)
      return
    } catch (error: any) {
      console.error(`Proxy error for ${serviceName}:`, error.message)

      if (error.response) {
        // Forward error from downstream service
        res.status(error.response.status).json(error.response.data)
      } else if (error.code === 'ECONNREFUSED') {
        res.status(503).json({
          error: 'Service Unavailable',
          message: `${serviceName} service is not available`,
        })
      } else {
        res.status(500).json({
          error: 'Internal Server Error',
          message: 'Proxy request failed',
        })
      }
      return
    }
  }
}

export const proxyService = new ProxyService()
