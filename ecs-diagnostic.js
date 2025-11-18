#!/usr/bin/env node

/**
 * 阿里云ECS环境诊断工具
 * 用于检查生产环境中的问题
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 阿里云ECS环境诊断开始...\n');

// 1. 检查基础环境
console.log('=== 1. 基础环境检查 ===');
console.log(`Node.js版本: ${process.version}`);
console.log(`工作目录: ${process.cwd()}`);
console.log(`NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
console.log(`PORT: ${process.env.PORT || 'undefined'}`);
console.log('');

// 2. 检查文件完整性
console.log('=== 2. 文件完整性检查 ===');
const requiredFiles = [
  'package.json',
  '.next/BUILD_ID',
  '.next/routes-manifest.json',
  'server.js'
];

requiredFiles.forEach(file => {
  const exists = fs.existsSync(file);
  console.log(`${file}: ${exists ? '✅ 存在' : '❌ 缺失'}`);

  if (file === '.next/BUILD_ID' && exists) {
    try {
      const buildId = fs.readFileSync(file, 'utf8').trim();
      console.log(`  构建ID: ${buildId}`);
    } catch (e) {
      console.log(`  无法读取构建ID`);
    }
  }
});
console.log('');

// 3. 检查进程状态
console.log('=== 3. 进程状态检查 ===');
try {
  const nodeProcesses = execSync('ps aux | grep node', { encoding: 'utf8' });
  console.log('运行的Node.js进程:');
  console.log(nodeProcesses);
} catch (e) {
  console.log('无法获取进程信息');
}
console.log('');

// 4. 检查端口占用
console.log('=== 4. 端口占用检查 ===');
const port = process.env.PORT || 9000;
try {
  const portInfo = execSync(`netstat -tlnp | grep :${port}`, { encoding: 'utf8' });
  console.log(`端口 ${port} 占用情况:`);
  console.log(portInfo || '未占用');
} catch (e) {
  console.log(`端口 ${port} 未被占用`);
}
console.log('');

// 5. 检查nginx配置（如果有）
console.log('=== 5. Nginx配置检查 ===');
try {
  const nginxSites = execSync('ls /etc/nginx/sites-enabled/ 2>/dev/null || ls /etc/nginx/conf.d/ 2>/dev/null', { encoding: 'utf8' });
  console.log('Nginx站点配置:');
  console.log(nginxSites);
} catch (e) {
  console.log('未找到Nginx配置或无权限访问');
}
console.log('');

// 6. 检查日志文件
console.log('=== 6. 日志文件检查 ===');
const logFiles = [
  '/var/log/nginx/error.log',
  '/var/log/nginx/access.log',
  './logs/app.log',
  './error.log'
];

logFiles.forEach(file => {
  try {
    const stats = fs.statSync(file);
    console.log(`${file}: ✅ 存在 (${stats.size} bytes, 修改时间: ${stats.mtime})`);
  } catch (e) {
    console.log(`${file}: ❌ 不存在或无权限访问`);
  }
});
console.log('');

// 7. 环境变量检查
console.log('=== 7. 环境变量检查 ===');
const importantEnvVars = [
  'NODE_ENV',
  'PORT',
  'STATIC_URL',
  'NEXT_PUBLIC_SITE_URL',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY'
];

importantEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    const masked = varName.includes('KEY') || varName.includes('SECRET')
      ? `${value.substring(0, 8)}...`
      : value;
    console.log(`${varName}: ${masked}`);
  } else {
    console.log(`${varName}: 未设置`);
  }
});
console.log('');

console.log('🏁 诊断完成！请将此输出提供给开发人员进行问题分析。');