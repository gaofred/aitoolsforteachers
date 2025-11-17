// 创建一个50x50像素的测试图片
const Canvas = require('canvas');

async function createTestImage() {
  console.log('🎨 创建测试图片...');

  // 创建50x50像素的canvas
  const canvas = Canvas.createCanvas(50, 50);
  const ctx = canvas.getContext('2d');

  // 设置白色背景
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, 50, 50);

  // 添加文字
  ctx.fillStyle = '#000000';
  ctx.font = '12px Arial';
  ctx.fillText('Test OCR', 5, 25);
  ctx.fillText('新加坡', 5, 40);

  // 转换为base64
  const dataUrl = canvas.toDataURL('image/png');
  const base64 = dataUrl.split(',')[1]; // 移除data:image/png;base64,前缀

  console.log('✅ 测试图片创建完成');
  console.log('图片长度:', base64.length, '字符');

  return base64;
}

// 测试阿里云新加坡OCR
async function testWithValidImage() {
  const imageBase64 = await createTestImage();

  console.log('\n🌏 使用有效图片测试阿里云新加坡OCR...');

  try {
    const response = await fetch('http://localhost:3001/api/ai/ocr-aliyun-singapore', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageBase64: imageBase64,
        prompt: '识别图片中的所有文字内容'
      })
    });

    const result = await response.json();
    console.log('📡 API响应状态:', response.status);
    console.log('📝 OCR识别结果:', JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('✅ 阿里云新加坡OCR测试成功！');
      console.log('识别内容:', result.result);
      console.log('服务提供商:', result.provider);
      console.log('使用模型:', result.model);
    } else {
      console.log('❌ 阿里云新加坡OCR测试失败');
      console.log('错误信息:', result.error);
      if (result.details) {
        console.log('详细错误:', result.details);
      }
    }

  } catch (error) {
    console.error('❌ OCR测试过程中发生错误:', error.message);
  }
}

// 运行测试
testWithValidImage();