#!/usr/bin/env node

/**
 * 生产环境OCR测试工具
 * 用于排查生产环境中OCR识别缓慢的问题
 */

import fs from 'fs';
import path from 'path';

// 加载环境变量
import 'dotenv/config';

console.log('🔍 生产环境OCR诊断工具');
console.log('=' .repeat(50));

// 1. 环境检查
console.log('\n📋 环境配置检查:');
console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
console.log(`   VOLCENGINE_API_KEY: ${process.env.VOLCENGINE_API_KEY ? '✅ 已配置' : '❌ 未配置'}`);
console.log(`   API Key长度: ${process.env.VOLCENGINE_API_KEY?.length || 0} 字符`);

// 2. 检查关键配置
const prodConfig = {
  timeout: 60000,
  model: "doubao-seed-1-6-flash-250828",
  prompt: "识别图中文字，原文输出。不要做任何改动。如果图片中没有文字，请回复'无文字内容'",
  maxTokens: 4000,
  temperature: 0.1
};

console.log('\n⚙️ OCR配置参数:');
Object.entries(prodConfig).forEach(([key, value]) => {
  console.log(`   ${key}: ${value}`);
});

// 3. 压缩配置检查
const compressionConfig = {
  maxSizeMB: 5,
  maxWidthOrHeight: 3072,
  quality: 0.98,
  useWebWorker: true
};

console.log('\n🗜️ 图片压缩配置:');
Object.entries(compressionConfig).forEach(([key, value]) => {
  console.log(`   ${key}: ${value}`);
});

// 4. 创建测试函数
async function testOCR() {
  console.log('\n🚀 开始OCR测试...');

  const startTime = Date.now();

  try {
    // 模拟一个简单的base64测试图片（1x1像素的PNG）
    const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    const imageDataUrl = `data:image/png;base64,${testImageBase64}`;

    console.log('📡 发送OCR请求...');

    const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.VOLCENGINE_API_KEY}`
      },
      signal: AbortSignal.timeout(30000), // 30秒超时
      body: JSON.stringify({
        model: prodConfig.model,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prodConfig.prompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageDataUrl
                }
              }
            ]
          }
        ],
        temperature: prodConfig.temperature,
        max_tokens: prodConfig.maxTokens
      })
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`✅ 请求完成，耗时: ${duration}ms (${(duration/1000).toFixed(2)}秒)`);
    console.log(`📊 响应状态: ${response.status}`);

    if (response.ok) {
      const data = await response.json();
      console.log('📝 响应内容:', JSON.stringify(data, null, 2));
    } else {
      const errorData = await response.text();
      console.log('❌ 错误响应:', errorData);
    }

  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`❌ 请求失败，耗时: ${duration}ms`);
    console.log('💥 错误信息:', error.message);

    if (error.name === 'AbortError') {
      console.log('⏰ 错误类型: 请求超时');
    } else if (error.code === 'ENOTFOUND') {
      console.log('🌐 错误类型: 网络连接失败');
    } else {
      console.log('❓ 错误类型:', error.name);
    }
  }
}

// 5. 性能建议
console.log('\n💡 生产环境优化建议:');
console.log('1. 检查VOLCENGINE_API_KEY是否正确配置');
console.log('2. 监控火山引擎API的网络延迟');
console.log('3. 考虑增加更长的超时时间（建议120秒）');
console.log('4. 检查图片压缩质量是否过高');
console.log('5. 验证火山引擎API配额和限制');

// 运行测试
console.log('\n🧪 是否运行OCR测试? (y/N)');
process.stdin.once('data', (data) => {
  const input = data.toString().trim().toLowerCase();
  if (input === 'y' || input === 'yes') {
    testOCR().then(() => {
      console.log('\n✨ 测试完成');
      process.exit(0);
    }).catch((error) => {
      console.error('\n💥 测试失败:', error);
      process.exit(1);
    });
  } else {
    console.log('\n⏭️ 跳过OCR测试');
    process.exit(0);
  }
});