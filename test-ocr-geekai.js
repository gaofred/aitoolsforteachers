#!/usr/bin/env node

/**
 * 测试极客智坊OCR API
 * 验证新的极客智坊qwen3-vl-flash模型是否正常工作
 */

// 加载环境变量
require('dotenv').config({ path: '.env.local' });

const http = require('http');

// 创建一个简单的测试图片 (1x1像素的透明PNG)
const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

async function testGeekaiOCR() {
  console.log('🤖 开始测试极客智坊OCR API...');

  const postData = JSON.stringify({
    imageBase64: `data:image/png;base64,${testImageBase64}`,
    prompt: '请识别图片中的文字内容，如果没有文字请回复"测试成功"'
  });

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/ai/ocr-geekai',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      console.log(`📡 响应状态码: ${res.statusCode}`);
      console.log(`📡 响应头:`, res.headers);

      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log('✅ API响应解析成功');
          console.log('📝 响应内容:', JSON.stringify(result, null, 2));

          if (result.success) {
            console.log('🎉 极客智坊OCR API测试成功！');
            console.log(`📊 识别结果: ${result.result?.substring(0, 100)}...`);
            console.log(`🏢 提供商: ${result.provider}`);
            console.log(`🤖 模型: ${result.model}`);
          } else {
            console.log('❌ OCR识别失败:', result.error);
          }

          resolve(result);
        } catch (error) {
          console.error('❌ JSON解析失败:', error.message);
          console.log('📄 原始响应:', data);
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ 请求失败:', error.message);
      reject(error);
    });

    req.on('timeout', () => {
      console.error('⏰ 请求超时');
      req.destroy();
      reject(new Error('请求超时'));
    });

    req.setTimeout(30000); // 30秒超时
    req.write(postData);
    req.end();
  });
}

// 运行测试
async function runTest() {
  try {
    console.log('🚀 启动极客智坊OCR测试...');
    await testGeekaiOCR();
    console.log('✨ 测试完成');
  } catch (error) {
    console.error('💥 测试失败:', error.message);
    process.exit(1);
  }
}

// 检查环境变量
if (!process.env.GEEKAI_API_KEY) {
  console.log('⚠️  警告: 未设置 GEEKAI_API_KEY 环境变量');
  console.log('📝 请确保在 .env.local 文件中设置了极客智坊API密钥');
}

runTest();