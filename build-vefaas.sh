#!/bin/bash

# 火山引擎 veFaaS 备用构建脚本
# 作为 build.sh 的备用方案，包含环境变量校验

echo "🚀 Starting veFaaS Build (Backup Method)..."
echo "========================================="

# 1. 环境变量校验
echo "=== Environment Variable Validation ==="
REQUIRED_ENVS=(
    "NEXT_PUBLIC_SUPABASE_URL"
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
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

# 检查是否有缺失的环境变量
if [ ${#MISSING_ENVS[@]} -gt 0 ]; then
    echo "❌ ERROR: Missing required environment variables:"
    for env in "${MISSING_ENVS[@]}"; do
        echo "   - $env"
    done
    echo ""
    echo "🔧 Solution:"
    echo "1. Login to Volcengine veFaaS console"
    echo "2. Go to Function Configuration - Environment Variables"
    echo "3. Add the following variables:"
    echo "   - NEXT_PUBLIC_SUPABASE_URL (your Supabase project URL)"
    echo "   - NEXT_PUBLIC_SUPABASE_ANON_KEY (your Supabase anon key)"
    echo "4. Select 'Function Runtime' scope"
    echo "5. Click 'Save' and 'Publish' function"
    echo "6. Retrigger the build"
    exit 1
fi

echo "✅ Environment variables validated"
echo "==================="

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
npm ci --omit=dev --no-audit --no-fund

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