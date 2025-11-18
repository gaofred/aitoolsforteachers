const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

// 在阿里云 FC 环境中强制使用开发模式，绕过生产构建检查
const isProduction = process.env.NODE_ENV === 'production';

// 检测是否为云函数环境（包括阿里云FC、AWS Lambda、Vercel等）
const isCloudFunction = (
  process.env.FUNCTION_NAME ||          // 阿里云函数名
  process.env.FAAS_RUNTIME ||          // 阿里云运行时
  process.env.FC_ACCOUNT_ID ||         // 阿里云账号ID
  process.env.AWS_LAMBDA_FUNCTION_NAME || // AWS Lambda（兼容）
  process.env.VERCEL ||                 // Vercel（也强制开发模式）
  process.env.AWS_REGION ||            // AWS区域（也可能是云函数）
  false
);

// ECS云服务器环境 - 正常的生产/开发模式检测
const dev = !isProduction;

// 调试信息
console.log('🔧 环境检测信息:');
console.log(`  - NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`  - FUNCTION_NAME: ${process.env.FUNCTION_NAME}`);
console.log(`  - FAAS_RUNTIME: ${process.env.FAAS_RUNTIME}`);
console.log(`  - FC_ACCOUNT_ID: ${process.env.FC_ACCOUNT_ID}`);
console.log(`  - AWS_LAMBDA_FUNCTION_NAME: ${process.env.AWS_LAMBDA_FUNCTION_NAME}`);
console.log(`  - AWS_REGION: ${process.env.AWS_REGION}`);
console.log(`  - 检测为生产环境: ${isProduction}`);
console.log(`  - 检测为云函数环境: ${!!isCloudFunction}`);
console.log(`  - 最终启动模式: ${dev ? 'Development' : 'Production'}`);

// 如果是云函数环境且被检测为生产模式，强制覆盖
if (isCloudFunction && !dev) {
  console.log('⚠️  检测到云函数环境，强制切换到开发模式');
}

const hostname = process.env.HOSTNAME || '0.0.0.0';
const port = process.env.PORT || 9000;

console.log(`🚀 启动模式: ${dev ? 'Development' : 'Production'}`);
console.log(`🌐 监听地址: ${hostname}:${port}`);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      // 添加请求日志以便调试阿里云环境问题
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] ${req.method} ${req.url}`);

      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      console.error('Request headers:', req.headers);
      console.error('Environment:', {
        NODE_ENV: process.env.NODE_ENV,
        isCloudFunction: !!isCloudFunction,
        dev: dev
      });

      res.statusCode = 500;
      res.end('internal server error');
    }
  }).listen(port, hostname, () => {
    console.log(`✅ 应用启动成功！`);
    console.log(`🔗 访问地址: http://${hostname}:${port}`);
    console.log(`📍 环境: ${isCloudFunction ? '阿里云函数计算' : '本地环境'}`);
    console.log(`🔧 启动模式: ${dev ? 'Development' : 'Production'}`);
  });
}).catch((err) => {
  console.error('❌ Next.js 应用准备失败:', err.message);

  // 检查是否是缺少构建文件的问题
  if (err.code === 'ENOENT' && err.path?.includes('required-server-files.json')) {
    console.error('🔍 检测到缺少构建文件，可能需要重新构建项目');
    console.error('💡 解决方案：');
    console.error('   1. 确保上传了完整的 .next 目录');
    console.error('   2. 或者使用简化版服务器: node simple-server.js');
    console.error('   3. 检查启动脚本是否正确安装了依赖');
  }

  console.error('🚨 正在启动简化版服务器作为备用...');

  // 启动简化版服务器作为备用
  try {
    const http = require('http');
    createServer((req, res) => {
      console.log(`📥 简化版服务器收到请求: ${req.method} ${req.url}`);

      // 设置CORS头
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      // 返回基本响应
      const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>英语AI教学工具平台 - 维护模式</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
               max-width: 800px; margin: 0 auto; padding: 20px;
               background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
               color: white; min-height: 100vh; }
        .container { background: rgba(255,255,255,0.1); backdrop-filter: blur(10px);
                    border-radius: 20px; padding: 40px; text-align: center; }
        h1 { font-size: 2.5rem; margin-bottom: 20px; }
        .status { background: rgba(255,255,255,0.2); padding: 20px;
                  border-radius: 10px; margin: 20px 0; }
        .warning { border-left: 4px solid #f59e0b; }
        .info { border-left: 4px solid #3b82f6; }
        .error-details { background: rgba(239,68,68,0.2); padding: 15px;
                       border-radius: 8px; margin: 20px 0; font-family: monospace; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎓 英语AI教学工具平台</h1>

        <div class="status warning">
            <strong>⚠️ 系统维护中</strong>
        </div>

        <div class="status info">
            <strong>📝 当前状态：</strong>
            <p>Next.js 应用启动失败，已启用备用服务器</p>
            <p>我们正在修复此问题，请稍后重试</p>
        </div>

        <div class="error-details">
            <strong>错误详情：</strong><br>
            ${err.message}
        </div>

        <div class="status info">
            <strong>🔧 维护信息：</strong>
            <p>服务器时间: ${new Date().toLocaleString('zh-CN')}</p>
            <p>运行模式: 备用服务器</p>
            <p>环境: ${isCloudFunction ? '阿里云函数计算' : '本地环境'}</p>
        </div>
    </div>
</body>
</html>`;

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    }).listen(port, hostname, () => {
      console.log(`🚀 简化版服务器启动成功！`);
      console.log(`🔗 访问地址: http://${hostname}:${port}`);
      console.log(`📍 环境: ${isCloudFunction ? '阿里云函数计算' : '本地环境'}`);
      console.log(`⚠️  建议尽快修复 Next.js 构建问题`);
    });
  } catch (fallbackErr) {
    console.error('❌ 简化版服务器启动也失败:', fallbackErr);
    process.exit(1);
  }
});