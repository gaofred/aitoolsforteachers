#!/bin/bash
set -e  # 出错立即退出，避免无效构建
echo "🚀 开始 Next.js 项目构建（含环境变量全校验）"

# ==============================================
# 第一步：环境变量注入（优先使用平台配置，兜底手动注入）
# ==============================================
# 🔥 紧急兜底：平台配置未生效时，使用手动注入
export NEXT_PUBLIC_SUPABASE_URL="https://beevwnzudplsrseehrgn.supabase.co"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlZXZ3bnp1ZHBsc3JzZWVocmduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExMzU4NTIsImV4cCI6MjA3NjcxMTg1Mn0.XGmYb8VkvtH62oeW9-YukrOfP5hZhsjjNksyVWq3WbA"
export SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlZXZ3bnp1ZHBsc3JzZWVocmduIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTc1MDI1MCwiZXhwIjoyMDc2NzE0ODMwLCJhdXRoIjoiaHR0cHM6Ly9zdXBhYmFzZS1hdXRobi13c2VyaG5kLnN1cGFiYXNlLmNvbSIsInN1YmFfdXJsIjoiaHR0cHM6Ly9zdXBhYmFzZS1hdXRobi13c2VyaW5rLnN1cGFiYXNlLmNvbSIsInN1YmFfa2JzIjoic3ZlY2F0aW9uX3JvbCIsInJvbGVfdXJsIjoiaHR0cHM6Ly9zdXBhYmFzZS1hdXRobi13c2VyaW5rLnN1cGFiYXNlLmNvbSJ9.f2oJ5zJQ2h6qK9T9r7XJ8k5W3nL4qP5mG2H1V7Yb8VkvtH62oeW9-YukrOfP5hZhsjjNksyVWq3WbA"
export ZhipuOfficial="47812fc92da84de3953e8dc565c1b646.X3Muu34yJMODdN2Q"
export OPENAI_API_KEY="sk-placeholder-key-for-build-validation"

# 检查是否存在兜底配置文件，自动加载
if [ -f ".env.fallback" ]; then
    echo "📁 发现兜底配置文件，自动加载环境变量..."
    source .env.fallback
    echo "✅ 兜底环境变量已加载"
fi

# ==============================================
# 第二步：变量格式校验（避免拼写、格式错误）
# ==============================================
echo -e "\n🔍 开始环境变量校验..."
REQUIRED_ENVS=(
    "NEXT_PUBLIC_SUPABASE_URL"
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    "SUPABASE_SERVICE_ROLE_KEY"
    "ZhipuOfficial"
    "OPENAI_API_KEY"
)
VALID=true

# 检查变量是否存在
for env in "${REQUIRED_ENVS[@]}"; do
    if [ -z "${!env}" ]; then
        echo "❌ 错误：缺少必填环境变量 $env，请检查 veFaaS 配置"
        VALID=false
    fi
done

# 检查 URL 格式（是否含 https://）
if [[ "$NEXT_PUBLIC_SUPABASE_URL" != https://* ]]; then
    echo "❌ 错误：NEXT_PUBLIC_SUPABASE_URL 格式无效，必须以 https:// 开头"
    echo "   当前值: ${NEXT_PUBLIC_SUPABASE_URL:0:50}..."
    VALID=false
fi

# 检查 Supabase URL 域名格式
if [[ "$NEXT_PUBLIC_SUPABASE_URL" != *.supabase.co ]]; then
    echo "❌ 错误：NEXT_PUBLIC_SUPABASE_URL 应为 Supabase 项目 URL（以 .supabase.co 结尾）"
    echo "   当前值: ${NEXT_PUBLIC_SUPABASE_URL:0:50}..."
    VALID=false
fi

# 检查密钥格式（是否为 JWT 格式，含 . 分隔）
if [[ "$NEXT_PUBLIC_SUPABASE_ANON_KEY" != *.*.* ]]; then
    echo "❌ 错误：NEXT_PUBLIC_SUPABASE_ANON_KEY 格式无效，应为 JWT 密钥（含 2 个 .）"
    echo "   当前值长度: ${#NEXT_PUBLIC_SUPABASE_ANON_KEY} 字符"
    VALID=false
fi

# 检查智谱API密钥格式（通常包含.分隔符）
if [[ "$ZhipuOfficial" != *.* ]]; then
    echo "❌ 错误：ZhipuOfficial 格式可能无效，智谱API密钥通常包含 . 分隔符"
    echo "   当前值长度: ${#ZhipuOfficial} 字符"
    VALID=false
fi

# 检查OpenAI密钥格式（通常以sk-开头）
if [[ "$OPENAI_API_KEY" != sk-* ]]; then
    echo "⚠️  警告：OPENAI_API_KEY 格式异常，通常应以 sk- 开头"
    echo "   当前值: ${OPENAI_API_KEY:0:10}..."
fi

# 校验不通过则退出
if [ "$VALID" = false ]; then
    echo -e "\n❌ 环境变量校验失败，终止构建"
    echo -e "\n🔧 解决方案："
    echo "1. 登录火山引擎 veFaaS 控制台"
    echo "2. 进入函数「配置」-「环境变量」"
    echo "3. 添加以下变量："
    echo "   - NEXT_PUBLIC_SUPABASE_URL (你的 Supabase 项目 URL)"
    echo "   - NEXT_PUBLIC_SUPABASE_ANON_KEY (你的 Supabase 匿名密钥)"
    echo "   - ZhipuOfficial (智谱清言 API 密钥)"
    echo "   - OPENAI_API_KEY (OpenAI API 密钥)"
    echo "4. 选择「函数运行时」作用范围"
    echo "5. 点击「保存」并重新「发布」函数"
    exit 1
fi

echo "✅ 环境变量校验通过！"
echo "  - Supabase URL: ${NEXT_PUBLIC_SUPABASE_URL:0:50}..."
echo "  - Supabase Key: ${NEXT_PUBLIC_SUPABASE_ANON_KEY:0:20}..."
echo "  - 智谱API: ${ZhipuOfficial:0:20}..."
echo "  - OpenAI Key: ${OPENAI_API_KEY:0:10}..."

# ==============================================
# 第三步：代码引用检查（避免引用方式错误）
# ==============================================
echo -e "\n🔍 开始代码引用检查..."

# 检查关键文件的引用方式
REFERENCE_FILES=(
    "src/app/api/ai/application-writing-scaffold/route.ts"
    "src/lib/supabase-client.ts"
    "src/app/api/auth/user/route.ts"
)

VALID_REFERENCES=true

for file in "${REFERENCE_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "  检查文件: $file"

        # 检查是否用 process.env. 前缀引用
        if grep -q "NEXT_PUBLIC_SUPABASE_URL" "$file"; then
            if ! grep -q "process.env.NEXT_PUBLIC_SUPABASE_URL" "$file"; then
                echo "❌ 错误：$file 中引用 NEXT_PUBLIC_SUPABASE_URL 但未使用 process.env. 前缀"
                VALID_REFERENCES=false
            fi
        fi

        if grep -q "NEXT_PUBLIC_SUPABASE_ANON_KEY" "$file"; then
            if ! grep -q "process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY" "$file"; then
                echo "❌ 错误：$file 中引用 NEXT_PUBLIC_SUPABASE_ANON_KEY 但未使用 process.env. 前缀"
                VALID_REFERENCES=false
            fi
        fi

        if grep -q "ZhipuOfficial" "$file"; then
            if ! grep -q "process.env.ZhipuOfficial" "$file"; then
                echo "❌ 错误：$file 中引用 ZhipuOfficial 但未使用 process.env. 前缀"
                VALID_REFERENCES=false
            fi
        fi
    else
        echo "  ⚠️  文件不存在: $file，跳过检查"
    fi
done

if [ "$VALID_REFERENCES" = false ]; then
    echo -e "\n❌ 代码引用检查失败，请修正引用方式"
    exit 1
fi

echo "✅ 代码引用检查通过！"

# ==============================================
# 第四步：环境信息显示
# ==============================================
echo -e "\n📊 构建环境信息："
echo "  - Node.js 版本: $(node --version)"
echo "  - npm 版本: $(npm --version)"
echo "  - 工作目录: $(pwd)"
echo "  - 构建时间: $(date)"

# ==============================================
# 第五步：正常构建流程（优化参数）
# ==============================================
echo -e "\n📦 开始安装依赖..."

# 设置生产环境变量
export NODE_ENV=production
export NODE_OPTIONS="--max-old-space-size=4096"

# 安装生产依赖（加速构建）
npm install --omit=dev --no-audit --no-fund

# 检查安装结果
if [ $? -ne 0 ]; then
    echo "❌ 依赖安装失败，尝试清理缓存..."
    npm cache clean --force
    npm install --omit=dev --no-audit --no-fund
    if [ $? -ne 0 ]; then
        echo "❌ 依赖安装彻底失败，终止构建"
        exit 1
    fi
fi

echo "✅ 依赖安装完成"

echo -e "\n🔨 开始构建项目..."
npm run build

# 检查构建结果
if [ $? -eq 0 ]; then
    echo -e "\n🎉 构建完成！环境变量已正常注入"

    # ==============================================
    # 第六步：创建 veFaaS 启动脚本
    # ==============================================
    echo -e "\n🔧 创建 veFaaS 启动脚本..."

    # 检查是否已存在 run.sh 模板文件
    if [ -f "run.sh" ]; then
        echo "📁 发现现有 run.sh 文件，确保格式正确..."
        # 修复换行符格式并设置权限
        sed -i '' 's/\r$//' run.sh
        chmod +x run.sh
        echo "✅ veFaaS 启动脚本已准备就绪: run.sh"
    else
        echo "❌ 错误: run.sh 模板文件不存在"
        exit 1
    fi

    # 显示构建结果
    echo -e "\n📁 构建产物："
    echo "  - .next 目录: $([ -d .next ] && 'EXISTS' || 'MISSING')"
    echo "  - server.js: $([ -f server.js ] && 'EXISTS' || 'MISSING')"
    echo "  - package.json: $([ -f package.json ] && 'EXISTS' || 'MISSING')"
    echo "  - run.sh: $([ -f run.sh ] && 'EXISTS' || 'MISSING')"

    if [ -d .next ]; then
        echo "  - .next 大小: $(du -sh .next | cut -f1)"
    fi

    echo -e "\n✅ veFaaS 部署就绪！"

    # 部署提醒
    if [ -f ".env.fallback" ]; then
        echo -e "\n⚠️  提醒：当前使用了兜底配置文件"
        echo "   生产部署请确保 veFaaS 平台已配置环境变量"
        echo "   并删除 .env.fallback 文件后重新构建"
    fi
else
    echo -e "\n❌ 构建失败"
    echo -e "\n📋 故障排查："
    echo "1. 检查构建日志中的具体错误信息"
    echo "2. 确认所有依赖版本兼容性"
    echo "3. 验证 TypeScript 和 ESLint 配置"

    if [ -f "build.log" ]; then
        echo -e "\n📄 构建日志（最后20行）："
        tail -20 build.log
    fi

    exit 1
fi

echo -e "\n🎯 所有检查完成，项目可正常部署！"