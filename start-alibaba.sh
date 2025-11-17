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

# 提供启动选项
echo "🔍 选择启动模式："
echo "1. 完整功能 Next.js (推荐)"
echo "2. 简化版静态服务器 (备用)"

# 检查是否存在增强版启动脚本
if [ -f "start-alibaba-enhanced.sh" ]; then
    echo "3. 阿里云FC优化版 Next.js"
fi

# 读取用户选择（在实际部署中可以通过环境变量设置）
START_MODE=${START_MODE:-"1"}

echo "选择: $START_MODE"

case $START_MODE in
  "1")
    echo "🌟 使用完整功能 Next.js 启动..."
    if [ -f "server.js" ]; then
        exec node server.js
    elif [ -f "package.json" ]; then
        exec npm run start
    else
        echo "❌ 未找到启动文件"
        exit 1
    fi
    ;;
  "2")
    echo "🌟 使用简化版静态服务器..."
    if [ -f "simple-server.js" ]; then
        exec node simple-server.js
    else
        echo "❌ 简化版服务器文件不存在"
        exit 1
    fi
    ;;
  "3")
    echo "🌟 使用阿里云FC优化版启动..."
    if [ -f "start-alibaba-enhanced.sh" ]; then
        chmod +x start-alibaba-enhanced.sh
        exec ./start-alibaba-enhanced.sh
    else
        echo "❌ 增强版启动脚本不存在，使用完整功能"
        if [ -f "server.js" ]; then
            exec node server.js
        elif [ -f "package.json" ]; then
            exec npm run start
        else
            echo "❌ 未找到启动文件"
            exit 1
        fi
    fi
    ;;
  *)
    echo "❌ 无效选择，默认使用完整功能"
    if [ -f "server.js" ]; then
        exec node server.js
    elif [ -f "package.json" ]; then
        exec npm run start
    else
        echo "❌ 未找到启动文件"
        exit 1
    fi
    ;;
esac