#!/bin/bash
# 阿里云FC完整部署脚本

set -e

echo "🚀 开始阿里云FC完整部署..."

# 设置环境变量
export NODE_ENV=production
export FUNCTION_NAME="aitoolsforteachers-gcn5"
export FC_ACCOUNT_ID="151**********202"
export FAAS_RUNTIME="nodejs18"

echo "📦 环境信息："
echo "  - Node.js 版本: $(node --version)"
echo "  - 工作目录: $(pwd)"
echo "  - 环境变量已设置"

# 清理旧的构建
echo "🧹 清理旧的构建文件..."
rm -rf .next

# 安装依赖（如果需要）
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    npm install --no-audit --no-fund
fi

# 重新构建项目
echo "🔨 重新构建Next.js项目..."
npm run build

# 验证关键文件存在
echo "🔍 验证构建文件..."
if [ ! -f ".next/required-server-files.json" ]; then
    echo "❌ 错误: required-server-files.json 不存在"
    exit 1
fi

if [ ! -d ".next/server" ]; then
    echo "❌ 错误: .next/server 目录不存在"
    exit 1
fi

echo "✅ 构建文件验证通过"

# 修复文件权限
echo "🔧 修复文件权限..."
chmod +x start-alibaba.sh
chmod +x start-alibaba-enhanced.sh

echo "✅ 部署准备完成！"
echo "📁 当前目录内容："
ls -la | grep -E '\.(js|ts|json|mjs)$|\.next|start-'

echo ""
echo "🎯 下一步操作："
echo "1. 在阿里云FC控制台上传当前目录所有文件"
echo "2. 确保环境变量设置正确"
echo "3. 使用启动命令: ./start-alibaba-enhanced.sh"
echo ""
echo "📋 关键文件："
echo "  - server.js (主服务器文件)"
echo "  - start-alibaba-enhanced.sh (优化启动脚本)"
echo "  - .next/ (构建输出目录)"
echo "  - src/ (源代码目录)"
echo "  - package.json (依赖配置)"