#!/usr/bin/env node

/**
 * OCR API快速连接测试
 */

const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

console.log('🔍 OCR API连接测试\n');

// 检查API Keys
console.log('🔧 API Keys检查:');
const volcengine = process.env.VOLCENGINE_API_KEY ? '✅ 火山引擎' : '❌ 火山引擎';
const geekai = process.env.GEEKAI_API_KEY ? '✅ 极客智坊' : '❌ 极客智坊';
console.log(`   ${volcengine}`);
console.log(`   ${geekai}\n`);

// 简单的测试函数
async function quickTest() {
  if (!process.env.VOLCENGINE_API_KEY && !process.env.GEEKAI_API_KEY) {
    console.log('❌ 未配置任何API Key，无法进行测试');
    console.log('💡 请在 .env.local 中配置 VOLCENGINE_API_KEY 和/或 GEEKAI_API_KEY');
    return;
  }

  console.log('🧪 测试火山引擎...');
  try {
    const res = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.VOLCENGINE_API_KEY}`
      },
      body: JSON.stringify({
        model: 'doubao-seed-1-6-flash-250828',
        messages: [{ role: 'user', content: '测试连接，请回复OK' }],
        max_tokens: 10
      })
    });
    console.log(res.ok ? '✅ 火山引擎连接正常' : '❌ 火山引擎连接失败');
  } catch (e) {
    console.log('❌ 火山引擎连接异常:', e.message);
  }

  console.log('\n🧪 测试极客智坊...');
  try {
    const res = await fetch('https://geekai.co/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GEEKAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gemini-2.5-flash-lite',
        messages: [{ role: 'user', content: '测试连接，请回复OK' }],
        max_tokens: 10
      })
    });
    console.log(res.ok ? '✅ 极客智坊连接正常' : '❌ 极客智坊连接失败');
  } catch (e) {
    console.log('❌ 极客智坊连接异常:', e.message);
  }

  console.log('\n🎯 测试完成！');
}

quickTest().catch(console.error);