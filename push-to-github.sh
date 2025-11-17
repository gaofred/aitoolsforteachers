#!/bin/bash

echo "🚀 推送代码到新GitHub仓库"
echo "📦 目标仓库: vefaas-nextjs-1763387620480-app"
echo ""

# 检查远程仓库配置
echo "📋 当前远程仓库配置:"
git remote -v
echo ""

# 检查本地提交状态
echo "📊 本地提交状态:"
git log --oneline -3
echo ""

# 显示推送命令
echo "🔑 请选择认证方式:"
echo ""
echo "方式1 - Personal Access Token (推荐):"
echo "1. 访问 GitHub → Settings → Developer settings → Personal access tokens"
echo "2. 点击 'Generate new token (classic)'"
echo "3. 选择权限: repo (完整仓库访问权限)"
echo "4. 复制生成的token"
echo "5. 运行以下命令 (替换YOUR_USERNAME和YOUR_TOKEN):"
echo ""
echo "   git remote set-url new-origin https://YOUR_USERNAME:YOUR_TOKEN@github.com/gaofred/vefaas-nextjs-1763387620480-app.git"
echo "   git push new-origin main"
echo ""
echo "方式2 - SSH密钥:"
echo "1. 确保SSH密钥已添加到GitHub"
echo "2. 运行以下命令:"
echo ""
echo "   git remote set-url new-origin git@github.com:gaofred/vefaas-nextjs-1763387620480-app.git"
echo "   git push new-origin main"
echo ""
echo "方式3 - 交互式认证:"
echo "直接运行: git push new-origin main"
echo "系统会提示输入GitHub用户名和密码"
echo ""

# 询问用户
read -p "是否现在尝试推送? (y/n): " choice

if [[ $choice == "y" || $choice == "Y" ]]; then
    echo ""
    echo "🔄 正在推送到GitHub..."
    echo "如果提示输入凭据，请输入您的GitHub用户名和密码或Personal Access Token"
    echo ""

    # 尝试推送
    git push new-origin main

    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ 推送成功!"
        echo "🔗 访问仓库: https://github.com/gaofred/vefaas-nextjs-1763387620480-app"
    else
        echo ""
        echo "❌ 推送失败"
        echo "请检查: "
        echo "1. GitHub用户名和密码是否正确"
        echo "2. 是否有仓库访问权限"
        echo "3. 网络连接是否正常"
        echo ""
        echo "您可以尝试使用Personal Access Token方式"
    fi
else
    echo ""
    echo "⏸️ 推送已取消"
    echo "稍后可以手动运行: git push new-origin main"
fi