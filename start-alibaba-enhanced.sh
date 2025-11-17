#!/bin/bash
# 阿里云FC环境优化版启动脚本

set -e

echo "🚀 启动 Next.js 应用 (阿里云 FC 优化版)"

# 设置环境变量
export NODE_ENV=production
export PORT=${PORT:-9000}
export HOSTNAME=${HOSTNAME:-0.0.0.0}

# 设置阿里云 FC 特定环境变量
export FUNCTION_NAME="aitoolsforteachers-gcn5"
export FC_ACCOUNT_ID="151**********202"
export FAAS_RUNTIME="nodejs18"

# 性能优化设置
export NODE_OPTIONS="--max-old-space-size=4096"
export NEXT_TELEMETRY_DISABLED=1

echo "📊 启动环境信息："
echo "  - Node.js 版本: $(node --version)"
echo "  - npm 版本: $(npm --version)"
echo "  - 工作目录: $(pwd)"
echo "  - 监听端口: ${PORT}"
echo "  - 启动时间: $(date)"

# 检查必要文件
if [ ! -f "package.json" ]; then
    echo "❌ 错误: package.json 文件不存在"
    exit 1
fi

# 智能依赖管理
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖（约30-40秒）..."
    npm install --no-audit --no-fund --silent
    echo "✅ 依赖安装完成"
else
    echo "✅ node_modules 已存在，跳过安装"
fi

# 检查构建目录
if [ ! -d ".next" ]; then
    echo "📦 检测到无构建目录，将在运行时处理"
else
    echo "✅ .next 目录已存在"
fi

echo "✅ 环境准备完成，启动Next.js应用..."

# 启动应用
if [ -f "server.js" ]; then
    echo "🌟 使用自定义Next.js服务器启动..."
    exec node server.js
else
    echo "🌟 使用标准Next.js启动..."
    exec npm run start
fi