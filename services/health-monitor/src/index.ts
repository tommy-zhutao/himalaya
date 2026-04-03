import axios from 'axios';
import cron from 'node-cron';
import { Pool } from 'pg';
import { createClient } from 'redis';

// 配置
const config = {
  checkInterval: process.env.CHECK_INTERVAL || '*/30 * * * * *', // 每30秒
  alertCooldown: parseInt(process.env.ALERT_COOLDOWN || '300000'), // 5分钟

  // OpenClaw Gateway 配置（用于发送私聊告警）
  openclawGatewayUrl: process.env.OPENCLAW_GATEWAY_URL || 'http://host.docker.internal:4567',
  openclawToken: process.env.OPENCLAW_TOKEN || '',
  alertFeishuUser: process.env.ALERT_FEISHU_USER || 'ou_f1e9bcb43a4a8cec7eaeda251f53479e', // 涛哥的飞书 ID

  // 服务列表
  services: [
    { name: 'api-gateway', url: 'http://api-gateway:4000/health', critical: true },
    { name: 'news-api', url: 'http://news-api:4001/health', critical: true },
    { name: 'user-api', url: 'http://user-api:4002/health', critical: false },
    { name: 'admin-api', url: 'http://admin-api:4003/health', critical: false },
    { name: 'rss-fetcher', url: 'http://rss-fetcher:4004/health', critical: false },
    { name: 'api-fetcher', url: 'http://api-fetcher:4005/health', critical: false },
    { name: 'scheduler', url: 'http://scheduler:4006/health', critical: false },
    { name: 'content-fetcher', url: 'http://content-fetcher:4007/health', critical: false },
    { name: 'ai-analysis', url: 'http://ai-analysis:4008/health', critical: true },
    { name: 'html-fetcher', url: 'http://html-fetcher:4010/health', critical: false },
    { name: 'frontend', url: 'http://frontend:3000', critical: true },
  ],

  // 数据库
  databaseUrl: process.env.DATABASE_URL || 'postgresql://news_admin:news_password@postgres:5432/news_app',
  redisUrl: process.env.REDIS_URL || 'redis://redis:6379',
};

// 状态跟踪
interface ServiceStatus {
  name: string;
  healthy: boolean;
  responseTime?: number;
  error?: string;
  lastCheck: Date;
}

interface HealthReport {
  timestamp: Date;
  services: ServiceStatus[];
  database: { healthy: boolean; latency?: number; error?: string };
  redis: { healthy: boolean; latency?: number; error?: string };
  newsData: { healthy: boolean; latestNews?: Date; count?: number; error?: string };
  overallHealthy: boolean;
}

// 告警冷却（避免重复告警）
const alertCache = new Map<string, number>();

// 数据库连接池
const dbPool = new Pool({
  connectionString: config.databaseUrl,
  max: 2,
});

// Redis 客户端
let redisClient: ReturnType<typeof createClient>;

async function initRedis() {
  redisClient = createClient({ url: config.redisUrl });
  redisClient.on('error', (err) => console.error('Redis Client Error:', err));
  await redisClient.connect();
}

// 检查单个服务
async function checkService(service: { name: string; url: string; critical: boolean }): Promise<ServiceStatus> {
  const startTime = Date.now();
  try {
    const response = await axios.get(service.url, {
      timeout: 5000,
      validateStatus: (status) => status < 500,
    });
    const responseTime = Date.now() - startTime;

    return {
      name: service.name,
      healthy: response.status >= 200 && response.status < 400,
      responseTime,
      lastCheck: new Date(),
    };
  } catch (error: any) {
    return {
      name: service.name,
      healthy: false,
      responseTime: Date.now() - startTime,
      error: error.message || 'Unknown error',
      lastCheck: new Date(),
    };
  }
}

// 检查数据库
async function checkDatabase(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
  const startTime = Date.now();
  try {
    const result = await dbPool.query('SELECT 1');
    return {
      healthy: true,
      latency: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      healthy: false,
      latency: Date.now() - startTime,
      error: error.message,
    };
  }
}

// 检查 Redis
async function checkRedis(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
  const startTime = Date.now();
  try {
    if (!redisClient) {
      await initRedis();
    }
    await redisClient.ping();
    return {
      healthy: true,
      latency: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      healthy: false,
      latency: Date.now() - startTime,
      error: error.message,
    };
  }
}

// 检查新闻数据（最近是否有新数据）
async function checkNewsData(): Promise<{ healthy: boolean; latestNews?: Date; count?: number; error?: string }> {
  try {
    const result = await dbPool.query(`
      SELECT
        COUNT(*) as count,
        MAX(created_at) as latest
      FROM news
      WHERE created_at > NOW() - INTERVAL '24 hours'
    `);

    const count = parseInt(result.rows[0].count);
    const latestNews = result.rows[0].latest;

    // 24小时内没有新数据则告警
    const healthy = count > 0;

    return {
      healthy,
      latestNews,
      count,
    };
  } catch (error: any) {
    return {
      healthy: false,
      error: error.message,
    };
  }
}

// 通过 OpenClaw 发送飞书私聊告警
async function sendFeishuPrivateAlert(title: string, content: string): Promise<void> {
  try {
    const message = `${title}\n\n${content}\n\n⏰ ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`;

    const response = await axios.post(
      `${config.openclawGatewayUrl}/api/message`,
      {
        action: 'send',
        channel: 'feishu',
        target: `user:${config.alertFeishuUser}`,
        message: message,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          ...(config.openclawToken && { 'Authorization': `Bearer ${config.openclawToken}` }),
        },
        timeout: 10000,
      }
    );

    console.log('[OpenClaw] Alert sent successfully:', response.data);
  } catch (error: any) {
    console.error('[OpenClaw] Failed to send alert:', error.message);
    if (error.response) {
      console.error('[OpenClaw] Response:', error.response.data);
    }
  }
}

// 检查是否需要发送告警（避免重复）
function shouldAlert(key: string): boolean {
  const now = Date.now();
  const lastAlert = alertCache.get(key);
  if (lastAlert && now - lastAlert < config.alertCooldown) {
    return false;
  }
  alertCache.set(key, now);
  return true;
}

// 执行完整健康检查
async function runHealthCheck(): Promise<HealthReport> {
  console.log('\n[Health Monitor] Running health check...');

  // 并行检查所有服务
  const serviceChecks = await Promise.all(
    config.services.map(service => checkService(service))
  );

  // 检查基础设施
  const [database, redis, newsData] = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkNewsData(),
  ]);

  // 判断整体健康状态
  const criticalServicesDown = serviceChecks
    .filter((s, i) => !s.healthy && config.services[i].critical)
    .length > 0;

  const overallHealthy = !criticalServicesDown && database.healthy && redis.healthy;

  const report: HealthReport = {
    timestamp: new Date(),
    services: serviceChecks,
    database,
    redis,
    newsData,
    overallHealthy,
  };

  // 打印报告
  printReport(report);

  // 发送告警
  if (!overallHealthy) {
    const failedServices = serviceChecks
      .filter(s => !s.healthy)
      .map(s => s.name);

    const issues: string[] = [];
    if (!database.healthy) issues.push('数据库');
    if (!redis.healthy) issues.push('Redis');
    if (failedServices.length > 0) issues.push(`服务: ${failedServices.join(', ')}`);

    const errorDetails = failedServices.map(s => {
      const svc = serviceChecks.find(x => x.name === s);
      return `- ${s}: ${svc?.error || '响应异常'}`;
    }).join('\n');

    if (shouldAlert('system-unhealthy')) {
      await sendFeishuPrivateAlert(
        '❌ AI News Hub 系统异常',
        `问题: ${issues.join('、')}\n\n详情:\n${errorDetails}`
      );
    }
  }

  // 新闻数据检查
  if (!newsData.healthy && shouldAlert('news-stale')) {
    await sendFeishuPrivateAlert(
      '⚠️ AI News Hub 数据异常',
      `问题: 24小时内没有新新闻数据\n\n最新数据时间: ${newsData.latestNews || '无数据'}`
    );
  }

  return report;
}

// 打印报告
function printReport(report: HealthReport): void {
  console.log('\n========================================');
  console.log(`Health Report - ${report.timestamp.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`);
  console.log('========================================');

  console.log('\n📡 Services:');
  report.services.forEach(s => {
    const status = s.healthy ? '✅' : '❌';
    const time = s.responseTime ? `(${s.responseTime}ms)` : '';
    console.log(`  ${status} ${s.name} ${time}`);
    if (s.error) console.log(`     Error: ${s.error}`);
  });

  console.log('\n🗄️ Infrastructure:');
  const dbStatus = report.database.healthy ? '✅' : '❌';
  console.log(`  ${dbStatus} PostgreSQL ${report.database.latency ? `(${report.database.latency}ms)` : ''}`);
  if (report.database.error) console.log(`     Error: ${report.database.error}`);

  const redisStatus = report.redis.healthy ? '✅' : '❌';
  console.log(`  ${redisStatus} Redis ${report.redis.latency ? `(${report.redis.latency}ms)` : ''}`);
  if (report.redis.error) console.log(`     Error: ${report.redis.error}`);

  console.log('\n📊 Data:');
  const newsStatus = report.newsData.healthy ? '✅' : '⚠️';
  console.log(`  ${newsStatus} News Data: ${report.newsData.count || 0} articles in 24h`);
  if (report.newsData.latestNews) {
    console.log(`     Latest: ${report.newsData.latestNews}`);
  }

  console.log('\n🎯 Overall:', report.overallHealthy ? '✅ HEALTHY' : '❌ UNHEALTHY');
  console.log('========================================\n');
}

// HTTP 健康端点（供外部检查）
import http from 'http';

function startHttpServer() {
  const server = http.createServer(async (req, res) => {
    if (req.url === '/health') {
      try {
        const report = await runHealthCheck();
        res.writeHead(report.overallHealthy ? 200 : 503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(report, null, 2));
      } catch (error: any) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    } else if (req.url === '/status') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        service: 'health-monitor',
        status: 'running',
        uptime: process.uptime(),
        timestamp: new Date(),
      }));
    } else if (req.url === '/test-alert') {
      // 测试告警功能
      try {
        await sendFeishuPrivateAlert(
          '🧪 AI News Hub 测试告警',
          '这是一条测试消息，健康监控服务运行正常！'
        );
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Test alert sent' }));
      } catch (error: any) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  const port = process.env.PORT || 4009;
  server.listen(port, () => {
    console.log(`[Health Monitor] HTTP server listening on port ${port}`);
  });
}

// 主函数
async function main() {
  console.log('========================================');
  console.log('  AI News Hub - Health Monitor');
  console.log('========================================');
  console.log(`Check interval: ${config.checkInterval}`);
  console.log(`Alert target: Feishu user ${config.alertFeishuUser}`);
  console.log(`OpenClaw Gateway: ${config.openclawGatewayUrl}`);
  console.log(`Alert cooldown: ${config.alertCooldown / 1000}s`);
  console.log('========================================\n');

  // 初始化 Redis
  try {
    await initRedis();
    console.log('[Redis] Connected');
  } catch (error) {
    console.error('[Redis] Connection failed, will retry on check');
  }

  // 启动 HTTP 服务
  startHttpServer();

  // 启动时立即执行一次检查
  await runHealthCheck();

  // 定时执行健康检查
  cron.schedule(config.checkInterval, async () => {
    await runHealthCheck();
  });

  console.log('[Health Monitor] Scheduled health checks started');
}

// 启动
main().catch(console.error);
