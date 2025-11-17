#!/bin/bash

echo "🚀 为Serverless环境构建Next.js应用"
echo "📦 Node.js版本: $(node --version)"
echo "📦 npm版本: $(npm --version)"
echo ""

# 设置环境变量
export NODE_ENV=production
export NODE_OPTIONS="--max-old-space-size=4096"

# 清理旧的构建
echo "🧹 清理旧的构建文件..."
rm -rf .next
rm -rf node_modules/.cache

# 安装依赖
echo "📦 安装依赖..."
npm ci

# 构建应用
echo "🔨 构建Next.js应用..."
npm run build

# 检查构建结果
if [ -d ".next" ]; then
    echo "✅ 构建成功！"
    echo "📊 构建文件大小:"
    du -sh .next

    # 检查server.js是否存在
    if [ -f ".next/server.js" ]; then
        echo "✅ server.js文件存在"
    else
        echo "❌ server.js文件不存在"
        echo "📋 .next目录内容:"
        ls -la .next/
    fi
else
    echo "❌ 构建失败"
    exit 1
fi

# 验证standalone模式
echo ""
echo "🔍 验证standalone模式..."
if [ -d ".next/standalone" ]; then
    echo "✅ Standalone目录存在"
    echo "📋 Standalone目录内容:"
    ls -la .next/standalone/
else
    echo "⚠️ Standalone目录不存在，检查.next/目录..."
    ls -la .next/ | head -10
fi

echo ""
echo "🎉 构建完成！"
echo "📝 构建输出已准备好用于Serverless部署"