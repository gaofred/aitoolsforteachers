#!/bin/bash

# 火山引擎 veFaaS 增强构建脚本（含兜底方案）
# 用于 Node.js 20.x 环境下的 Next.js 项目构建
# 包含环境变量校验和兜底注入机制

# 确保脚本自身有执行权限
if [ ! -x "$0" ]; then
    echo "🔧 Setting execute permission for build script..."
    chmod +x "$0"
fi

set -e  # 遇到错误立即退出

echo "🚀 开始增强构建 Next.js 项目..."
echo "=================================="

# 1. 环境变量校验（关键！）
echo "=== 环境变量校验 ==="
REQUIRED_ENVS=(
    "NEXT_PUBLIC_SUPABASE_URL"
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    "ZhipuOfficial"
    "OPENAI_API_KEY"
)

MISSING_ENVS=()
for env in "${REQUIRED_ENVS[@]}"; do
    if [ -z "${!env}" ]; then
        MISSING_ENVS+=("$env")
    else
        # 隐藏敏感信息，只显示前8个字符
        VALUE=${!env}
        if [ ${#VALUE} -gt 8 ]; then
            echo "$env: ${VALUE:0:8}...***"
        else
            echo "$env: $VALUE"
        fi
    fi
done

# 2. 兜底方案：如果环境变量缺失，提供临时注入选项
if [ ${#MISSING_ENVS[@]} -gt 0 ]; then
    echo "⚠️  WARNING: 检测到缺失的环境变量:"
    for env in "${MISSING_ENVS[@]}"; do
        echo "   - $env"
    done
    echo ""
    echo "🔧 解决方案选择:"
    echo "方案1: 立即修复 veFaaS 环境变量配置（推荐）"
    echo "方案2: 临时兜底方案（仅用于测试验证）"
    echo ""

    # 检查是否存在兜底配置文件
    if [ -f ".env.fallback" ]; then
        echo "📁 发现兜底配置文件 .env.fallback，正在加载..."
        source .env.fallback
        echo "✅ 兜底变量已加载"

        # 重新检查环境变量
        FALLBACK_MISSING=()
        for env in "${MISSING_ENVS[@]}"; do
            if [ -z "${!env}" ]; then
                FALLBACK_MISSING+=("$env")
            fi
        done

        if [ ${#FALLBACK_MISSING[@]} -eq 0 ]; then
            echo "✅ 所有环境变量已通过兜底方案设置"
        else
            echo "❌ 兜底方案仍缺少变量: ${FALLBACK_MISSING[*]}"
            echo "请检查 .env.fallback 文件或手动设置环境变量"
            exit 1
        fi
    else
        echo "❌ ERROR: 缺少必填环境变量，且未找到兜底配置"
        echo ""
        echo "🔧 完整解决方案:"
        echo "1. 登录火山引擎 veFaaS 控制台"
        echo "2. 进入函数「配置」-「环境变量」页面"
        echo "3. 添加以下环境变量:"
        echo "   - NEXT_PUBLIC_SUPABASE_URL (您的 Supabase 项目 URL)"
        echo "   - NEXT_PUBLIC_SUPABASE_ANON_KEY (您的 Supabase 匿名密钥)"
        echo "4. 选择「函数运行时」作用范围"
        echo "5. 点击「保存」并重新「发布」函数"
        echo "6. 重新触发构建"
        echo ""
        echo "🔧 临时兜底方案（仅用于测试）:"
        echo "创建 .env.fallback 文件并添加:"
        echo "NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co"
        echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key"
        exit 1
    fi
else
    echo "✅ 所有环境变量校验通过"
fi

echo "==================="

# 3. 显示环境信息
echo "📊 环境信息:"
echo "Node.js 版本: $(node --version)"
echo "npm 版本: $(npm --version)"
echo "工作目录: $(pwd)"
echo ""

# 4. 设置环境变量
export NODE_ENV=production
export NODE_OPTIONS="--max-old-space-size=4096"

# 5. 依赖安装（优化参数，减少警告）
echo "📦 安装项目依赖..."
npm ci --omit=dev --no-audit --no-fund

# 检查安装结果
if [ $? -ne 0 ]; then
    echo "❌ 依赖安装失败，尝试清理缓存..."
    npm cache clean --force
    npm ci --omit=dev --no-audit --no-fund
fi

echo "✅ 依赖安装完成"
echo ""

# 6. 构建项目
echo "🔨 构建生产版本..."
npm run build

# 7. 检查构建结果
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
    echo ""
    echo "💡 部署提醒:"
    if [ -f ".env.fallback" ]; then
        echo "⚠️  当前使用了兜底配置文件，生产部署请配置 veFaaS 环境变量"
        echo "   并删除 .env.fallback 文件后重新构建"
    fi
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
echo "✅ 火山引擎 veFaaS 增强构建脚本执行完成！"