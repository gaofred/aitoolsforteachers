#!/bin/bash

# 火山引擎 veFaaS 构建脚本
# 用于 Node.js 20.x 环境下的 Next.js 项目构建

# 确保脚本自身有执行权限
if [ ! -x "$0" ]; then
    echo "🔧 Setting execute permission for build script..."
    chmod +x "$0"
fi

set -e  # 遇到错误立即退出

echo "🚀 开始构建 Next.js 项目..."
echo "=================================="

# 显示环境信息
echo "📊 环境信息:"
echo "Node.js 版本: $(node --version)"
echo "npm 版本: $(npm --version)"
echo "工作目录: $(pwd)"
echo ""

# 设置环境变量
export NODE_ENV=production
export NODE_OPTIONS="--max-old-space-size=4096"

# 安装依赖
echo "📦 安装项目依赖..."
npm ci --production=false

# 检查安装结果
if [ $? -ne 0 ]; then
    echo "❌ 依赖安装失败，尝试清理缓存..."
    npm cache clean --force
    npm ci --production=false
fi

echo "✅ 依赖安装完成"
echo ""

# 构建项目
echo "🔨 构建生产版本..."
npm run build

# 检查构建结果
if [ $? -eq 0 ]; then
    echo "✅ 构建成功！"
    echo ""
    echo "📁 Build artifacts:"
    echo "- .next directory: $([ -d .next ] && 'EXISTS' || 'MISSING')"
    echo "- server.js: $([ -f server.js ] && 'EXISTS' || 'MISSING')"
    echo "- package.json: $([ -f package.json ] && 'EXISTS' || 'MISSING')"

    if [ -d .next ]; then
        echo "- .next 目录大小: $(du -sh .next | cut -f1)"
    fi

    echo ""
    echo "🎯 构建完成，准备部署！"
else
    echo "❌ 构建失败"
    echo ""
    echo "📋 错误详情:"
    if [ -f build.log ]; then
        echo "最后20行构建日志:"
        tail -20 build.log
    fi

    exit 1
fi

echo ""
echo "✅ 火山引擎 veFaaS 构建脚本执行完成！"