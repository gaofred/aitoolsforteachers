#!/bin/bash

echo "🚀 快速修复Serverless部署问题"
echo "============================="
echo ""

# 环境变量设置
export NODE_ENV=production
export NODE_OPTIONS="--max-old-space-size=4096"

# 清理旧文件
echo "🧹 清理旧构建文件..."
rm -rf .next
rm -f build.log

# 备份原package.json
echo "💾 备份原配置文件..."
cp package.json package.json.backup
cp package-lock.json package-lock.json.backup

# 使用简化版package.json（减少依赖）
echo "📦 使用简化版package.json..."
cp package.serverless.json package.json

# 清理node_modules并重新安装
echo "📦 重新安装依赖..."
rm -rf node_modules
npm install

# 检查安装结果
if [ $? -ne 0 ]; then
    echo "❌ npm install失败，尝试清理缓存..."
    npm cache clean --force
    npm install
fi

# 构建应用
echo "🔨 构建应用..."
npm run build

# 检查构建结果
if [ $? -eq 0 ] && [ -f .next/server.js ]; then
    echo "✅ 构建成功！"

    # 验证standalone模式
    if [ -d .next/standalone ]; then
        echo "✅ Standalone模式正常"
        echo "📁 standalone目录内容:"
        ls -la .next/standalone/ | head -5
    else
        echo "⚠️ Standalone目录不存在，但server.js存在"
    fi

    echo ""
    echo "🎯 准备部署到Node.js 20.x环境"
    echo ""
    echo "📋 建议的部署配置:"
    echo "1. 使用 serverless-node20.yml 配置文件"
    echo "2. 内存限制: 2048MB"
    echo "3. 超时时间: 300秒"
    echo ""
    echo "🔗 推送修复到GitHub:"
    git add .
    git commit -m "fix: 优化Serverless部署配置，减少依赖和构建复杂性"
    git push new-origin main

    echo ""
    echo "🚀 重新部署命令:"
    echo "serverless deploy --config serverless-node20.yml --stage prod"

else
    echo "❌ 构建失败"
    echo ""
    echo "📋 错误详情:"
    if [ -f build.log ]; then
        echo "最后20行构建日志:"
        tail -20 build.log
    fi

    echo ""
    echo "🔧 尝试以下解决方案:"
    echo "1. 运行诊断脚本: ./diagnose-build-failure.sh"
    echo "2. 使用Docker构建: docker build -f Dockerfile.serverless ."
    echo "3. 检查fix-deployment-issues.md文档"
    echo "4. 联系技术支持"

    # 恢复原package.json
    if [ -f package.json.backup ]; then
        echo ""
        echo "🔄 恢复原package.json..."
        mv package.json.backup package.json
        mv package-lock.json.backup package-lock.json
    fi
fi

echo ""
echo "✅ 快速修复完成！"