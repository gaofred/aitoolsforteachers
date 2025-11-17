// 测试阿里云新加坡OCR功能
const fs = require('fs');

// 创建一个简单的测试图片（1x1像素的PNG）
const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

// 阿里云新加坡OCR测试
async function testAliYunSingaporeOCR() {
  console.log('🌏 开始测试阿里云新加坡OCR功能...');

  try {
    const response = await fetch('http://localhost:3001/api/ai/ocr-aliyun-singapore', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageBase64: testImageBase64,
        prompt: '识别图中文字内容'
      })
    });

    console.log('📡 API响应状态:', response.status, response.statusText);

    const result = await response.json();
    console.log('📝 OCR识别结果:', JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('✅ 阿里云新加坡OCR测试成功');
      console.log('识别内容:', result.result);
      console.log('服务提供商:', result.provider);
    } else {
      console.log('❌ 阿里云新加坡OCR测试失败');
      console.log('错误信息:', result.error);
    }

  } catch (error) {
    console.error('❌ OCR测试过程中发生错误:', error.message);
  }
}

// 创建包含读后续写题目的测试图片（模拟测试）
async function testWithReadingTopic() {
  console.log('\n📖 测试读后续写题目识别...');

  try {
    const response = await fetch('http://localhost:3001/api/ai/ocr-aliyun-singapore', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageBase64: testImageBase64,
        prompt: '识别读后续写题目，特别注意识别P1和P2段落标记。请准确提取所有文字内容，保持原有格式。'
      })
    });

    const result = await response.json();
    console.log('📚 读后续写题目识别结果:', JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('❌ 读后续写题目识别测试失败:', error.message);
  }
}

// 运行测试
testAliYunSingaporeOCR().then(() => {
  testWithReadingTopic();
});