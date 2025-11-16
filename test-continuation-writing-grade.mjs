// 测试批量读后续写批改功能的脚本
const fetch = require('node-fetch');

// 测试数据
const testRequest = {
  studentName: "测试学生",
  content: "The story continued with remarkable courage and determination. As the protagonist faced the challenges ahead, they discovered new strength within themselves. Through perseverance and hope, they found a path forward that would change their life forever. The journey was difficult, but the reward was worth every sacrifice made along the way. In the end, they emerged stronger and wiser than before.",
  topic: "续写故事",
  plotAnalysis: "故事应该朝着积极向上的方向发展，展现主人公的成长和蜕变",
  useMediumStandard: false,
  includeDetailedFeedback: true,
  wordCount: 68,
  p1Content: "The story continued with remarkable courage and determination.",
  p2Content: "In the end, they emerged stronger and wiser than before."
};

async function testContinuationWritingGrade() {
  try {
    console.log('🎯 开始测试批量读后续写批改功能...');
    console.log('📝 测试数据:', {
      studentName: testRequest.studentName,
      contentLength: testRequest.content.length,
      wordCount: testRequest.wordCount,
      topic: testRequest.topic
    });

    // 发送测试请求
    const response = await fetch('http://localhost:3000/api/continuation-writing-grade', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testRequest),
      timeout: 180000 // 3分钟超时
    });

    console.log(`📊 响应状态: ${response.status}`);
    console.log(`📊 响应头:`, Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('📝 响应内容 (前500字符):', responseText.substring(0, 500));

    try {
      const data = JSON.parse(responseText);
      console.log('✅ JSON解析成功:', {
        success: data.success,
        score: data.score,
        hasFeedback: !!data.feedback,
        hasDetailedFeedback: !!data.detailedFeedback,
        pointsCost: data.pointsCost,
        remainingPoints: data.remainingPoints,
        error: data.error
      });

      if (data.success) {
        console.log('🎉 批改功能测试成功！');
        console.log(`📊 学生得分: ${data.score}`);
        console.log(`📝 反馈长度: ${data.feedback?.length || 0} 字符`);
        console.log(`📝 详细反馈长度: ${data.detailedFeedback?.length || 0} 字符`);
      } else {
        console.error('❌ 批改功能测试失败:', data.error);
      }
    } catch (parseError) {
      console.error('❌ JSON解析失败:', parseError.message);
      console.error('原始响应:', responseText);
    }

  } catch (error) {
    console.error('❌ 请求失败:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('🚫 连接被拒绝，请确保开发服务器正在运行 (bun dev)');
    } else if (error.code === 'ENOTFOUND') {
      console.error('🚫 域名解析失败');
    } else if (error.type === 'request-timeout') {
      console.error('⏰ 请求超时，可能是API调用时间过长');
    }
  }
}

// 运行测试
console.log('🧪 批量读后续写批改功能测试脚本');
console.log('⚠️  请确保开发服务器正在运行 (bun dev)');
console.log('⚠️  请确保环境变量已正确配置');
console.log('');

testContinuationWritingGrade();