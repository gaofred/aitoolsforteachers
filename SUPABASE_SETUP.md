# Supabase Google 登录设置指南

## 📋 前置条件

1. 已拥有Google Cloud账号
2. 已拥有Supabase账号

## 🔧 配置步骤

### 1. 创建Supabase项目

1. 访问 [Supabase Dashboard](https://supabase.com/dashboard)
2. 点击 "New Project" 创建新项目
3. 选择组织，输入项目名称（如：`english-teaching-platform`）
4. 设置数据库密码
5. 选择地区（建议选择离你用户最近的地区）
6. 点击 "Create new project"

### 2. 配置Google OAuth

#### 在Google Cloud Console中：

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建新项目或选择现有项目
3. 启用Google+ API：
   - 转到 "APIs & Services" > "Library"
   - 搜索 "Google+ API" 并启用
4. 配置OAuth同意屏幕：
   - 转到 "APIs & Services" > "OAuth consent screen"
   - 选择 "External" 并创建
   - 填写应用信息：
     - 应用名称：英语AI教学工具
     - 用户支持电子邮件：你的邮箱
     - 开发者联系信息：你的邮箱
   - 添加测试用户（开发阶段）
5. 创建OAuth 2.0客户端ID：
   - 转到 "APIs & Services" > "Credentials"
   - 点击 "Create Credentials" > "OAuth 2.0 Client IDs"
   - 选择 "Web application"
   - 添加授权重定向URI：
     ```
     https://你的项目ID.supabase.co/auth/v1/callback
     ```
   - 复制 **客户端ID** 和 **客户端密钥**

#### 在Supabase中：

1. 转到Supabase项目的 "Authentication" > "Settings"
2. 在 "Site URL" 中输入：`http://localhost:3000`
3. 在 "Redirect URLs" 中添加：
   ```
   http://localhost:3000/api/auth/google
   https://你的域名.com/api/auth/google
   ```
4. 启用Google提供商：
   - 转到 "Authentication" > "Providers"
   - 找到 "Google" 并点击 "Enable"
   - 输入从Google Cloud Console获得的 **客户端ID** 和 **客户端密钥**
   - 点击 "Save"

### 3. 设置数据库表

1. 转到Supabase项目的 "SQL Editor"
2. 复制 `supabase-setup.sql` 文件中的所有SQL代码
3. 粘贴到SQL编辑器中并点击 "Run"

### 4. 获取Supabase配置信息

1. 转到 "Project Settings" > "API"
2. 复制以下信息：
   - **Project URL** (NEXT_PUBLIC_SUPABASE_URL)
   - **anon public** key (NEXT_PUBLIC_SUPABASE_ANON_KEY)
   - **service_role** key (SUPABASE_SERVICE_ROLE_KEY)

### 5. 配置环境变量

在项目根目录创建 `.env.local` 文件：

```bash
# Supabase配置
NEXT_PUBLIC_SUPABASE_URL="https://你的项目ID.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="你的anon密钥"
SUPABASE_SERVICE_ROLE_KEY="你的service_role密钥"

# Google OAuth配置（可选，如果需要在服务端使用）
GOOGLE_CLIENT_ID="你的Google客户端ID"
GOOGLE_CLIENT_SECRET="你的Google客户端密钥"

# 其他配置
NEXTAUTH_URL="http://localhost:3000"
ADMIN_EMAIL="admin@example.com"
```

## 🎯 测试配置

### 1. 启动开发服务器

```bash
npm run dev
```

### 2. 测试Google登录

1. 访问 `http://localhost:3000`
2. 点击 "使用 Google 账号登录" 按钮
3. 选择Google账号并授权
4. 应该自动跳转回主页并显示用户头像

### 3. 验证数据库数据

1. 转到Supabase的 "Table Editor"
2. 检查以下表中是否有数据：
   - `users` 表：应该有新用户记录
   - `user_points` 表：应该有25积分的记录
   - `memberships` 表：应该有FREE会员记录

## 🔍 故障排除

### 常见错误及解决方案：

1. **重定向URI不匹配**
   ```
   错误：redirect_uri_mismatch
   解决：检查Google Cloud Console中的重定向URI是否包含Supabase回调地址
   ```

2. **CORS错误**
   ```
   错误：Access-Control-Allow-Origin
   解决：在Supabase的Authentication设置中添加正确的重定向URL
   ```

3. **数据库权限错误**
   ```
   错误：permission denied for table
   解决：确保运行了supabase-setup.sql中的RLS策略设置
   ```

4. **环境变量未设置**
   ```
   错误：缺少Supabase环境变量
   解决：检查.env.local文件中的配置是否正确
   ```

5. **Google认证失败**
   ```
   错误：auth_failed
   解决：检查Google OAuth配置是否完整，API是否已启用
   ```

## 🚀 生产环境部署

1. **更新重定向URL**：
   - Google Cloud Console：添加生产域名
   - Supabase：添加生产域名

2. **配置域名**：
   - 在Supabase中配置自定义域名
   - 更新环境变量中的URL

3. **安全配置**：
   - 限制Google OAuth同意屏幕的测试用户
   - 启用Supabase的安全日志
   - 定期轮换API密钥

## 📞 获取帮助

如果遇到问题，可以：
1. 检查浏览器控制台错误信息
2. 查看Supabase日志（Authentication > Database Logs）
3. 参考Supabase官方文档：https://supabase.com/docs
4. 检查Google Cloud Console的错误报告