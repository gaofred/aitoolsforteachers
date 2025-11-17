# 火山引擎 veFaaS 启动配置指南

## 🚨 问题：/opt/bytefaas/run.sh 不存在

### 错误信息
```
function process failed to start: function exited unexpectedly(exit status 127)
with command `/opt/bytefaas/run.sh`, logs: bash: line 1: /opt/bytefaas/run.sh:
No such file or directory
```

## ✅ 解决方案

### 1. 启动命令配置

在火山引擎 veFaaS 控制台中，需要配置正确的启动命令：

**正确配置：**
```bash
./run.sh
```

**错误配置：**
```bash
/opt/bytefaas/run.sh  # ❌ 系统会自动添加前缀
```

### 2. 完整配置步骤

1. **登录火山引擎 veFaaS 控制台**
2. **进入函数配置页面**
3. **设置启动命令**：
   ```
   ./run.sh
   ```
4. **确保以下文件存在**：
   - `package.json` - 项目配置文件
   - `server.js` - Next.js 自定义服务器
   - `run.sh` - 启动脚本（自动生成）
   - `.next/` - Next.js 构建目录

### 3. 启动脚本内容

项目中的 `run.sh` 文件包含：

```bash
#!/bin/bash
# 火山引擎 veFaaS 启动脚本
set -e

echo "🚀 启动 Next.js 应用 (veFaaS 环境)"

export NODE_ENV=production
export PORT=${PORT:-8000}
export HOSTNAME=${HOSTNAME:-0.0.0.0}

echo "📊 启动环境信息："
echo "  - Node.js 版本: $(node --version)"
echo "  - npm 版本: $(npm --version)"
echo "  - 工作目录: $(pwd)"
echo "  - 监听端口: ${PORT}"

# 文件检查
if [ ! -f "package.json" ]; then
    echo "❌ 错误: package.json 文件不存在"
    exit 1
fi

if [ ! -f "server.js" ]; then
    echo "❌ 错误: server.js 文件不存在"
    exit 1
fi

if [ ! -d ".next" ]; then
    echo "❌ 错误: .next 构建目录不存在"
    exit 1
fi

echo "✅ 所有必要文件检查完成"
echo "🌟 启动服务器..."
exec node server.js
```

### 4. 端口配置

- **默认端口**: 8000
- **可配置**: 通过环境变量 `PORT` 设置
- **监听地址**: 0.0.0.0（所有网络接口）

### 5. 构建脚本更新

`build.sh` 已更新，会在构建过程中：
1. 检查 `run.sh` 文件是否存在
2. 修复换行符格式（Windows → Unix）
3. 设置执行权限
4. 验证脚本语法

### 6. 验证部署

构建成功后，应该看到：
```
✅ veFaaS 启动脚本已准备就绪: run.sh
📁 构建产物：
  - .next 目录: EXISTS
  - server.js: EXISTS
  - package.json: EXISTS
  - run.sh: EXISTS
```

## 🔧 故障排查

### 问题 1: 启动脚本权限不足
**症状**: Permission denied
**解决**: 脚本中包含 `chmod +x run.sh` 自动设置权限

### 问题 2: 换行符格式错误
**症状**: syntax error: unexpected end of file
**解决**: 构建脚本自动执行 `sed -i '' 's/\r$//' run.sh`

### 问题 3: 端口冲突
**症状**: listen EADDRINUSE :::8000
**解决**: 通过环境变量设置其他端口
```
export PORT=9000
```

### 问题 4: 文件缺失
**症状**: Error: server.js file does not exist
**解决**: 确保构建包含所有必要文件

## 📋 配置清单

部署前检查：
- [ ] 启动命令设置为 `./run.sh`
- [ ] 环境变量已配置（5个必需变量）
- [ ] 构建脚本执行成功
- [ ] run.sh 文件存在且有执行权限
- [ ] server.js 和 .next 目录存在

---

**💡 重要提醒**: veFaaS 平台会自动添加 `/opt/bytefaas/` 前缀，所以启动命令只需要相对路径 `./run.sh`