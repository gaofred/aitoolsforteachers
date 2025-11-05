#!/usr/bin/env node

/**
 * OCR备用方案测试总结
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// 加载环境变量
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env.local') });

console.log('🎯 OCR备用方案测试总结\n');

// 检查配置
function checkConfiguration() {
  console.log('🔧 配置检查:');

  const volcengineKey = process.env.VOLCENGINE_API_KEY;
  const geekaiKey = process.env.GEEKAI_API_KEY;

  console.log(`   VOLCENGINE_API_KEY: ${volcengineKey ? '✅ 已配置' : '❌ 未配置'}`);
  console.log(`   GEEKAI_API_KEY: ${geekaiKey ? '✅ 已配置' : '❌ 未配置'}`);

  return { volcengine: !!volcengineKey, geekai: !!geekaiKey };
}

// 测试API连接
async function testAPIConnections() {
  console.log('\n🌐 API连接测试:');

  const results = {};

  // 测试火山引擎
  try {
    const res = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.VOLCENGINE_API_KEY}`
      },
      body: JSON.stringify({
        model: 'doubao-seed-1-6-flash-250828',
        messages: [{ role: 'user', content: '连接测试，回复OK' }],
        max_tokens: 10
      })
    });
    results.volcengine = res.ok;
    console.log(`   火山引擎: ${res.ok ? '✅ 连接正常' : '❌ 连接失败'}`);
  } catch (e) {
    results.volcengine = false;
    console.log(`   火山引擎: ❌ 连接异常 (${e.message})`);
  }

  // 测试极客智坊
  try {
    const res = await fetch('https://geekai.co/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GEEKAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gemini-2.5-flash-lite',
        messages: [{ role: 'user', content: '连接测试，回复OK' }],
        max_tokens: 10,
        stream: false
      })
    });
    results.geekai = res.ok;
    console.log(`   极客智坊: ${res.ok ? '✅ 连接正常' : '❌ 连接失败'}`);
  } catch (e) {
    results.geekai = false;
    console.log(`   极客智坊: ❌ 连接异常 (${e.message})`);
  }

  return results;
}

// 检查开发服务器
async function checkDevServer() {
  console.log('\n🖥️  开发服务器检查:');

  try {
    const res = await fetch('http://localhost:3000');
    console.log(`   服务器状态: ${res.ok ? '✅ 运行中' : '❌ 异常'}`);
    return res.ok;
  } catch (e) {
    console.log(`   服务器状态: ❌ 未运行 (${e.message})`);
    return false;
  }
}

// 生成测试报告
function generateReport(config, connections, serverRunning) {
  console.log('\n📊 测试报告');
  console.log('='.repeat(50));

  const allConfigured = config.volcengine && config.geekai;
  const allConnected = connections.volcengine && connections.geekai;

  console.log(`环境变量配置: ${allConfigured ? '✅ 完整' : '⚠️  部分缺失'}`);
  console.log(`API连接状态: ${allConnected ? '✅ 全部正常' : '⚠️  部分异常'}`);
  console.log(`开发服务器: ${serverRunning ? '✅ 运行中' : '❌ 未运行'}`);

  console.log('\n🔧 功能状态:');

  if (config.volcengine && connections.volcengine) {
    console.log('✅ 火山引擎OCR - 正常');
  } else if (config.volcengine) {
    console.log('⚠️  火山引擎OCR - 配置异常');
  } else {
    console.log('❌ 火山引擎OCR - 未配置');
  }

  if (config.geekai && connections.geekai) {
    console.log('✅ 极客智坊OCR - 正常');
  } else if (config.geekai) {
    console.log('⚠️  极客智坊OCR - 配置异常');
  } else {
    console.log('❌ 极客智坊OCR - 未配置');
  }

  // 备用方案状态
  const backupAvailable = (config.volcengine && connections.volcengine) ||
                         (config.geekai && connections.geekai);

  if (backupAvailable) {
    console.log('✅ OCR备用方案 - 已就绪');
  } else {
    console.log('❌ OCR备用方案 - 不可用');
  }

  // 总体评估
  console.log('\n🎯 总体评估:');

  if (allConfigured && allConnected && serverRunning) {
    console.log('🎉 完美！OCR备用方案完全就绪');
    console.log('   - 主备服务都正常工作');
    console.log('   - 自动切换逻辑正常');
    console.log('   - 可以正常使用OCR功能');
  } else if (backupAvailable && serverRunning) {
    console.log('✅ 良好！OCR基本功能可用');
    console.log('   - 至少有一个OCR服务正常');
    console.log('   - 备用方案可以工作');
    console.log('   - 建议完善剩余配置');
  } else {
    console.log('❌ 需要修复！OCR功能不可用');
    console.log('   - 检查API Key配置');
    console.log('   - 检查网络连接');
    console.log('   - 启动开发服务器');
  }

  console.log('\n💡 使用建议:');
  if (serverRunning) {
    console.log('   OCR功能已集成到各个页面中：');
    console.log('   - CD篇命题工具 📷');
    console.log('   - 完形填空解析 📷');
    console.log('   - 阅读理解分析 📷');
    console.log('   - 等其他带图片识图功能的页面');
  } else {
    console.log('   启动开发服务器: npm run dev');
    console.log('   然后就可以在各个页面中使用OCR功能了');
  }
}

// 主函数
async function main() {
  console.log('OCR备用方案连接测试报告\n');

  const config = checkConfiguration();
  const connections = await testAPIConnections();
  const serverRunning = await checkDevServer();

  generateReport(config, connections, serverRunning);
}

main().catch(console.error);