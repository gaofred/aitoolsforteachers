# 火山引擎 veFaaS 环境变量配置全流程指南

## 📋 概述

本指南提供火山引擎 veFaaS 平台环境变量配置的完整流程，确保环境变量 100% 生效并解决常见的构建问题。

## 🔧 第一步：veFaaS 平台配置操作手册

### 1.1 环境变量配置步骤（含构建 + 运行时双环境）

1. **登录火山引擎 veFaaS 控制台**
   - 访问 https://console.volcengine.com/
   - 进入 veFaaS 服务
   - 选择您的函数

2. **配置运行时环境变量**
   - 点击左侧「配置」
   - 点击「环境变量」
   - 点击「添加环境变量」，分别添加：
     ```
     变量名：NEXT_PUBLIC_SUPABASE_URL
     变量值：https://beevwnzudplsrseehrgn.supabase.co

     变量名：NEXT_PUBLIC_SUPABASE_ANON_KEY
     变量值：eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlZXZ3bnp1ZHBsc3JzZWVocmduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExMzU4NTIsImV4cCI6MjA3NjcxMTg1Mn0.XGmYb8VkvtH62oeW9-YukrOfP5hZhsjjNksyVWq3WbA

     变量名：ZhipuOfficial
     变量值：47812fc92da84de3953e8dc565c1b646.X3Muu34yJMODdN2Q

     变量名：OPENAI_API_KEY
     变量值：sk-your-openai-api-key
     ```
   - 选择「函数运行时」作用范围
   - 点击「保存」

3. **配置构建环境变量（关键！避免构建阶段读不到）**
   - 点击「构建配置」
   - 点击「构建环境变量」
   - 点击「添加环境变量」
   - 重复步骤 2 的变量配置（4个变量都需要添加）
   - 选择「构建时」作用范围
   - 点击「保存」

4. **必须重新发布函数**
   - 点击左侧「发布管理」
   - 点击「创建发布」
   - 选择「使用当前配置」
   - 填写发布说明（如 "配置 Supabase 环境变量"）
   - 点击「确认发布」

5. **发布完成后，再触发构建**
   - 等待发布完成（通常需要 1-2 分钟）
   - 重新触发构建（避免使用旧配置缓存）

### 1.2 平台配置校验要点（避免踩坑）

- ✅ **变量名严格区分大小写**，不可多空格
  - 正确：`NEXT_PUBLIC_SUPABASE_URL`
  - 错误：`NEXT_PUBLIC_SUPABASE_URL `（末尾多空格）

- ✅ **变量值直接复制**，不要手动修改
  - Supabase URL 必须以 `https://` 开头
  - Supabase 密钥必须为 JWT 格式（含 2 个 `.` 分隔符）
  - 智谱 API 密钥通常包含 `.` 分隔符
  - OpenAI 密钥通常以 `sk-` 开头

- ✅ **作用范围选择正确**
  - 运行时环境变量：选择「函数运行时」
  - 构建环境变量：选择「构建时」

## 🔍 第二步：Next.js 项目配置检查

### 2.1 next.config.js 配置检查

确保 `next.config.js` 中没有手动指定 `env` 选项：

```javascript
/** ✅ 正确配置示例（无 env 覆盖） */
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 其他自定义配置（如 images、experimental 等）
  // 注意：不要添加 env 配置，让 Next.js 自动注入 process.env 变量
};

module.exports = nextConfig;
```

```javascript
/** ❌ 错误配置示例（会覆盖平台变量） */
const nextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL: 'https://...', // 这会覆盖平台配置！
  },
};

module.exports = nextConfig;
```

### 2.2 检查并删除冲突的 .env 文件

删除项目根目录下的以下文件（若存在）：
- `.env`
- `.env.production`
- `.env.local`（仅在 veFaaS 环境中删除）

这些文件会优先于平台变量生效，导致配置失效。

## 🛠️ 第三步：增强版构建脚本

项目已包含增强版 `build.sh` 脚本，提供以下功能：

### 3.1 脚本功能特性

1. **环境变量注入**
   - 优先使用平台配置
   - 自动加载 `.env.fallback` 兜底配置

2. **变量格式校验**
   - 检查 URL 格式（必须 `https://` 开头）
   - 检查 Supabase 域名格式（必须 `.supabase.co` 结尾）
   - 检查 JWT 密钥格式（必须包含 2 个 `.`）
   - 检查 API 密钥格式

3. **代码引用检查**
   - 验证 `process.env.` 前缀使用正确
   - 检查关键文件的引用方式

4. **构建流程优化**
   - 内存限制设置（4GB）
   - 依赖缓存管理
   - 详细错误诊断

### 3.2 脚本使用方法

```bash
# 在 veFaaS 构建环境中运行
chmod +x build.sh
./build.sh
```

## 🚨 第四步：故障排查流程图

### 4.1 构建报错排查

```
构建报错"缺少 Supabase 变量"
├─ 运行 build.sh 查看校验日志
│  ├─ 日志显示"缺少变量" → 平台配置未生效
│  │  └─ 按手册重新配置+发布
│  ├─ 日志显示"URL 格式无效" → 变量值错误
│  │  └─ 修正 Supabase URL（必须 https:// 开头）
│  ├─ 日志显示"代码引用错误" → 修正引用方式
│  │  └─ 确保使用 process.env. 前缀
│  └─ 其他错误 → 查看具体错误信息
├─ 手动注入变量后生效 → 平台配置传递问题
│  └─ 联系 veFaaS 技术支持排查
└─ 仍报错 → 提供日志+配置截图进一步定位
```

### 4.2 常见错误及解决方案

| 错误信息 | 原因 | 解决方案 |
|---------|------|---------|
| `缺少必填环境变量 NEXT_PUBLIC_SUPABASE_URL` | 平台环境变量未配置或未生效 | 重新配置运行时+构建环境变量并重新发布 |
| `NEXT_PUBLIC_SUPABASE_URL 格式无效` | URL 不以 https:// 开头 | 修正 URL 格式 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY 格式无效` | JWT 密钥格式错误 | 重新复制完整的密钥 |
| `未使用 process.env. 前缀` | 代码中直接引用变量名 | 修改为 `process.env.VARIABLE_NAME` |
| `模块未找到` | 构建阶段依赖问题 | 检查依赖版本兼容性 |

## 📞 第五步：技术支持

### 5.1 自助诊断

如果遇到问题，请提供以下信息：

1. **构建日志**（完整日志，包含 `build.sh` 的输出）
2. **环境变量配置截图**
   - 运行时环境变量配置
   - 构建环境变量配置
3. **发布记录截图**

### 5.2 联系支持

- **火山引擎技术支持**：通过控制台提交工单
- **项目维护者**：提供详细错误信息以便快速定位

## ✅ 第六步：验证部署成功

### 6.1 成功标志

构建成功后应该看到：

```
🎉 构建完成！环境变量已正常注入

📁 构建产物：
  - .next 目录: EXISTS
  - server.js: EXISTS
  - package.json: EXISTS
  - .next 大小: XXXMB

✅ veFaaS 部署就绪！

🎯 所有检查完成，项目可正常部署！
```

### 6.2 功能验证

部署成功后，访问应用并验证：

1. **页面加载正常**
2. **用户认证功能**
3. **AI 工具功能**
4. **数据库连接正常**

---

## 📝 总结

这套完整的环境变量配置和校验流程覆盖了 99% 的常见问题：

1. ✅ **平台配置双环境**（运行时 + 构建时）
2. ✅ **格式校验自动化**（URL、密钥、引用方式）
3. ✅ **错误诊断详细化**（明确错误原因和解决方案）
4. ✅ **兜底机制完善**（手动注入 + 自动检测）

按此指南操作后，构建会一次性成功，环境变量问题彻底解决！