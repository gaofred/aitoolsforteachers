# Supabase数据库设置指南

## 📋 概述

本指南将帮助您在Supabase中设置完整的数据库架构，包括用户管理、点数系统、AI工具配置等功能。

## 🚀 快速开始

### 1. 创建Supabase项目

1. 访问 [Supabase Dashboard](https://supabase.com/dashboard)
2. 点击 "New Project" 创建新项目
3. 选择组织，输入项目名称（如：`english-teaching-platform`）
4. 设置数据库密码
5. 选择地区（建议选择离您用户最近的地区）
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
   http://localhost:3000/api/auth/callback
   https://你的域名.com/api/auth/callback
   ```
4. 启用Google提供商：
   - 转到 "Authentication" > "Providers"
   - 找到 "Google" 并点击 "Enable"
   - 输入从Google Cloud Console获得的 **客户端ID** 和 **客户端密钥**
   - 点击 "Save"

### 3. 获取项目配置信息

在项目设置中获取以下信息：
- **Project URL** (NEXT_PUBLIC_SUPABASE_URL)
- **anon public** key (NEXT_PUBLIC_SUPABASE_ANON_KEY)
- **service_role** key (SUPABASE_SERVICE_ROLE_KEY)

### 4. 配置环境变量

在项目根目录创建 `.env.local` 文件：

```bash
# Supabase配置
NEXT_PUBLIC_SUPABASE_URL="https://你的项目ID.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="你的anon密钥"
SUPABASE_SERVICE_ROLE_KEY="你的service_role密钥"

# 其他配置
NEXTAUTH_URL="http://localhost:3000"
ADMIN_EMAIL="admin@example.com"
```

## 🗄️ 数据库架构设置

### 5. 创建数据库表

在Supabase SQL编辑器中执行以下SQL：

```sql
-- 1. 创建用户表
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    name TEXT,
    email_verified TIMESTAMP,
    image TEXT,
    avatar_url TEXT,
    provider TEXT DEFAULT 'email',
    role TEXT DEFAULT 'USER',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. 创建用户点数表
CREATE TABLE user_points (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT UNIQUE NOT NULL,
    points INTEGER DEFAULT 25,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. 创建会员表
CREATE TABLE memberships (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT UNIQUE NOT NULL,
    membership_type TEXT DEFAULT 'FREE',
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. 创建AI生成记录表
CREATE TABLE ai_generations (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL,
    tool_type TEXT NOT NULL,
    tool_name TEXT NOT NULL,
    input_data JSONB NOT NULL,
    output_data JSONB NOT NULL,
    final_output JSONB,
    model_type TEXT DEFAULT 'STANDARD',
    tokens_used INTEGER DEFAULT 0,
    points_cost INTEGER DEFAULT 0,
    status TEXT DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. 创建对话表
CREATE TABLE conversations (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL,
    generation_id TEXT UNIQUE,
    messages JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. 创建兑换码表
CREATE TABLE redemption_codes (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    code TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL,
    value INTEGER NOT NULL,
    description TEXT,
    expires_at TIMESTAMP,
    is_used BOOLEAN DEFAULT false,
    used_by TEXT,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. 创建点数交易记录表
CREATE TABLE point_transactions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    amount INTEGER NOT NULL,
    description TEXT NOT NULL,
    related_id TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. 创建AI工具配置表
CREATE TABLE ai_tool_configs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tool_type TEXT UNIQUE NOT NULL,
    tool_name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    standard_cost INTEGER NOT NULL,
    pro_cost INTEGER,
    is_pro_only BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. 创建数据库函数

执行 `supabase-functions.sql` 文件中的所有SQL函数：

```bash
# 在Supabase SQL编辑器中执行
# 文件位置：supabase-functions.sql
```

主要函数包括：
- `deduct_user_points()` - 扣除用户点数
- `add_user_points()` - 增加用户点数
- `use_ai_tool()` - 使用AI工具
- `redeem_code()` - 兑换兑换码

### 3. 创建触发器

数据库函数文件还包含了以下触发器：
- 新用户注册时自动创建点数记录
- 新用户注册时自动创建会员记录

### 4. 设置行级安全策略 (RLS)

所有表都已启用RLS，确保用户只能访问自己的数据。

## 🔧 初始化数据

### 1. 运行初始化脚本

```bash
# 初始化AI工具配置和兑换码
npm run supabase:init
```

### 2. 手动验证

在Supabase Dashboard中检查以下表是否有数据：
- `ai_tool_configs` - 应该有18个AI工具配置
- `redemption_codes` - 应该有4个示例兑换码

## 🎯 功能测试

### 1. 用户注册和登录

1. 启动开发服务器：`npm run dev`
2. 访问 `http://localhost:3000`
3. 测试Google登录功能
4. 验证用户数据是否正确创建

### 2. 点数系统测试

1. 测试兑换码功能：
   - 使用兑换码：`WELCOME50`
   - 使用兑换码：`PRO30`
   - 检查点数是否正确增加

2. 测试AI工具使用：
   - 使用任意AI工具
   - 检查点数是否正确扣除
   - 检查交易记录是否正确创建

### 3. 点数记录页面

1. 访问 `/points-history` 页面
2. 检查交易记录是否正确显示
3. 测试筛选和搜索功能

## 🔍 故障排除

### 常见问题及解决方案

#### 1. 环境变量未设置
```
错误：缺少Supabase环境变量
解决：检查.env.local文件中的配置
```

#### 2. 数据库函数不存在
```
错误：function does not exist
解决：确保在Supabase SQL编辑器中执行了所有函数
```

#### 3. RLS策略问题
```
错误：permission denied
解决：检查RLS策略是否正确设置
```

#### 4. 触发器未工作
```
错误：新用户没有自动创建点数记录
解决：检查触发器是否正确创建
```

## 📊 数据库监控

### 1. 使用Supabase Dashboard

- 监控数据库性能
- 查看实时日志
- 管理用户数据

### 2. 使用SQL查询

```sql
-- 查看用户统计
SELECT * FROM user_stats WHERE user_id = 'your-user-id';

-- 查看交易记录
SELECT * FROM point_transactions 
WHERE user_id = 'your-user-id' 
ORDER BY created_at DESC 
LIMIT 10;

-- 查看AI工具使用情况
SELECT tool_name, COUNT(*) as usage_count
FROM ai_generations 
GROUP BY tool_name 
ORDER BY usage_count DESC;
```

## 🚀 生产环境部署

### 1. 环境变量配置

确保生产环境中的环境变量正确配置：
- Supabase URL和密钥
- 数据库连接字符串
- 其他必要的配置

### 2. 数据库备份

- 设置自动备份
- 定期测试备份恢复
- 监控数据库性能

### 3. 安全配置

- 定期轮换API密钥
- 监控异常访问
- 设置访问限制

## 📞 获取帮助

如果遇到问题，可以：

1. 检查Supabase Dashboard的错误日志
2. 查看浏览器控制台的错误信息
3. 参考Supabase官方文档
4. 检查数据库函数和触发器是否正确创建

## 🎉 完成

完成以上步骤后，您的Supabase数据库就完全配置好了，可以支持完整的点数管理、AI工具使用、会员功能等所有特性！
