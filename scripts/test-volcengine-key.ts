/**
 * 测试火山引擎API Key配置
 */

async function testVolcengineKey() {
  console.log('🔍 测试火山引擎API Key配置...\n');

  const apiKey = process.env.VOLCENGINE_API_KEY;
  
  if (!apiKey) {
    console.log('❌ 火山引擎API Key未配置');
    console.log('请在 .env.local 文件中添加:');
    console.log('VOLCENGINE_API_KEY=1c4be881-b555-445c-8b33-94f843a3de94');
    return;
  }

  console.log('✅ 火山引擎API Key已配置');
  console.log(`API Key预览: ${apiKey.substring(0, 10)}...`);

  try {
    console.log('\n🧪 测试API调用...');
    
    const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'doubao-seed-1-6-251015',
        messages: [
          {
            role: 'user',
            content: 'Hello, this is a test message.'
          }
        ],
        max_tokens: 100
      })
    });

    console.log(`API响应状态: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorData = await response.text();
      console.log('❌ API调用失败:');
      console.log(errorData);
      return;
    }

    const data = await response.json();
    console.log('✅ API调用成功！');
    console.log('响应数据:', JSON.stringify(data, null, 2));

  } catch (error) {
    console.log('❌ API调用异常:', error);
  }
}

// 运行测试
if (require.main === module) {
  testVolcengineKey()
    .then(() => {
      console.log('\n🎉 测试完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 测试失败:', error);
      process.exit(1);
    });
}

export { testVolcengineKey };








