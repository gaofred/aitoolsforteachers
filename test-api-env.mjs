// 测试阿里云API环境变量配置
console.log('🔍 检查阿里云API环境变量配置:');

const envVars = [
  'ALiYunSingapore_APIKEY',
  'DASHSCOPE_API_KEY',
  'AliYun_APIKEY'
];

console.log('\n📋 环境变量状态:');
envVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: 已设置 (长度: ${value.length})`);
    console.log(`   前10位: ${value.substring(0, 10)}...`);
  } else {
    console.log(`❌ ${varName}: 未设置`);
  }
});

// 模拟API密钥获取逻辑
const ALIYUN_API_KEY = process.env.ALiYunSingapore_APIKEY ||
                        process.env.DASHSCOPE_API_KEY ||
                        process.env.AliYun_APIKEY;

console.log('\n🎯 最终API密钥状态:');
console.log(`ALIYUN_API_KEY: ${ALIYUN_API_KEY ? '已设置' : '❌ 未设置'}`);
if (ALIYUN_API_KEY) {
  console.log(`密钥长度: ${ALIYUN_API_KEY.length}`);
  console.log(`密钥格式: ${ALIYUN_API_KEY.startsWith('sk-') ? '✅ 正确' : '❌ 可能错误'}`);
}

console.log('\n🌐 API测试:');
const ALIYUN_API_URL = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions';

if (ALIYUN_API_KEY) {
  console.log('准备测试阿里云API连接...');

  const testRequest = {
    model: "qwen3-max",
    messages: [
      {
        role: "user",
        content: "Hello, this is a test message."
      }
    ],
    temperature: 0.1,
    max_tokens: 100
  };

  // 这里需要fetch，在Node.js环境中需要安装node-fetch
  console.log('⚠️  需要在实际项目环境中测试API调用');
  console.log('📝 请求URL:', ALIYUN_API_URL);
  console.log('📝 请求体:', JSON.stringify(testRequest, null, 2));
} else {
  console.log('❌ 无法测试API调用：未配置API密钥');
}

console.log('\n🔧 解决方案:');
console.log('1. 在生产环境Vercel控制台中添加环境变量:');
console.log('   - ALiYunSingapore_APIKEY (首选)');
console.log('   - DASHSCOPE_API_KEY (备选)');
console.log('   - AliYun_APIKEY (备选)');
console.log('2. 确保API密钥格式正确 (通常以sk-开头)');
console.log('3. 重新部署项目以应用环境变量');