#!/bin/bash

# 腾讯云 Serverless 部署脚本
# 用于解决 Node.js 版本兼容性问题

echo "🚀 开始部署英语AI教学工具到腾讯云 Serverless..."

# 检查 Serverless Framework 是否安装
if ! command -v serverless &> /dev/null; then
    echo "❌ Serverless Framework 未安装"
    echo "请先安装: npm install -g serverless"
    exit 1
fi

# 检查腾讯云账号配置
if ! serverless config credentials --provider tencent --key "$TENCENT_SECRET_ID" --secret "$TENCENT_SECRET_KEY" &> /dev/null; then
    echo "❌ 腾讯云账号未配置"
    echo "请设置环境变量:"
    echo "export TENCENT_SECRET_ID=your_secret_id"
    echo "export TENCENT_SECRET_KEY=your_secret_key"
    exit 1
fi

echo "✅ 环境检查通过"

# 清理旧构建
echo "🧹 清理旧的构建文件..."
rm -rf .next
rm -rf node_modules/.cache

# 安装依赖
echo "📦 安装依赖..."
npm ci --production=false

# 构建项目
echo "🔨 构建项目..."
npm run build

# 检查构建是否成功
if [ ! -d ".next" ]; then
    echo "❌ 构建失败"
    exit 1
fi

# 检查 server.js 是否存在（standalone 模式需要的文件）
if [ ! -f ".next/server.js" ]; then
    echo "❌ Standalone 模式构建失败，缺少 server.js"
    exit 1
fi

echo "✅ 构建成功"

# 部署到腾讯云
echo "🌐 部署到腾讯云 Serverless..."
serverless deploy --stage prod

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 部署成功！"
    echo ""
    echo "📋 部署信息："
    echo "- 运行时环境: Node.js 18.x"
    echo "- Next.js 版本: 15.3.2"
    echo "- 部署模式: Standalone"
    echo "- 静态资源: COS 存储"
    echo ""
    echo "🔗 访问地址请在 Serverless 控制台查看"
else
    echo "❌ 部署失败"
    echo "请检查 Serverless 配置和腾讯云账号权限"
    exit 1
fi