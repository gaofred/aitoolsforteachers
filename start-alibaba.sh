#!/bin/bash
# 阿里云函数计算启动脚本
set -e

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
echo "  - 启动时间: $(date)"

# 检查必要文件
if [ ! -f "package.json" ]; then
    echo "❌ 错误: package.json 文件不存在"
    exit 1
fi

if [ ! -f "server.js" ]; then
    echo "❌ 错误: server.js 文件不存在"
    exit 1
fi

# 智能检查和准备环境
NEED_BUILD=false
NEED_INSTALL=false

# 检查 node_modules
if [ ! -d "node_modules" ]; then
    echo "⚠️  警告: node_modules 不存在"
    NEED_INSTALL=true
    NEED_BUILD=true
fi

# 检查 .next 构建目录
if [ ! -d ".next" ]; then
    echo "⚠️  警告: .next 构建目录不存在"
    NEED_BUILD=true
fi

# 安装依赖（如果需要）
if [ "$NEED_INSTALL" = true ]; then
    echo "📦 正在安装所有依赖..."
    npm install --no-audit --no-fund

    if [ $? -ne 0 ]; then
        echo "❌ 依赖安装失败"
        exit 1
    fi
    echo "✅ 依赖安装完成"
fi

# 构建项目（如果需要）
if [ "$NEED_BUILD" = true ]; then
    echo "🔨 正在构建项目..."

    # 设置构建环境变量
    export NODE_ENV=production
    export NODE_OPTIONS="--max-old-space-size=4096"

    npm run build

    if [ $? -ne 0 ]; then
        echo "❌ 项目构建失败"
        exit 1
    fi
    echo "✅ 项目构建完成"
fi

# 检查 next 命令是否可用
if ! command -v next &> /dev/null; then
    echo "⚠️  警告: next 命令未找到，使用自定义服务器启动"
    NODE_MODE="custom"
else
    NODE_MODE="next"
fi

echo "✅ 所有必要文件检查完成"

# 根据模式启动应用
if [ "$NODE_MODE" = "custom" ]; then
    echo "🌟 使用自定义服务器启动..."
    exec node server.js
else
    echo "🌟 使用 Next.js 启动..."
    exec npm run start
fi