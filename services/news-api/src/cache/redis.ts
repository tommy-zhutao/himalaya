import Redis from 'ioredis'

let redis: Redis | null = null
let redisConnected = false

/**
 * Initialize Redis connection
 */
export function initRedis(): void {
  if (redis) return

  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'

  try {
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      retryStrategy: (times) => {
        if (times > 2) {
          console.warn('[Cache] Redis connection failed, running without cache')
          return null
        }
        return Math.min(times * 100, 1000)
      },
    })

    redis.on('connect', () => {
      redisConnected = true
      console.log('[Cache] Redis connected')
    })

    redis.on('error', (err) => {
      if (redisConnected) {
        console.warn('[Cache] Redis error:', err.message)
      }
      redisConnected = false
    })

    redis.on('close', () => {
      redisConnected = false
    })
  } catch (error) {
    console.warn('[Cache] Failed to initialize Redis, running without cache:', error)
    redis = null
    redisConnected = false
  }
}

export function isRedisAvailable(): boolean {
  return redis !== null && redisConnected
}

export async function get<T>(key: string): Promise<T | null> {
  if (!isRedisAvailable()) return null

  try {
    const value = await redis!.get(key)
    if (value === null) return null

    console.log(`[Cache] hit: ${key}`)
    return JSON.parse(value) as T
  } catch (error) {
    console.warn(`[Cache] Error getting ${key}:`, error)
    return null
  }
}

export async function set(key: string, value: any, ttlSeconds: number): Promise<void> {
  if (!isRedisAvailable()) return

  try {
    const serialized = JSON.stringify(value)
    await redis!.setex(key, ttlSeconds, serialized)
  } catch (error) {
    console.warn(`[Cache] Error setting ${key}:`, error)
  }
}

export async function del(key: string): Promise<void> {
  if (!isRedisAvailable()) return

  try {
    await redis!.del(key)
  } catch (error) {
    console.warn(`[Cache] Error deleting ${key}:`, error)
  }
}

export async function delPattern(pattern: string): Promise<void> {
  if (!isRedisAvailable()) return

  try {
    const keys = await redis!.keys(pattern)
    if (keys.length > 0) {
      await redis!.del(...keys)
    }
  } catch (error) {
    console.warn(`[Cache] Error deleting pattern ${pattern}:`, error)
  }
}

export async function clearListCache(): Promise<void> {
  await delPattern('news:list:*')
}

export async function clearDetailCache(id: number): Promise<void> {
  await del(`news:detail:${id}`)
}

export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis!.quit()
    redis = null
    redisConnected = false
  }
}
