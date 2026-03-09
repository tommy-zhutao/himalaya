import { Request, Response, NextFunction } from 'express'

/**
 * Request logging middleware
 * Logs all incoming requests with method, path, and response time
 */
export function loggingMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now()

  // Log request
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`)

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start
    const logMessage = `[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`
    
    if (res.statusCode >= 400) {
      console.error(logMessage)
    } else {
      console.log(logMessage)
    }
  })

  next()
}
