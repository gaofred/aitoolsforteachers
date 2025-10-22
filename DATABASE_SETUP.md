# 数据库配置指南

## 📋 前置条件

1. 已购买阿里云RDS PostgreSQL实例
2. 已创建数据库和账号
3. 已配置白名单允许访问

## 🔧 配置步骤

### 1. 更新环境变量

编辑 `.env.local` 文件，替换以下信息：

```bash
# 数据库配置
DATABASE_URL="postgresql://english_admin:YOUR_PASSWORD@YOUR_HOSTNAME:5432/english_teaching_db?sslmode=require"

# 替换示例：
# DATABASE_URL="postgresql://english_admin:myStrongPassword123@rm-bp1xxxxxxxx.pg.rds.aliyuncs.com:5432/english_teaching_db?sslmode=require"
```

### 2. 安装依赖

```bash
npm install
```

### 3. 生成Prisma客户端

```bash
npm run postinstall
# 或者直接运行
npx prisma generate
```

### 4. 测试数据库连接

```bash
npm run db:test
```

如果连接成功，你应该看到类似输出：
```
✅ 数据库连接成功！
📊 PostgreSQL版本: [{ version: 'PostgreSQL 14.x.x' }]
📋 当前数据库表: [] (空数组，因为还没有创建表)
```

### 5. 推送数据库架构（推荐用于开发）

```bash
npm run db:push
```

这将直接将 `prisma/schema.prisma` 中定义的表结构推送到数据库。

### 6. 或者使用数据库迁移（推荐用于生产）

```bash
# 创建迁移文件
npx prisma migrate dev --name init

# 应用迁移
npx prisma migrate deploy
```

### 7. 运行种子数据

```bash
npm run db:seed
```

这将创建管理员账号和示例兑换码。

## 🎯 验证配置

### 检查数据库表

使用Prisma Studio查看数据库：

```bash
npm run db:studio
```

这会在浏览器中打开数据库管理界面，你可以查看所有表和数据。

### 登录管理员账号

种子数据执行后，可以使用以下信息登录：

- 邮箱：你设置的管理员邮箱（环境变量中的 ADMIN_EMAIL）
- 密码：admin123

## 🔍 故障排除

### 常见错误及解决方案：

1. **连接超时**
   ```
   错误：connect ETIMEDOUT
   解决：检查白名单设置，确保你的IP已添加
   ```

2. **认证失败**
   ```
   错误：password authentication failed
   解决：检查用户名和密码是否正确
   ```

3. **SSL错误**
   ```
   错误：SSL connection failed
   解决：确保连接字符串包含 ?sslmode=require
   ```

4. **数据库不存在**
   ```
   错误：database "english_teaching_db" does not exist
   解决：在阿里云控制台创建数据库
   ```

## 🚀 生产环境注意事项

1. **安全配置**
   - 使用强密码
   - 限制白名单IP
   - 启用SSL连接

2. **性能优化**
   - 选择合适的实例规格
   - 定期备份数据库
   - 监控数据库性能

3. **备份策略**
   - 设置自动备份
   - 定期测试备份恢复
   - 保留备份历史记录

## 📞 获取帮助

如果遇到问题，可以：

1. 检查阿里云RDS控制台的错误日志
2. 运行 `npm run db:test` 测试连接
3. 查看 Prisma 日志输出
4. 检查网络连接和防火墙设置