#!/usr/bin/env node

/**
 * OCR备用方案测试脚本
 * 测试火山引擎和极客智坊API的连接状态
 */

const fs = require('fs');
const path = require('path');

// 创建一个简单的测试图片（base64编码的1x1像素透明图片）
const testImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

console.log('🔍 开始测试OCR备用方案...\n');

// 测试火山引擎API
async function testVolcengineAPI() {
  console.log('🌋 测试火山引擎API...');

  try {
    const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.VOLCENGINE_API_KEY || ''}`
      },
      body: JSON.stringify({
        model: 'doubao-seed-1-6-flash-250828',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: '请识别图片中的文字内容，如果没有文字请回复"测试成功"'
              },
              {
                type: 'image_url',
                image_url: {
                  url: testImageBase64
                }
              }
            ]
          }
        ],
        temperature: 0.1,
        max_tokens: 50
      })
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ 火山引擎API连接成功');
      console.log('   响应内容:', data.choices?.[0]?.message?.content?.substring(0, 50) + '...');
      return true;
    } else {
      console.log('❌ 火山引擎API连接失败');
      console.log('   错误信息:', data.error?.message || data);
      return false;
    }
  } catch (error) {
    console.log('❌ 火山引擎API连接异常');
    console.log('   错误详情:', error.message);
    return false;
  }
}

// 测试极客智坊API
async function testGeekaiAPI() {
  console.log('\n🤖 测试极客智坊Gemini API...');

  try {
    const response = await fetch('https://geekai.co/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GEEKAI_API_KEY || ''}`
      },
      body: JSON.stringify({
        model: 'gemini-2.5-flash-lite',
        messages: [
          {
            role: 'system',
            content: '你是一个OCR测试助手。'
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: '请识别图片中的文字内容，如果没有文字请回复"测试成功"'
              },
              {
                type: 'image_url',
                image_url: {
                  url: testImageBase64
                }
              }
            ]
          }
        ],
        temperature: 0.1,
        max_tokens: 50,
        stream: false
      })
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ 极客智坊Gemini API连接成功');
      console.log('   响应内容:', data.choices?.[0]?.message?.content?.substring(0, 50) + '...');
      return true;
    } else {
      console.log('❌ 极客智坊Gemini API连接失败');
      console.log('   错误信息:', data.error?.message || data);
      return false;
    }
  } catch (error) {
    console.log('❌ 极客智坊Gemini API连接异常');
    console.log('   错误详情:', error.message);
    return false;
  }
}

// 测试OCR路由的完整功能
async function testOCRRouter() {
  console.log('\n🔧 测试OCR路由完整功能...');

  try {
    const response = await fetch('http://localhost:3000/api/ocr', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        imageBase64: testImageBase64
      })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      console.log('✅ OCR路由功能正常');
      console.log('   识别结果:', data.result?.substring(0, 50) + '...');
      console.log('   服务提供商:', data.provider);
      console.log('   消息:', data.message);
      return true;
    } else {
      console.log('❌ OCR路由功能异常');
      console.log('   错误信息:', data.error || '未知错误');
      return false;
    }
  } catch (error) {
    console.log('❌ OCR路由连接异常');
    console.log('   错误详情:', error.message);
    console.log('   请确保开发服务器正在运行 (npm run dev)');
    return false;
  }
}

// 检查环境变量
function checkEnvironmentVariables() {
  console.log('🔧 检查环境变量配置...');

  const volcengineKey = process.env.VOLCENGINE_API_KEY;
  const geekaiKey = process.env.GEEKAI_API_KEY;

  console.log(`   VOLCENGINE_API_KEY: ${volcengineKey ? '✅ 已配置' : '❌ 未配置'}`);
  console.log(`   GEEKAI_API_KEY: ${geekaiKey ? '✅ 已配置' : '❌ 未配置'}`);

  return !!(volcengineKey && geekaiKey);
}

// 主测试函数
async function runTests() {
  console.log('OCR备用方案连接测试');
  console.log('='.repeat(50));

  // 检查环境变量
  const envOk = checkEnvironmentVariables();

  if (!envOk) {
    console.log('\n⚠️  部分环境变量未配置，某些测试可能会失败');
    console.log('   请在 .env.local 文件中配置相应的API Key');
  }

  console.log('\n开始API连接测试...\n');

  // 测试各个API
  const volcengineOk = await testVolcengineAPI();
  const geekaiOk = await testGeekaiAPI();
  const routerOk = await testOCRRouter();

  // 输出测试结果
  console.log('\n📊 测试结果汇总');
  console.log('='.repeat(50));
  console.log(`火山引擎API:     ${volcengineOk ? '✅ 正常' : '❌ 异常'}`);
  console.log(`极客智坊API:     ${geekaiOk ? '✅ 正常' : '❌ 异常'}`);
  console.log(`OCR路由功能:    ${routerOk ? '✅ 正常' : '❌ 异常'}`);

  // 评估备用方案状态
  if (volcengineOk && geekaiOk) {
    console.log('\n🎉 完美！主备服务都正常，OCR备用方案已就绪');
  } else if (volcengineOk || geekaiOk) {
    console.log('\n⚠️  部分服务可用，OCR基本功能可以工作');
  } else {
    console.log('\n❌ 所有服务都异常，需要检查API配置');
  }

  // 建议
  console.log('\n💡 建议:');
  if (!volcengineOk && geekaiOk) {
    console.log('   - 火山引擎异常，但极客智坊可用，会自动使用备用方案');
  }
  if (volcengineOk && !geekaiOk) {
    console.log('   - 主服务正常，但备用服务异常，建议检查极客智坊配置');
  }
  if (!envOk) {
    console.log('   - 请完善环境变量配置以获得最佳测试结果');
  }
}

// 运行测试
runTests().catch(console.error);