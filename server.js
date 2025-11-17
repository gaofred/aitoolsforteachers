const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

// 在阿里云 FC 环境中强制使用开发模式，绕过生产构建检查
const isProduction = process.env.NODE_ENV === 'production';
const isAlibabaCloud = process.env.FUNCTION_NAME || process.env.AWS_LAMBDA_FUNCTION_NAME || false;
const dev = !isProduction || isAlibabaCloud; // 如果是阿里云环境，强制使用开发模式

const hostname = process.env.HOSTNAME || '0.0.0.0';
const port = process.env.PORT || 9000;

console.log(`🚀 启动模式: ${dev ? 'Development' : 'Production'}`);
console.log(`🌐 监听地址: ${hostname}:${port}`);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  }).listen(port, hostname, () => {
    console.log(`✅ 应用启动成功！`);
    console.log(`🔗 访问地址: http://${hostname}:${port}`);
    console.log(`📍 环境: ${isAlibabaCloud ? '阿里云函数计算' : '本地环境'}`);
  });
}).catch((err) => {
  console.error('❌ 应用启动失败:', err);
  process.exit(1);
});