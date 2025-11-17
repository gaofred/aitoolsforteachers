// OCR服务速度对比测试
// 测试阿里云国内、阿里云新加坡、火山引擎、SSVIP DMX的OCR识别速度

const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAMAAAAp4XiDAAAAUVBMVEWFhYWDg4N3d3dtbW17e3t1dXWBgYGHh4d5eXlzc3OLi4ubm5uVlZWPj4+NjY19fX2JiYl/f39ra2uRkZGZmZlpaWmXl5dvb29xcXGTk5NnZ2c8TV1mAAAAG3RSTlNAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEAvEOwtAAAFVklEQVR4XpWWB67c2BUFb3g557T/hRo9/WUMZHlgr4Bg8Z4qQgQJlHI4A8SzFVrapvmTF9O7dmYRFZ60YiBhJRCgh1FYhiLAmdvX0CzTOpNE77ME0Zty/nWWzchDtiqrmQDeuv3powQ5ta2eN0FY0InkqDD73lT9c9lEzwUNqgFHs9VQce3TVClFCQrSTfOiYkVJQBmpbq2L6iZavPnAPcoU0dSw0SUTqz/GtrGuXfbyyBniKykOWQWGqwwMA7QiYAxi+IlPdqo+hYHnUt5ZPfnsHJyNiDtnpJyayNBkF6cWoYGAMY92U2hXHF/C1M8uP/ZtYdiuj26UdAdQQSXQErwSOMzt/XWRWAz5GuSBIkwG1H3FabJ2OsUOUhGC6tK4EMtJO0ttC6IBD3kM0ve0tJwMdSfjZo+EEISaeTr9P3wYrGjXqyC1krcKdhMpxEnt5JetoulscpyzhXN5FRpuPHvbeQaKxFAEB6EN+cYN6xD7RYGpXpNndMmZgM5Dcs3YSNFDHUo2LGfZuukSWyUYirJAdYbF3MfqEKmjM+I2EfhA94iG3L7uKrR+GdWD73ydlIB+6hgref1QTlmgmbM3/LeX5GI1Ux1RWpgxpLuZ2+I+IjzZ8wqE4nilvQdkUdfhzI5QDWy+kw5Wgg2pGpeEVeCCA7b85BO3F9DzxB3cdqvBzWcmzbyMiqhzuYqtHRVG2y4x+KOlnyqla8AoWWpuBoYRxzXrfKuILl6SfiWCbjxoZJUaCBj1CjH7GIaDbc9kqBY3W/Rgjda1iqQcOJu2WW+76pZC9QG7M00dffe9hNnseupFL53r8F7YHSwJWUKP2q+k7RdsxyOB11n0xtOvnW4irMMFNV4H0uqwS5ExsmP9AxbDTc9JwgneAT5vTiUSm1E7BSflSt3bfa1tv8Di3R8n3Af7MNWzs49hmauE2wP+ttrq+AsWpFG2awvsuOqbipWHgtuvuaAE+A1Z/7gC9hesnr+7wqCwG8c5yAg3AL1fm8T9AZtp/bbJGwl1pNrE7RuOX7PeMRUERVaPpEs+yqeoSmuOlokqw49pgomjLeh7icHNlG19yjs6XXOMedYm5xH2YxpV2tc0Ro2jJfxC50ApuxGob7lMsxfTbeUv07TyYxpeLucEH1gNd4IKH2LAg5TdVhlCafZvpskfncCfx8pOhJzd76bJWeYFnFciwcYfubRc12Ip/ppIhA1/mSZ/RxjFDrJC5xifFjJpY2Xl5zXdguFqYyTR1zSp1Y9p+tktDYYSNflcxI0iyO4TPBdlRgjuNNOQZZO_tOQJ4WZ-ch61dfD4BDZ4HJv5z4w9YRg==';

// 测试服务配置
const services = [
  {
    name: '阿里云国内',
    url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    key: 'sk-f2516072c05246e681eb9d1c772ecda7',
    model: 'qwen-vl-plus'
  },
  {
    name: '阿里云新加坡',
    url: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions',
    key: 'sk-60f5eee1b2674e26bd59c774b5d54183',
    model: 'qwen3-vl-flash'
  },
  {
    name: '火山引擎',
    url: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
    key: '1c4be881-b555-445c-8b33-94f843a3de94',
    model: 'doubao-seed-1-6-flash-250828'
  },
  {
    name: 'SSVIP DMX',
    url: 'https://api.dmxapi.com/v1/chat/completions',
    key: 'sk-Ihlnmu1r7nROZAi5M77P5KjDLhfxJWuTMovqXUTaVTXV1X4w',
    model: 'doubao-seed-1-6-flash-250615'
  }
];

// 测试单个OCR服务
async function testOCRService(service) {
  console.log(`\n🚀 开始测试 ${service.name}...`);
  const startTime = Date.now();

  try {
    const response = await fetch(service.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${service.key}`,
        'User-Agent': 'OCR-Speed-Test/1.0'
      },
      signal: AbortSignal.timeout(60000), // 60秒超时
      body: JSON.stringify({
        model: service.model,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: '识别图中文字，原文输出。如果图片中没有文字，请回复"无文字内容"'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/png;base64,${testImageBase64}`
                }
              }
            ]
          }
        ],
        temperature: 0.1,
        max_tokens: 1000
      })
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`📡 ${service.name} 响应状态:`, response.status);

    if (response.ok) {
      const result = await response.json();
      const content = result.choices?.[0]?.message?.content || '';

      return {
        service: service.name,
        success: true,
        duration: duration,
        responseTime: `${duration}ms`,
        content: content,
        model: service.model,
        status: response.status
      };
    } else {
      const errorText = await response.text();
      return {
        service: service.name,
        success: false,
        duration: duration,
        responseTime: `${duration}ms`,
        error: errorText,
        status: response.status
      };
    }

  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;

    return {
      service: service.name,
      success: false,
      duration: duration,
      responseTime: `${duration}ms`,
      error: error.message,
      status: 'Error'
    };
  }
}

// 网络延迟测试
async function testNetworkLatency(service) {
  console.log(`🌐 测试 ${service.name} 网络延迟...`);
  const startTime = Date.now();

  try {
    const response = await fetch(service.url, {
      method: 'HEAD',
      headers: {
        'Authorization': `Bearer ${service.key}`,
        'User-Agent': 'OCR-Latency-Test/1.0'
      },
      signal: AbortSignal.timeout(10000)
    });

    const endTime = Date.now();
    const latency = endTime - startTime;

    return {
      service: service.name,
      latency: latency,
      status: response.status
    };
  } catch (error) {
    const endTime = Date.now();
    const latency = endTime - startTime;

    return {
      service: service.name,
      latency: latency,
      error: error.message
    };
  }
}

// 主测试函数
async function runOCRSpeedTest() {
  console.log('🏁 开始OCR服务速度对比测试...');
  console.log('📸 测试图片: 50x50像素 PNG图片');
  console.log('🔑 所有服务使用相同的测试图片和参数');

  // 1. 网络延迟测试
  console.log('\n📡 第一阶段：网络延迟测试 (HEAD请求)');
  const latencyResults = [];
  for (const service of services) {
    const latency = await testNetworkLatency(service);
    latencyResults.push(latency);
    console.log(`${service.name}: ${latency.latency}ms`);
    await new Promise(resolve => setTimeout(resolve, 500)); // 间隔500ms
  }

  // 2. OCR识别速度测试
  console.log('\n🔍 第二阶段：OCR识别速度测试');
  const results = [];

  for (const service of services) {
    const result = await testOCRService(service);
    results.push(result);

    if (result.success) {
      console.log(`✅ ${service.name}: ${result.responseTime} (成功)`);
    } else {
      console.log(`❌ ${service.name}: ${result.responseTime} (失败: ${result.error})`);
    }

    // 等待1秒再测试下一个服务，避免频率限制
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // 3. 结果分析
  console.log('\n📊 测试结果分析:');
  console.log('=' .repeat(80));

  // 网络延迟排名
  console.log('\n🌐 网络延迟排名 (从快到慢):');
  latencyResults
    .filter(r => !r.error)
    .sort((a, b) => a.latency - b.latency)
    .forEach((result, index) => {
      console.log(`${index + 1}. ${result.service}: ${result.latency}ms`);
    });

  // OCR识别速度排名
  console.log('\n🔍 OCR识别速度排名 (从快到慢):');
  results
    .filter(r => r.success)
    .sort((a, b) => a.duration - b.duration)
    .forEach((result, index) => {
      console.log(`${index + 1}. ${result.service}: ${result.responseTime} (${result.content.length}字符)`);
    });

  // 成功率统计
  const successCount = results.filter(r => r.success).length;
  const successRate = (successCount / results.length * 100).toFixed(1);

  console.log('\n📈 服务成功率统计:');
  console.log(`成功: ${successCount}/${results.length} (${successRate}%)`);

  results.forEach(result => {
    const status = result.success ? '✅ 成功' : '❌ 失败';
    console.log(`${result.service}: ${status} ${result.responseTime}`);
    if (!result.success) {
      console.log(`  错误: ${result.error}`);
    }
  });

  // 推荐服务
  console.log('\n💡 推荐使用顺序:');
  const successfulServices = results
    .filter(r => r.success)
    .sort((a, b) => a.duration - b.duration);

  if (successfulServices.length > 0) {
    successfulServices.forEach((service, index) => {
      console.log(`${index + 1}. ${service.service} (${service.responseTime})`);
    });
  } else {
    console.log('❌ 所有服务都测试失败');
  }

  return {
    latencyResults,
    ocrResults: results,
    summary: {
      totalServices: services.length,
      successfulServices: successCount,
      successRate: successRate,
      fastestService: successfulServices[0]?.service || 'N/A',
      fastestLatency: latencyResults.filter(r => !r.error).sort((a, b) => a.latency - b.latency)[0]?.service || 'N/A'
    }
  };
}

// 运行测试
runOCRSpeedTest().catch(console.error);