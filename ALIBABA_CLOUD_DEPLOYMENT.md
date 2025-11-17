# 阿里云函数计算部署指南

## 🚨 问题：next: not found

### 错误信息
```
{"ErrorCode":"CAExited","ErrorMessage":"Function instance exited unexpectedly(code 127, message:key has expired)
with start command 'npm run start'.
Logs:> nextjs-shadcn@0.1.0 start
> next start
sh: 1: next: not found"}
```

## ✅ 解决方案

### 1. 启动命令配置

在阿里云函数计算控制台中，使用以下启动命令：

**推荐配置（自动处理）：**
```bash
./start-alibaba.sh
```

**备用配置：**
```bash
node server.js
```

**错误配置：**
```bash
npm run start  # ❌ 需要 next 命令
```

### 2. 完整部署步骤

1. **登录阿里云函数计算控制台**
2. **创建服务/函数**
3. **配置函数设置**：
   - **运行时**: Node.js 20.x（推荐）
   - **启动命令**: `./start-alibaba.sh`
   - **内存规格**: 建议 1GB 以上
   - **超时时间**: 建议 30 秒以上

4. **配置环境变量**（必需）：
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://beevwnzudplsrseehrgn.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ZhipuOfficial=47812fc92da84de3953e8dc565c1b646.X3Muu34yJMODdN2Q
   OPENAI_API_KEY=sk-your-api-key
   ```

### 3. 启动脚本特性

`start-alibaba.sh` 脚本包含：

```bash
#!/bin/bash
# 自动检测并处理依赖问题

# ✅ 检查必要文件
# ✅ 自动安装生产依赖（如果 node_modules 不存在）
# ✅ 智能选择启动方式：
#    - 如果 next 命令可用 → npm run start
#    - 如果 next 命令不可用 → node server.js
# ✅ 完整的错误处理和日志输出
```

### 4. 构建验证

部署前运行：
```bash
./build.sh
```

成功后应该看到：
```
✅ veFaaS 启动脚本已准备就绪: run.sh
✅ 阿里云启动脚本已准备就绪: start-alibaba.sh
📁 构建产物：
  - .next 目录: EXISTS
  - server.js: EXISTS
  - package.json: EXISTS
  - run.sh (veFaaS): EXISTS
  - start-alibaba.sh (阿里云): EXISTS
```

## 🔧 故障排查

### 问题 1: next: not found
**原因**: node_modules 未正确安装或 next 包缺失
**解决**: 使用 `./start-alibaba.sh` 自动处理

### 问题 2: 内存不足
**症状**: Function instance exited unexpectedly (code 137)
**解决**: 增加内存规格到 1.5GB 或 2GB

### 问题 3: 超时
**症状**: Function instance exited unexpectedly (code 143)
**解决**: 增加超时时间到 60 秒

### 问题 4: 端口冲突
**原因**: 阿里云 FC 默认端口可能与应用冲突
**解决**: 脚本自动使用 9000 端口，或通过环境变量设置

## 📋 部署清单

部署前检查：
- [ ] 启动命令设置为 `./start-alibaba.sh`
- [ ] 运行时选择 Node.js 20.x
- [ ] 内存规格至少 1GB
- [ ] 超时时间至少 30 秒
- [ ] 环境变量已配置（5个必需变量）
- [ ] 构建脚本执行成功
- [ ] start-alibaba.sh 文件存在且有执行权限

## 🚀 性能优化

### 1. 依赖优化
- 只安装生产依赖：`npm install --production`
- 使用 npm 缓存减少冷启动时间

### 2. 代码优化
- 启用 Next.js 静态优化
- 使用轻量级组件
- 优化图片加载

### 3. 配置优化
- 合理设置内存和超时
- 配置 VPC 网络访问（如需要）
- 启用日志收集

## 💡 重要提醒

1. **阿里云 FC 与 veFaaS 差异**：
   - 阿里云需要更完整的依赖管理
   - 端口配置可能不同
   - 环境变量格式略有差异

2. **推荐启动方式**：
   - 优先使用 `./start-alibaba.sh`（智能选择）
   - 备用方案：`node server.js`（直接启动）

3. **调试建议**：
   - 查看函数执行日志
   - 本地测试启动脚本
   - 验证环境变量配置

---

**🎯 核心解决方案**: 使用 `start-alibaba.sh` 脚本自动处理依赖问题，智能选择最佳启动方式，确保在阿里云环境中稳定运行。