/**
 * 负载测试脚本
 * 用法: node scripts/load-test.js
 * 
 * 需要先安装: npm install -D autocannon
 */

const autocannon = require('autocannon');
const { PassThrough } = require('stream');

const config = {
  url: process.env.API_URL || 'http://localhost:4000',
  duration: 30, // 测试持续时间（秒）
  connections: 50, // 并发连接数
  pipelining: 1, // HTTP 管道数
};

const tests = [
  {
    name: '新闻列表',
    path: '/api/news?page=1&limit=20',
  },
  {
    name: '新闻搜索',
    path: '/api/news/search?q=AI',
  },
  {
    name: '热门新闻',
    path: '/api/news/hot?limit=10',
  },
  {
    name: '热点话题',
    path: '/api/news/trending-topics?limit=10',
  },
];

async function runTest(test) {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`  测试: ${test.name}`);
  console.log(`  路径: ${test.path}`);
  console.log(`${'='.repeat(50)}\n`);

  const result = await autocannon({
    url: config.url + test.path,
    duration: config.duration,
    connections: config.connections,
    pipelining: config.pipelining,
    headers: {
      'Accept': 'application/json',
    },
  });

  console.log(`\n📊 结果统计:`);
  console.log(`  请求数: ${result.requests.total}`);
  console.log(`  成功: ${result['2xx']}`);
  console.log(`  失败: ${result.errors}`);
  console.log(`  超时: ${result.timeouts}`);
  console.log(`\n⏱️  响应时间:`);
  console.log(`  平均: ${result.latency.average.toFixed(2)}ms`);
  console.log(`  P50: ${result.latency.p50}ms`);
  console.log(`  P90: ${result.latency.p90}ms`);
  console.log(`  P99: ${result.latency.p99}ms`);
  console.log(`\n🚀 吞吐量:`);
  console.log(`  ${result.requests.average.toFixed(2)} req/sec`);

  return result;
}

async function main() {
  console.log('\n🔥 AI News Hub 负载测试\n');
  console.log(`目标: ${config.url}`);
  console.log(`并发: ${config.connections}`);
  console.log(`时长: ${config.duration}s 每测试`);

  const results = [];
  
  for (const test of tests) {
    try {
      const result = await runTest(test);
      results.push({ name: test.name, result });
    } catch (error) {
      console.error(`❌ 测试失败: ${test.name}`, error.message);
    }
  }

  // 总结
  console.log('\n' + '='.repeat(50));
  console.log('  📈 测试总结');
  console.log('='.repeat(50));
  
  results.forEach(({ name, result }) => {
    const status = result.errors === 0 ? '✅' : '❌';
    console.log(`${status} ${name}: ${result.latency.average.toFixed(0)}ms avg, ${result.requests.average.toFixed(0)} req/sec`);
  });

  // 性能评估
  const avgLatency = results.reduce((sum, r) => sum + r.result.latency.average, 0) / results.length;
  const avgThroughput = results.reduce((sum, r) => sum + r.result.requests.average, 0) / results.length;
  
  console.log(`\n🎯 整体评估:`);
  console.log(`  平均延迟: ${avgLatency.toFixed(0)}ms ${avgLatency < 200 ? '✅ 优秀' : avgLatency < 500 ? '⚠️ 一般' : '❌ 需优化'}`);
  console.log(`  平均吞吐: ${avgThroughput.toFixed(0)} req/sec ${avgThroughput > 100 ? '✅ 优秀' : avgThroughput > 50 ? '⚠️ 一般' : '❌ 需优化'}`);
}

main().catch(console.error);
