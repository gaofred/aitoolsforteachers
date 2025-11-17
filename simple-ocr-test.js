// 简单的阿里云新加坡OCR测试
async function testOCRWithOnlineImage() {
  console.log('🌏 测试阿里云新加坡OCR功能...');

  // 使用一个简单的在线图片URL作为测试
  const testImageUrl = 'https://via.placeholder.com/100x50.png/000000/FFFFFF?text=Hello%20OCR';

  try {
    // 获取图片并转换为base64
    const imageResponse = await fetch(testImageUrl);
    if (!imageResponse.ok) {
      throw new Error('无法获取测试图片');
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const imageBase64 = Buffer.from(imageBuffer).toString('base64');
    const dataUrl = `data:image/png;base64,${imageBase64}`;

    console.log('📸 图片获取成功，大小:', imageBase64.length, '字符');

    // 测试阿里云新加坡OCR
    const ocrResponse = await fetch('http://localhost:3001/api/ai/ocr-aliyun-singapore', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageBase64: dataUrl,
        prompt: '识别图片中的文字内容'
      })
    });

    const result = await ocrResponse.json();
    console.log('📡 OCR API响应状态:', ocrResponse.status);
    console.log('📝 OCR识别结果:', JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('✅ 阿里云新加坡OCR测试成功！');
      console.log('识别内容:', result.result);
      console.log('服务提供商:', result.provider);
      console.log('使用模型:', result.model);

      // 测试读后续写题目识别
      console.log('\n📚 测试读后续写题目识别...');
      const topicResponse = await fetch('http://localhost:3001/api/ai/ocr-aliyun-singapore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: dataUrl,
          prompt: '识别读后续写题目，特别注意识别P1和P2段落标记。请准确提取所有文字内容，保持原有格式。'
        })
      });

      const topicResult = await topicResponse.json();
      console.log('📖 读后续写题目识别结果:', topicResult.success ? '成功' : '失败');
      if (topicResult.success) {
        console.log('题目内容:', topicResult.result);
      }

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
testOCRWithOnlineImage();