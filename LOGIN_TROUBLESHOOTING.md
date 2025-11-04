# 登录问题故障排除指南

## 📋 问题描述

用户使用邮箱登录后，界面仍然显示登录按钮而不是用户信息。

## 🔍 问题分析

这个问题通常由以下几个原因造成：

1. **缺少邮箱登录API路由**
2. **用户状态检查逻辑问题**
3. **Cookie设置问题**
4. **数据库用户记录缺失**

## 🛠️ 解决方案

### 1. 已修复的问题

✅ **创建了邮箱登录API路由** (`src/app/api/auth/signin/route.ts`)
✅ **修复了用户信息获取API** (`src/app/api/auth/user/route.ts`)
✅ **更新了用户状态检查逻辑** (`src/app/page.tsx`)
✅ **改进了登录成功后的重定向处理**

### 2. 检查步骤

#### 步骤1: 验证API路由

确保以下API路由存在：
- `/api/auth/signin` - 邮箱登录
- `/api/auth/user` - 获取用户信息
- `/api/auth/callback` - OAuth回调处理

#### 步骤2: 检查环境变量

确保 `.env.local` 文件包含正确的Supabase配置：

```bash
NEXT_PUBLIC_SUPABASE_URL="https://你的项目ID.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="你的anon密钥"
SUPABASE_SERVICE_ROLE_KEY="你的service_role密钥"
```

#### 步骤3: 检查数据库设置

确保数据库表已正确创建：

```sql
-- 检查用户表是否存在
SELECT * FROM users LIMIT 1;

-- 检查用户点数表是否存在
SELECT * FROM user_points LIMIT 1;

-- 检查会员表是否存在
SELECT * FROM memberships LIMIT 1;
```

### 3. 调试步骤

#### 调试1: 检查浏览器控制台

1. 打开浏览器开发者工具 (F12)
2. 查看Console标签页
3. 尝试登录，查看是否有错误信息

#### 调试2: 检查网络请求

1. 打开浏览器开发者工具 (F12)
2. 查看Network标签页
3. 尝试登录，检查API请求是否成功

#### 调试3: 检查Cookie

1. 登录后，在浏览器开发者工具中查看Application标签页
2. 检查是否有 `sb-access-token` 和 `sb-refresh-token` cookie

### 4. 常见错误及解决方案

#### 错误1: "未认证" 错误

```
错误: { error: '未认证' }
```

**解决方案:**
- 检查Cookie是否正确设置
- 验证Supabase配置是否正确

#### 错误2: "无效的认证令牌" 错误

```
错误: { error: '无效的认证令牌' }
```

**解决方案:**
- 检查access token是否有效
- 验证用户是否已确认邮箱

#### 错误3: "获取用户信息失败" 错误

```
错误: { error: '获取用户信息失败' }
```

**解决方案:**
- 检查数据库触发器是否正确创建
- 验证用户记录是否存在于users表中

### 5. 测试命令

#### 测试邮箱登录功能

```bash
npm run test:email-login
```

#### 测试数据库连接

```bash
npm run db:test
```

#### 初始化数据库

```bash
npm run supabase:init
```

### 6. 手动测试步骤

#### 步骤1: 注册测试用户

1. 访问 `/auth/signup` 页面
2. 使用邮箱和密码注册新用户
3. 检查邮箱确认链接

#### 步骤2: 测试登录

1. 访问 `/auth/signin` 页面
2. 使用注册的邮箱和密码登录
3. 检查是否重定向到主页
4. 检查是否显示用户信息

#### 步骤3: 验证用户状态

1. 登录后，打开浏览器开发者工具
2. 查看Console输出，应该看到 "用户登录成功" 信息
3. 检查用户菜单是否显示

### 7. 数据库修复

如果用户记录缺失，可以手动创建：

```sql
-- 为现有auth.users创建用户记录
INSERT INTO users (id, email, name, provider)
SELECT 
    id,
    email,
    COALESCE(raw_user_meta_data->>'full_name', email),
    COALESCE(app_metadata->>'provider', 'email')
FROM auth.users
WHERE id NOT IN (SELECT id FROM users);

-- 创建用户点数记录
INSERT INTO user_points (user_id, points)
SELECT id, 25
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_points);

-- 创建会员记录
INSERT INTO memberships (user_id, membership_type)
SELECT id, 'FREE'
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM memberships);
```

### 8. 完整重置方案

如果问题持续存在，可以尝试完整重置：

1. **清理浏览器数据**
   - 清除所有Cookie和本地存储
   - 重新访问网站

2. **重新初始化数据库**
   ```bash
   npm run supabase:upgrade
   ```

3. **重新启动开发服务器**
   ```bash
   npm run dev
   ```

## 📞 获取帮助

如果问题仍然存在：

1. 检查Supabase Dashboard的错误日志
2. 查看浏览器控制台的详细错误信息
3. 验证所有API路由是否正确部署
4. 确认数据库表结构是否正确

## ✅ 预期结果

修复后，用户登录应该：

1. ✅ 成功重定向到主页
2. ✅ 显示用户头像和菜单
3. ✅ 显示正确的点数余额
4. ✅ 可以正常使用所有功能

登录成功后，界面应该显示用户菜单而不是登录按钮。






















