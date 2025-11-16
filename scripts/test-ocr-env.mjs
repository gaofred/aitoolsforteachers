#!/usr/bin/env node

/**
 * 使用dotenv加载环境变量的OCR API测试
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// 加载环境变量
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env.local') });

const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

console.log('🔍 OCR API连接测试 (带环境变量加载)\n');

// 检查API Keys
console.log('🔧 API Keys检查:');
const volcengineKey = process.env.VOLCENGINE_API_KEY;
const geekaiKey = process.env.GEEKAI_API_KEY;

console.log(`   火山引擎: ${volcengineKey ? '✅ 已配置 (' + volcengineKey.substring(0, 10) + '...)' : '❌ 未配置'}`);
console.log(`   极客智坊: ${geekaiKey ? '✅ 已配置 (' + geekaiKey.substring(0, 10) + '...)' : '❌ 未配置'}\n`);

// 测试函数
async function testAPI(name, url, apiKey, model, extraBody = {}) {
  console.log(`🧪 测试 ${name}...`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'user',
            content: '这是一个连接测试，如果收到请回复"测试成功"'
          }
        ],
        temperature: 0.1,
        max_tokens: 20,
        ...extraBody
      })
    });

    const data = await response.json();

    if (response.ok) {
      const content = data.choices?.[0]?.message?.content || '无内容';
      console.log(`   ✅ ${name} 连接成功`);
      console.log(`   📝 响应: ${content}`);
      return true;
    } else {
      console.log(`   ❌ ${name} 连接失败`);
      console.log(`   🚫 错误: ${data.error?.message || data.message || JSON.stringify(data)}`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ ${name} 连接异常`);
    console.log(`   🚫 异常: ${error.message}`);
    return false;
  }
}

// 主测试函数
async function main() {
  if (!volcengineKey && !geekaiKey) {
    console.log('❌ 未配置任何API Key，无法进行测试');
    return;
  }

  const results = [];

  // 测试火山引擎
  if (volcengineKey) {
    const volcengineOk = await testAPI(
      '火山引擎',
      'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
      volcengineKey,
      'doubao-seed-1-6-flash-250828'
    );
    results.push({ name: '火山引擎', ok: volcengineOk });
  }

  // 测试极客智坊
  if (geekaiKey) {
    const geekaiOk = await testAPI(
      '极客智坊 Gemini',
      'https://geekai.co/api/v1/chat/completions',
      geekaiKey,
      'gemini-2.5-flash-lite',
      { stream: false }
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

  console.log('\n💡 现在可以通过开发服务器测试完整的OCR功能');
}

main().catch(console.error);