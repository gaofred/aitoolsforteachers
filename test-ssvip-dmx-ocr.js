// 测试SSVIP DMX OCR API接口
const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAMAAAAp4XiDAAAAUVBMVEWFhYWDg4N3d3dtbW17e3t1dXWBgYGHh4d5eXlzc3OLi4ubm5uVlZWPj4+NjY19fX2JiYl/f39ra2uRkZGZmZlpaWmXl5dvb29xcXGTk5NnZ2c8TV1mAAAAG3RSTlNAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEAvEOwtAAAFVklEQVR4XpWWB67c2BUFb3g557T/hRo9/WUMZHlgr4Bg8Z4qQgQJlHI4A8SzFVrapvmTF9O7dmYRFZ60YiBhJRCgh1FYhiLAmdvX0CzTOpNE77ME0Zty/nWWzchDtiqrmQDeuv3powQ5ta2eN0FY0InkqDD73lT9c9lEzwUNqgFHs9VQce3TVClFCQrSTfOiYkVJQBmpbq2L6iZavPnAPcoU0dSw0SUTqz/GtrGuXfbyyBniKykOWQWGqwwMA7QiYAxi+IlPdqo+hYHnUt5ZPfnsHJyNiDtnpJyayNBkF6cWoYGAMY92U2hXHF/C1M8uP/ZtYdiuj26UdAdQQSXQErwSOMzt/XWRWAz5GuSBIkwG1H3FabJ2OsUOUhGC6tK4EMtJO0ttC6IBD3kM0ve0tJwMdSfjZo+EEISaeTr9P3wYrGjXqyC1krcKdhMpxEnt5JetoulscpyzhXN5FRpuPHvbeQaKxFAEB6EN+cYN6xD7RYGpXpNndMmZgM5Dcs3YSNFDHUo2LGfZuukSWyUYirJAdYbF3MfqEKmjM+I2EfhA94iG3L7uKrR+GdWD73ydlIB+6hgref1QTlmgmbM3/LeX5GI1Ux1RWpgxpLuZ2+I+IjzZ8wqE4nilvQdkUdfhzI5QDWy+kw5Wgg2pGpeEVeCCA7b85BO3F9DzxB3cdqvBzWcmzbyMiqhzuYqtHRVG2y4x+KOlnyqla8AoWWpuBoYRxzXrfKuILl6SfiWCbjxoZJUaCBj1CjH7GIaDbc9kqBY3W/Rgjda1iqQcOJu2WW+76pZC9QG7M00dffe9hNnseupFL53r8F7YHSwJWUKP2q+k7RdsxyOB11n0xtOvnW4irMMFNV4H0uqwS5ExsmP9AxbDTc9JwgneAT5vTiUSm1E7BSflSt3bfa1tv8Di3R8n3Af7MNWzs49hmauE2wP+ttrq+AsWpFG2awvsuOqbipWHgtuvuaAE+A1Z/7gC9hesnr+7wqCwG8c5yAg3AL1fm8T9AZtp/bbJGwl1pNrE7RuOX7PeMRUERVaPpEs+yqeoSmuOlokqw49pgomjLeh7icHNlG19yjs6XXOMedYm5xH2YxpV2tc0Ro2jJfxC50ApuxGob7lMsxfTbeUv07TyYxpeLucEH1gNd4IKH2LAg5TdVhlCafZvpskfncCfx8pOhJzd76bJWeYFnFciwcYfubRc12Ip/ppIhA1/mSZ/RxjFDrJC5xifFjJpY2Xl5zXdguFqYyTR1zSp1Y9p+tktDYYSNflcxI0iyO4TPBdlRgjuNNOQZZO_tOQJ4WZ-ch61dfD4BDZ4HJv5z4w9YRg==';

async function testSSVIPDMXOCR() {
  console.log('🚀 开始测试SSVIP DMX OCR API...');
  console.log('📸 使用测试图片 (50x50像素)');

  try {
    // 测试1: 基本文字识别
    console.log('\n🔍 测试1: 基本文字识别');
    const basicResponse = await fetch('http://localhost:3001/api/ai/ocr-ssvip-dmx', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageBase64: testImageBase64,
        prompt: '识别图片中的所有文字内容'
      })
    });

    const basicResult = await basicResponse.json();
    console.log('📡 响应状态:', basicResponse.status);
    console.log('📝 基本识别结果:', JSON.stringify(basicResult, null, 2));

    // 测试2: 读后续写题目识别
    console.log('\n📚 测试2: 读后续写题目识别');
    const topicResponse = await fetch('http://localhost:3001/api/ai/ocr-ssvip-dmx', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageBase64: testImageBase64,
        prompt: '识别读后续写题目，特别注意识别P1和P2段落标记。请准确提取所有文字内容，保持原有格式。'
      })
    });

    const topicResult = await topicResponse.json();
    console.log('📖 题目识别结果:', JSON.stringify(topicResult, null, 2));

    // 测试3: 数组格式图片测试
    console.log('\n🖼️ 测试3: 数组格式图片测试');
    const arrayResponse = await fetch('http://localhost:3001/api/ai/ocr-ssvip-dmx', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        images: [testImageBase64],
        prompt: '识别图片中的文字'
      })
    });

    const arrayResult = await arrayResponse.json();
    console.log('🖼️ 数组格式识别结果:', JSON.stringify(arrayResult, null, 2));

    // 结果分析
    console.log('\n📊 测试结果分析:');
    const tests = [
      { name: '基本识别', result: basicResult },
      { name: '题目识别', result: topicResult },
      { name: '数组格式', result: arrayResult }
    ];

    let successCount = 0;
    let primarySuccess = 0;
    let fallbackSuccess = 0;

    tests.forEach(test => {
      if (test.result.success) {
        successCount++;
        console.log(`✅ ${test.name}: 成功`);
        console.log(`   - 服务提供商: ${test.result.provider || '未知'}`);
        console.log(`   - 使用模型: ${test.result.model || '未知'}`);
        console.log(`   - 是否备用: ${test.result.fallback || false}`);
        console.log(`   - 识别内容: "${test.result.result || ''}"`);

        if (test.result.fallback) {
          fallbackSuccess++;
        } else {
          primarySuccess++;
        }
      } else {
        console.log(`❌ ${test.name}: 失败`);
        console.log(`   - 错误信息: ${test.result.error}`);
        if (test.result.details) {
          console.log(`   - 详细错误: ${test.result.details}`);
        }
      }
    });

    console.log('\n📈 成功率统计:');
    console.log(`- 总成功率: ${successCount}/${tests.length} (${(successCount/tests.length*100).toFixed(1)}%)`);
    console.log(`- 主服务成功率: ${primarySuccess}/${tests.length} (${(primarySuccess/tests.length*100).toFixed(1)}%)`);
    console.log(`- 备用服务成功率: ${fallbackSuccess}/${tests.length} (${(fallbackSuccess/tests.length*100).toFixed(1)}%)`);

    if (successCount > 0) {
      console.log('\n🎉 SSVIP DMX OCR API测试完成！');
    } else {
      console.log('\n❌ SSVIP DMX OCR API测试失败，请检查配置');
    }

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
    console.error('错误详情:', error);
  }
}

// 运行测试
testSSVIPDMXOCR();