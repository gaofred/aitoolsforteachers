# Serverless部署问题修复指南

## 🔍 当前部署错误分析

### 错误信息
```
"step-step-c1" exited with code 1
镜像: enterprise-admin-cn-beijing.cr.volces.com/vefaas-base-images/vefaas.base.build-node20.v1
```

### 🎯 可能的问题原因
1. **内存不足**: Node.js 20.x 构建需要更多内存
2. **依赖冲突**: 某些包与Node.js 20.x不兼容
3. **构建超时**: 构建时间超过容器限制
4. **权限问题**: 文件权限或用户权限问题

## 🔧 解决方案

### 方案1: 增加构建内存限制
在部署配置中增加内存限制：
```yaml
functions:
  server:
    memorySize: 2048  # 增加到2GB
    timeout: 300     # 增加到5分钟
```

### 方案2: 优化Next.js配置
更新 `next.config.js`:
```javascript
const nextConfig = {
  // Serverless 部署配置
  output: 'standalone',

  // 减少内存使用
  swcMinify: true,

  // 优化构建
  compiler: {
    removeConsole: {
      exclude: ['error', 'warn'],
    },
  },

  // 服务器外部包配置
  serverExternalPackages: ['@supabase/supabase-js'],

  // 静态资源配置
  env: {
    STATIC_URL: isProd ? process.env.STATIC_URL : "",
  },
  assetPrefix: isProd ? process.env.STATIC_URL : "",
};
```

### 方案3: 使用优化的Dockerfile
已创建 `Dockerfile.serverless`，特点：
- 使用Node.js 20-alpine基础镜像
- 多阶段构建优化
- 内存优化配置
- 非root用户运行

### 方案4: 调整package.json依赖
移除或更新可能有问题的依赖：
```json
{
  "dependencies": {
    // 确保所有依赖都与Node.js 20.x兼容
  }
}
```

## 🚀 重新部署步骤

### 1. 清理和重建
```bash
# 清理构建缓存
rm -rf .next node_modules

# 使用Node.js 20环境
nvm use 20
node --version

# 重新安装依赖
npm install

# 使用优化构建脚本
./build-for-serverless.sh
```

### 2. 更新部署配置
更新 `serverless.yml`：
```yaml
provider:
  name: tencent
  runtime: Nodejs18.x  # 保持Node.js 18.x以确保稳定性
  memorySize: 1024
  timeout: 180

functions:
  server:
    handler: server.js
    runtime: Nodejs18.x
    memorySize: 2048  # 增加内存
    timeout: 300      # 增加超时时间
```

### 3. 使用Docker部署
```bash
# 构建Docker镜像
docker build -f Dockerfile.serverless -t vefaas-nextjs-app .

# 测试运行
docker run -p 3000:3000 vefaas-nextjs-app
```

## 🔍 调试命令

### 查看构建日志
```bash
# 腾讯云Serverless
serverless logs -f

# Kubernetes
kubectl logs <pod-name> -c step-step-c1 --tail=100

# Docker
docker logs <container-id>
```

### 本地测试
```bash
# 测试构建
npm run build

# 测试启动
npm start

# 检查内存使用
node --inspect --max-old-space-size=4096 server.js
```

## 📊 性能优化建议

### 1. 减少依赖
```bash
# 移除开发依赖
npm prune --production

# 分析包大小
npm install -g webpack-bundle-analyzer
npx webpack-bundle-analyzer .next
```

### 2. 优化代码
- 移除未使用的代码和依赖
- 使用代码分割
- 启用压缩和缓存

### 3. 环境变量优化
```bash
export NODE_OPTIONS="--max-old-space-size=4096"
export NODE_ENV=production
```

## 🆘 紧急修复方案

如果持续失败，尝试：

1. **降级Next.js版本**:
   ```bash
   npm install next@14.2.13
   ```

2. **简化配置**:
   ```javascript
   const nextConfig = {
     output: 'standalone',
     swcMinify: true,
   };
   ```

3. **最小化部署**:
   - 移除不必要的功能
   - 简化依赖树
   - 基础部署配置

## 📞 联系支持

如果问题持续存在：
1. 检查腾讯云Serverless文档
2. 联系技术支持
3. 查看容器运行时限制