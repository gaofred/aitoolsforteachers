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

// 在云函数环境中强制使用开发模式，无论NODE_ENV设置如何
const dev = !isProduction || isCloudFunction;

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
    console.log(`📍 环境: ${isCloudFunction ? '阿里云函数计算' : '本地环境'}`);
  });
}).catch((err) => {
  console.error('❌ 应用启动失败:', err);
  process.exit(1);
});