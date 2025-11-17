const http = require('http');
const path = require('path');
const fs = require('fs');

// 简单的静态文件服务器
const server = http.createServer((req, res) => {
  console.log(`📥 收到请求: ${req.method} ${req.url}`);

  try {
    // 设置CORS头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    // 对于根路径，返回一个简单的HTML页面
    if (req.url === '/' || req.url === '/index.html') {
      const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>英语AI教学工具平台</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
        }
        .container {
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 40px;
            text-align: center;
        }
        h1 {
            font-size: 2.5rem;
            margin-bottom: 20px;
        }
        .status {
            background: rgba(255,255,255,0.2);
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
        }
        .success {
            border-left: 4px solid #10b981;
        }
        .info {
            border-left: 4px solid #3b82f6;
        }
        .feature {
            background: rgba(255,255,255,0.1);
            padding: 15px;
            margin: 10px 0;
            border-radius: 8px;
            text-align: left;
        }
        .emoji {
            font-size: 2rem;
            margin-right: 10px;
        }
        .env-info {
            font-size: 0.9rem;
            opacity: 0.8;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎓 英语AI教学工具平台</h1>

        <div class="status success">
            <span class="emoji">✅</span>
            <strong>部署成功！</strong>
        </div>

        <div class="status info">
            <span class="emoji">🌐</span>
            <strong>运行环境：</strong>阿里云函数计算
        </div>

        <div class="feature">
            <span class="emoji">📚</span>
            <strong>智能文本分析工具</strong>
        </div>

        <div class="feature">
            <span class="emoji">✏️</span>
            <strong>语法练习生成器</strong>
        </div>

        <div class="feature">
            <span class="emoji">📝</span>
            <strong>写作指导助手</strong>
        </div>

        <div class="feature">
            <span class="emoji">🔤</span>
            <strong>词汇学习工具</strong>
        </div>

        <div class="env-info">
            <strong>环境信息：</strong><br>
            服务器时间: ${new Date().toLocaleString('zh-CN')}<br>
            内存使用: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB<br>
            启动模式: 简化版静态服务器
        </div>
    </div>
</body>
</html>`;

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    }

    // API路由示例
    if (req.url.startsWith('/api/')) {
      const apiData = {
        status: 'success',
        message: 'API服务正常运行',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      };

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(apiData, null, 2));
      return;
    }

    // 其他路由返回404
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('页面未找到');

  } catch (error) {
    console.error('服务器错误:', error);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('服务器内部错误');
  }
});

const PORT = process.env.PORT || 9000;
const HOST = '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log('🚀 简化版服务器启动成功！');
  console.log(`🌐 监听地址: http://${HOST}:${PORT}`);
  console.log(`📅 环境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⏰ 启动时间: ${new Date().toLocaleString('zh-CN')}`);
  console.log(`💡 内存使用: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
  console.log('📝 这是一个简化版的静态服务器，用于快速验证部署');
});