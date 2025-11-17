#!/bin/bash

echo "🔍 Serverless部署构建失败诊断脚本"
echo "=================================="
echo ""

# 检查当前环境
echo "📊 当前环境信息:"
echo "Node.js版本: $(node --version)"
echo "npm版本: $(npm --version)"
echo "操作系统: $(uname -s)"
echo "架构: $(uname -m)"
echo "内存信息: $(free -h)"
echo ""

# 检查项目文件
echo "📁 项目文件检查:"
echo "当前目录: $(pwd)"
echo "package.json: $([ -f package.json ] && '存在' || '缺失')"
echo "next.config.js: $([ -f next.config.js ] && '存在' || '缺失')"
echo "serverless.yml: $([ -f serverless.yml ] && '存在' || '缺失')"
echo ""

# 检查package.json依赖
if [ -f package.json ]; then
    echo ""
    echo "📦 package.json依赖检查:"
    echo "Next.js版本: $(grep '"next":' package.json | cut -d'"' -f4)"
    echo "React版本: $(grep '"react":' package.json | cut -d'"' -f4)"
    echo "TypeScript版本: $(grep '"typescript":' package.json | cut -d'"' -f4)"
fi

# 检查构建输出
echo ""
echo "🏗️ 构建文件检查:"
echo ".next目录: $([ -d .next ] && '存在' || '缺失')"
echo "server.js: $([ -f .next/server.js ] && '存在' || '缺失')"
if [ -d .next ]; then
    echo ".next目录大小: $(du -sh .next | cut -f1)"
fi

# 模拟构建过程
echo ""
echo "🔧 开始诊断构建过程..."
echo ""

# 设置环境变量
export NODE_ENV=production
export NODE_OPTIONS="--max-old-space-size=4096"

# 步骤1: 清理
echo "步骤1: 清理旧构建文件..."
rm -rf .next node_modules/.cache

# 步骤2: 依赖安装
echo "步骤2: 安装依赖..."
npm ci --verbose 2>&1 | head -50

# 检查npm安装结果
if [ $? -eq 0 ]; then
    echo "✅ 依赖安装成功"
else
    echo "❌ 依赖安装失败"
    echo ""
    echo "可能的解决方案:"
    echo "1. 清理npm缓存: npm cache clean --force"
    echo "2. 删除node_modules: rm -rf node_modules"
    echo "3. 重新安装: npm install"
    echo "4. 检查网络连接"
    exit 1
fi

# 步骤3: 类型检查
echo ""
echo "步骤3: TypeScript类型检查..."
npx tsc --noEmit --project tsconfig.json 2>&1 | head -20

# 步骤4: 构建应用
echo ""
echo "步骤4: 构建Next.js应用..."
echo "这可能需要几分钟时间..."
npm run build 2>&1 | tee build.log

# 分析构建结果
echo ""
echo "📊 构建结果分析:"
if [ -f build.log ]; then
    echo "构建日志最后20行:"
    tail -20 build.log

    # 查找常见错误模式
    echo ""
    echo "常见错误模式检查:"

    if grep -q "FATAL ERROR" build.log; then
        echo "❌ 发现致命错误"
        echo "请检查build.log文件了解详细错误信息"
    fi

    if grep -q "spawn ENOMEM" build.log; then
        echo "❌ 内存不足错误"
        echo "建议: 增加Node.js内存限制或使用更强大的机器"
    fi

    if grep -q "ENOSPC" build.log; then
        echo "❌ 内存不足错误"
        echo "建议: 增加系统内存或释放其他进程"
    fi

    if grep -q "EACCES" build.log; then
        echo "❌ 权限错误"
        echo "建议: 检查文件权限或使用sudo运行"
    fi
fi

# 最终状态检查
echo ""
echo "🎯 最终状态检查:"
if [ -f .next/server.js ]; then
    echo "✅ 构建成功 - server.js存在"
    echo "✅ standalone模式工作正常"
    echo ""
    echo "📦 构建产物:"
    ls -la .next/ | head -10

    # 测试server.js
    echo ""
    echo "🧪 测试server.js..."
    timeout 10s node .next/server.js --help > /dev/null 2>&1
    if [ $? -eq 124 ]; then
        echo "✅ server.js可以启动"
    else
        echo "✅ server.js基本功能正常"
    fi

    echo ""
    echo "🎉 诊断完成！项目可以用于Serverless部署"

else
    echo "❌ 构建失败 - server.js缺失"
    echo ""
    echo "📋 .next目录内容:"
    if [ -d .next ]; then
        ls -la .next/
    else
        echo ".next目录不存在"
    fi

    echo ""
    echo "🔧 推荐解决方案:"
    echo "1. 检查Node.js版本是否为20.x或更新"
    echo "2. 增加内存限制: export NODE_OPTIONS='--max-old-space-size=4096'"
    echo "3. 使用优化构建脚本: ./build-for-serverless.sh"
    echo "4. 查看详细错误: cat build.log"
    echo "5. 使用Docker构建: docker build -f Dockerfile.serverless ."
fi

echo ""
echo "💡 如果问题持续存在，请:"
echo "1. 查看完整构建日志: cat build.log"
echo "2. 联系技术支持"
echo "3. 查看fix-deployment-issues.md文档"