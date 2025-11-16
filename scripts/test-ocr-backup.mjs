#!/usr/bin/env node

/**
 * OCR备用方案快速测试脚本
 * 使用Node.js原生fetch API测试API连接
 */

const testImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

console.log('🔍 OCR备用方案快速测试\n');

// 检查环境变量
const VOLCENGINE_KEY = process.env.VOLCENGINE_API_KEY;
const GEEKAI_KEY = process.env.GEEKAI_API_KEY;

console.log('🔧 环境变量检查:');
console.log(`   VOLCENGINE_API_KEY: ${VOLCENGINE_KEY ? '✅' : '❌'}`);
console.log(`   GEEKAI_API_KEY: ${GEEKAI_KEY ? '✅' : '❌'}\n`);

// 测试函数
async function testAPI(name, url, apiKey, model, headers = {}) {
  console.log(`🧪 测试 ${name}...`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        ...headers
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: '这是一个连接测试，请回复"测试成功"'
              },
              {
                type: 'image_url',
                image_url: { url: testImageBase64 }
              }
            ]
          }
        ],
        temperature: 0.1,
        max_tokens: 20
      })
    });

    const data = await response.json();

    if (response.ok) {
      const content = data.choices?.[0]?.message?.content || '无内容';
      console.log(`   ✅ ${name} 连接成功`);
      console.log(`   📝 响应: ${content.substring(0, 30)}...`);
      return true;
    } else {
      console.log(`   ❌ ${name} 连接失败`);
      console.log(`   🚫 错误: ${data.error?.message || data.message || '未知错误'}`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ ${name} 连接异常`);
    console.log(`   🚫 异常: ${error.message}`);
    return false;
  }
}

// 主测试流程
async function main() {
  console.log('开始API连接测试...\n');

  const results = [];

  if (VOLCENGINE_KEY) {
    const volcengineOk = await testAPI(
      '火山引擎',
      'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
      VOLCENGINE_KEY,
      'doubao-seed-1-6-flash-250828'
    );
    results.push({ name: '火山引擎', ok: volcengineOk });
  }

  if (GEEKAI_KEY) {
    const geekaiOk = await testAPI(
      '极客智坊 Gemini',
      'https://geekai.co/api/v1/chat/completions',
      GEEKAI_KEY,
      'gemini-2.5-flash-lite',
      { 'stream': 'false' }
    );
    results.push({ name: '极客智坊 Gemini', ok: geekaiOk });
  }

  // 结果汇总
  console.log('\n📊 测试结果:');
  console.log('='.repeat(40));

  results.forEach(({ name, ok }) => {
    console.log(`${ok ? '✅' : '❌'} ${name}`);
  });

  const successCount = results.filter(r => r.ok).length;
  const totalCount = results.length;

  console.log(`\n🎯 成功率: ${successCount}/${totalCount} (${Math.round(successCount/totalCount*100)}%)`);

  if (successCount === totalCount) {
    console.log('\n🎉 所有服务都正常！OCR备用方案已就绪');
  } else if (successCount > 0) {
    console.log('\n⚠️  部分服务可用，OCR基本功能可以工作');
  } else {
    console.log('\n❌ 所有服务都异常，请检查API配置');
  }

  console.log('\n💡 提示: 如果开发服务器正在运行，可以测试完整的OCR功能');
}

main().catch(console.error);