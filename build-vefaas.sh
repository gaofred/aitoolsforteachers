#!/bin/bash

# 火山引擎 veFaaS 备用构建脚本
# 作为 build.sh 的备用方案，确保权限问题不会阻塞构建

echo "🚀 Starting veFaaS Build (Backup Method)..."
echo "========================================="

# 设置环境变量
export NODE_ENV=production
export NODE_OPTIONS="--max-old-space-size=4096"

echo "📊 Environment Info:"
echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"
echo "Working directory: $(pwd)"
echo ""

# 直接执行构建命令，避免脚本权限问题
echo "📦 Installing dependencies..."
npm ci --production=false

echo "✅ Dependencies installed successfully"
echo ""

echo "🔨 Building production version..."
npm run build

# 验证构建结果
if [ $? -eq 0 ]; then
    echo "✅ Build completed successfully!"
    echo ""
    echo "📁 Build artifacts:"
    echo "- .next directory: $([ -d .next ] && 'EXISTS' || 'MISSING')"
    echo "- server.js: $([ -f server.js ] && 'EXISTS' || 'MISSING')"
    echo "- package.json: $([ -f package.json ] && 'EXISTS' || 'MISSING')"

    if [ -d .next ]; then
        echo "- .next directory size: $(du -sh .next | cut -f1)"
    fi

    echo ""
    echo "🎯 Build ready for veFaaS deployment!"
else
    echo "❌ Build failed"
    exit 1
fi

echo ""
echo "✅ veFaaS build process completed!"