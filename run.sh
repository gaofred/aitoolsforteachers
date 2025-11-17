#!/bin/bash
# 火山引擎 veFaaS 启动脚本
set -e

echo "🚀 启动 Next.js 应用 (veFaaS 环境)"

export NODE_ENV=production
export PORT=${PORT:-8000}
export HOSTNAME=${HOSTNAME:-0.0.0.0}

echo "📊 启动环境信息："
echo "  - Node.js 版本: $(node --version)"
echo "  - npm 版本: $(npm --version)"
echo "  - 工作目录: $(pwd)"
echo "  - 监听端口: ${PORT}"
echo "  - 启动时间: $(date)"

if [ ! -f "package.json" ]; then
    echo "❌ 错误: package.json 文件不存在"
    exit 1
fi

if [ ! -f "server.js" ]; then
    echo "❌ 错误: server.js 文件不存在"
    exit 1
fi

if [ ! -d ".next" ]; then
    echo "❌ 错误: .next 构建目录不存在"
    exit 1
fi

echo "✅ 所有必要文件检查完成"
echo "🌟 启动服务器..."
exec node server.js