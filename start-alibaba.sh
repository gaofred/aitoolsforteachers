#!/bin/bash
# 阿里云函数计算启动脚本

echo "🚀 启动 Next.js 应用 (阿里云 FC 环境)"

# 设置环境变量
export NODE_ENV=production
export PORT=${PORT:-9000}
export HOSTNAME=${HOSTNAME:-0.0.0.0}

echo "📊 启动环境信息："
echo "  - Node.js 版本: $(node --version)"
echo "  - npm 版本: $(npm --version)"
echo "  - 工作目录: $(pwd)"
echo "  - 监听端口: ${PORT}"

# 确保必要文件存在
echo "🔍 检查必要文件..."
ls -la package.json server.js 2>/dev/null || echo "⚠️  文件检查警告"

# 检查并安装依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    npm install --no-audit --no-fund
fi

# 检查是否需要构建（开发模式下不需要完整构建）
if [ ! -d ".next" ]; then
    echo "📦 检测到无构建目录，将使用开发模式启动"
    echo "💡 在阿里云 FC 环境中，应用将以开发模式运行"
else
    echo "✅ .next 目录已存在"
fi

# 设置环境变量，确保 server.js 能识别为阿里云 FC 环境
export FUNCTION_NAME="aitoolsforteachers-gcn5"
export FC_ACCOUNT_ID="151**********202"
export FAAS_RUNTIME="nodejs18"

echo "✅ 环境准备完成，启动应用..."

# 启动应用 - 优先使用简化版服务器
echo "🔍 检查可用的服务器..."

if [ -f "simple-server.js" ]; then
    echo "🌟 使用简化版服务器启动（快速可靠）..."
    exec node simple-server.js
elif [ -f "server.js" ]; then
    echo "🌟 使用自定义服务器启动..."
    exec node server.js
else
    echo "🌟 使用 Next.js 启动..."
    exec npm run start
fi