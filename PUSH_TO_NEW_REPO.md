# 推送代码到新GitHub仓库指南

## 🎯 目标仓库
**GitHub仓库**: `https://github.com/gaofred/vefaas-nextjs-1763387620480-app.git`

## 🔑 认证方式选择

### 方案1：Personal Access Token (推荐)

1. **创建GitHub Personal Access Token**
   - 登录 GitHub → Settings → Developer settings → Personal access tokens
   - 点击 "Generate new token (classic)"
   - 选择权限：`repo` (完整仓库访问权限)
   - 复制生成的token

2. **使用Token推送**
   ```bash
   # 替换YOUR_USERNAME和YOUR_TOKEN
   git remote set-url new-origin https://YOUR_USERNAME:YOUR_TOKEN@github.com/gaofred/vefaas-nextjs-1763387620480-app.git
   git push new-origin main
   ```

### 方案2：SSH密钥

1. **生成SSH密钥**（如果还没有）
   ```bash
   ssh-keygen -t ed25519 -C "your_email@example.com"
   ```

2. **添加SSH公钥到GitHub**
   - 复制 `~/.ssh/id_ed25519.pub` 内容
   - GitHub → Settings → SSH and GPG keys → New SSH key
   - 粘贴公钥内容

3. **使用SSH推送**
   ```bash
   git remote set-url new-origin git@github.com:gaofred/vefaas-nextjs-1763387620480-app.git
   git push new-origin main
   ```

### 方案3：GitHub CLI

1. **安装GitHub CLI**
   ```bash
   # macOS
   brew install gh

   # Ubuntu/Debian
   sudo apt install gh
   ```

2. **登录GitHub**
   ```bash
   gh auth login
   ```

3. **推送代码**
   ```bash
   gh repo create gaofred/vefaas-nextjs-1763387620480-app --public --source=. --remote=new-origin --push
   ```

## 📋 当前状态检查

### 查看远程仓库配置
```bash
git remote -v
```

### 查看本地提交
```bash
git log --oneline -5
```

### 查看分支状态
```bash
git status
```

## 🚀 推送命令（二选一）

### 使用HTTPS + Token
```bash
# 需要先替换为您的用户名和token
git remote set-url new-origin https://YOUR_USERNAME:YOUR_TOKEN@github.com/gaofred/vefaas-nextjs-1763387620480-app.git
git push new-origin main
```

### 使用SSH
```bash
git remote set-url new-origin git@github.com:gaofred/vefaas-nextjs-1763387620480-app.git
git push new-origin main
```

## 🔄 后续操作

推送成功后，您可以：

1. **设置默认远程分支**
   ```bash
   git branch --set-upstream-to=new-origin/main main
   ```

2. **简化后续推送命令**
   ```bash
   git push
   git pull
   ```

3. **删除旧的远程仓库（可选）**
   ```bash
   git remote remove origin
   git remote rename new-origin origin
   ```

## ⚠️ 注意事项

1. **Token安全**: 不要将token写入脚本或提交到代码仓库
2. **权限确认**: 确保token有足够的权限访问仓库
3. **网络检查**: 确保可以正常访问GitHub
4. **仓库存在**: 确认目标仓库已在GitHub上创建

## 🆘 故障排查

### Token认证失败
- 检查token是否过期
- 确认token权限设置正确
- 验证用户名和token格式

### SSH认证失败
- 检查SSH密钥是否正确添加到GitHub
- 确认SSH密钥权限（600或644）
- 测试SSH连接：`ssh -T git@github.com`

### 推送被拒绝
- 检查仓库权限
- 确认分支名称正确
- 查看详细错误信息