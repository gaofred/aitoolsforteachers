# 腾讯云 Serverless 部署指南

## 🔧 核心问题解决

### 问题根源
腾讯云 Serverless 默认使用 Node.js v12.22.12，而项目使用 **Next.js 15.3.2** 需要 Node.js 18.x 环境，导致语法不兼容错误（如可选链操作符 `?.` 等）。

### ✅ 解决方案
在 Serverless 配置中明确指定 Node.js 18.x 运行时环境。

## 📋 部署前准备

### 1. 安装 Serverless Framework
```bash
npm install -g serverless
```

### 2. 配置腾讯云账号
```bash
# 设置环境变量
export TENCENT_SECRET_ID=your_secret_id
export TENCENT_SECRET_KEY=your_secret_key

# 配置 Serverless 凭证
serverless config credentials --provider tencent --key $TENCENT_SECRET_ID --secret $TENCENT_SECRET_KEY
```

## 🚀 部署步骤

### 方式一：使用自动部署脚本
```bash
# 运行自动部署脚本
./deploy.sh
```

### 方式二：手动部署
```bash
# 1. 清理缓存
rm -rf .next node_modules/.cache

# 2. 安装依赖
npm install

# 3. 构建项目
npm run build

# 4. 部署
serverless deploy --stage prod
```

## ⚙️ 配置文件说明

### serverless.yml 关键配置
```yaml
provider:
  name: tencent
  runtime: Nodejs18.x  # 🎯 关键：指定 Node.js 18.x
  region: ap-beijing
  memorySize: 512
  timeout: 120

functions:
  server:
    handler: server.js
    runtime: Nodejs18.x  # 🎯 明确指定运行时
    memorySize: 1024
    timeout: 120
```

### next.config.js 关键配置
```javascript
const nextConfig = {
  // Serverless 部署配置
  output: 'standalone',

  // 服务器外部包配置（Next.js 15.x）
  serverExternalPackages: ['@supabase/supabase-js'],

  // 静态资源URL配置
  env: {
    STATIC_URL: isProd ? process.env.STATIC_URL : "",
  },
  assetPrefix: isProd ? process.env.STATIC_URL : "",
};
```

## 🔍 版本兼容性验证

### Node.js 版本要求
- **Next.js 15.x**: 需要 Node.js 18.x 或更高
- **Next.js 14.x**: 支持 Node.js 16.x 或更高
- **Next.js 13.x**: 支持 Node.js 16.x 或更高

### 项目当前配置
- **Next.js 版本**: 15.3.2
- **所需 Node.js**: 18.x
- **配置的运行时**: Nodejs18.x ✅

## 📊 部署配置优化

### 性能优化
```yaml
# 函数配置优化
functions:
  server:
    memorySize: 1024  # 生产环境建议1024MB
    timeout: 120      # 超时时间120秒
    runtime: Nodejs18.x
```

### 静态资源处理
- 使用腾讯云 COS 存储静态文件
- 配置 CDN 加速
- 支持自定义域名

## 🐛 常见问题排查

### 1. 构建错误
```bash
# 检查 Next.js 版本兼容性
node --version  # 应该是 v18.x 或更高
npm run build    # 验证本地构建
```

### 2. 部署失败
```bash
# 检查 Serverless 配置
serverless config list

# 查看详细错误日志
serverless deploy --stage prod --verbose
```

### 3. 运行时错误
- 检查 `server.js` 是否存在
- 确认 `output: 'standalone'` 配置正确
- 验证 `serverExternalPackages` 配置

## 📈 监控和维护

### 查看函数日志
1. 登录腾讯云 Serverless 控制台
2. 进入函数服务
3. 查看函数执行日志

### 性能监控
- 监控函数内存使用
- 查看执行时间
- 设置告警阈值

## 🔗 相关链接

- [腾讯云 Serverless 文档](https://cloud.tencent.com/document/product/1154)
- [Next.js 部署文档](https://nextjs.org/docs/deployment)
- [Serverless Framework 文档](https://www.serverless.com/framework/docs)

## 💡 最佳实践

1. **本地测试**: 部署前先本地构建测试
2. **版本锁定**: 在 package.json 中锁定关键依赖版本
3. **环境变量**: 使用环境变量管理不同配置
4. **日志记录**: 添加详细的错误日志
5. **监控告警**: 配置函数监控和告警

---

**注意**: 本配置专门针对 Next.js 15.x 和腾讯云 Serverless 的兼容性问题进行了优化。