import axios from 'axios'

export interface SchedulerConfig {
  rssFetcherUrl: string
  apiFetcherUrl: string
  rssCronSchedule: string
  apiCronSchedule: string
}

export const defaultConfig: SchedulerConfig = {
  rssFetcherUrl: process.env.RSS_FETCHER_URL || 'http://localhost:4004',
  apiFetcherUrl: process.env.API_FETCHER_URL || 'http://localhost:4005',
  rssCronSchedule: process.env.RSS_CRON_SCHEDULE || '*/15 * * * *', // Every 15 minutes
  apiCronSchedule: process.env.API_CRON_SCHEDULE || '0 * * * *', // Every hour
}

export interface FetchResult {
  success: boolean
  timestamp: string
  results?: any[]
  error?: string
}

/**
 * Trigger RSS fetch
 */
export async function triggerRSSFetch(config: SchedulerConfig = defaultConfig): Promise<FetchResult> {
  try {
    console.log(`📡 Triggering RSS fetch: ${config.rssFetcherUrl}/api/fetch`)
    
    const response = await axios.post(`${config.rssFetcherUrl}/api/fetch`, {}, {
      timeout: 60000, // 1 minute timeout
    })
    
    return {
      success: true,
      timestamp: new Date().toISOString(),
      results: response.data.results,
    }
  } catch (error: any) {
    console.error('RSS fetch failed:', error.message)
    return {
      success: false,
      timestamp: new Date().toISOString(),
      error: error.message,
    }
  }
}

/**
 * Trigger API fetch
 */
export async function triggerAPIFetch(config: SchedulerConfig = defaultConfig): Promise<FetchResult> {
  try {
    console.log(`🔌 Triggering API fetch: ${config.apiFetcherUrl}/api/fetch`)
    
    const response = await axios.post(`${config.apiFetcherUrl}/api/fetch`, {}, {
      timeout: 60000, // 1 minute timeout
    })
    
    return {
      success: true,
      timestamp: new Date().toISOString(),
      results: response.data.results,
    }
  } catch (error: any) {
    console.error('API fetch failed:', error.message)
    return {
      success: false,
      timestamp: new Date().toISOString(),
      error: error.message,
    }
  }
}

/**
 * Trigger all fetchers
 */
export async function triggerAllFetchers(config: SchedulerConfig = defaultConfig): Promise<{
  rss: FetchResult
  api: FetchResult
}> {
  console.log('🚀 Triggering all fetchers...')
  
  const [rssResult, apiResult] = await Promise.all([
    triggerRSSFetch(config),
    triggerAPIFetch(config),
  ])
  
  console.log('✅ All fetchers completed')
  
  return {
    rss: rssResult,
    api: apiResult,
  }
}

/**
 * Check health of fetcher services
 */
export async function checkFetchersHealth(config: SchedulerConfig = defaultConfig): Promise<{
  rss: { healthy: boolean; latency?: number; error?: string }
  api: { healthy: boolean; latency?: number; error?: string }
}> {
  const checkHealth = async (url: string, name: string) => {
    const start = Date.now()
    try {
      await axios.get(`${url}/health`, { timeout: 5000 })
      return { healthy: true, latency: Date.now() - start }
    } catch (error: any) {
      return { healthy: false, latency: Date.now() - start, error: error.message }
    }
  }

  const [rss, api] = await Promise.all([
    checkHealth(config.rssFetcherUrl, 'RSS'),
    checkHealth(config.apiFetcherUrl, 'API'),
  ])

  return { rss, api }
}
