# 云雾API配置指南

## 📋 概述

本文档说明如何在项目中配置云雾API的两个Key，用于AI功能调用。

## 🔑 API Keys

### 1. 通用API Key
```
CLOUDMIST_API_KEY=sk-Q03GKbqYjH3GNWSybVBGFp2aN5X7RKyFQZgkCMsdIuOy6zgU
```

### 2. 谷歌模型专用API Key
```
CLOUDMIST_GOOGLE_API_KEY=sk-cN5DSZ2RmjlYRbv7BG7db1GnTYO1tr30UtmgzELMKkKUUQII
```

## 🚀 配置步骤

### 1. 创建环境配置文件

在项目根目录创建 `.env.local` 文件，并添加以下内容：

```bash
# 云雾API配置
# 通用API Key
CLOUDMIST_API_KEY=sk-Q03GKbqYjH3GNWSybVBGFp2aN5X7RKyFQZgkCMsdIuOy6zgU

# 谷歌模型专用API Key
CLOUDMIST_GOOGLE_API_KEY=sk-cN5DSZ2RmjlYRbv7BG7db1GnTYO1tr30UtmgzELMKkKUUQII

# 火山引擎API Key
VOLCENGINE_API_KEY=1c4be881-b555-445c-8b33-94f843a3de94

# Supabase配置 (如果还没有的话)
# NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
# SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# NextAuth配置 (如果还没有的话)
# NEXTAUTH_URL=http://localhost:3000
# NEXTAUTH_SECRET=your_nextauth_secret
```

### 2. 验证配置

创建API路由来测试配置是否正确：

```typescript
// src/app/api/test-cloudmist/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const generalKey = process.env.CLOUDMIST_API_KEY;
  const googleKey = process.env.CLOUDMIST_GOOGLE_API_KEY;

  return NextResponse.json({
    hasGeneralKey: !!generalKey,
    hasGoogleKey: !!googleKey,
    generalKeyPreview: generalKey ? `${generalKey.substring(0, 10)}...` : 'Not set',
    googleKeyPreview: googleKey ? `${googleKey.substring(0, 10)}...` : 'Not set'
  });
}
```

## 🔧 使用方法

### 在API路由中使用

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // 获取通用API Key
  const apiKey = process.env.CLOUDMIST_API_KEY;
  
  // 获取谷歌模型专用API Key
  const googleApiKey = process.env.CLOUDMIST_GOOGLE_API_KEY;
  
  if (!apiKey) {
    return NextResponse.json({ error: 'API Key not configured' }, { status: 500 });
  }

  // 使用API Key调用云雾API
  const response = await fetch('https://api.cloudmist.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'user', content: 'Hello, world!' }
      ]
    })
  });

  const data = await response.json();
  return NextResponse.json(data);
}
```

### 在客户端组件中使用

```typescript
'use client';

export default function CloudMistComponent() {
  const callAPI = async () => {
    const response = await fetch('/api/cloudmist-chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Hello from client!'
      })
    });
    
    const data = await response.json();
    console.log(data);
  };

  return (
    <button onClick={callAPI}>
      调用云雾API
    </button>
  );
}
```

## 📝 注意事项

1. **安全性**：
   - 永远不要在客户端代码中直接使用API Key
   - 始终通过服务器端API路由调用云雾API
   - 将API Key存储在环境变量中，不要提交到版本控制

2. **API Key管理**：
   - 通用Key适用于大多数AI模型
   - 谷歌模型专用Key专门用于Google的AI模型
   - 根据具体需求选择合适的Key

3. **错误处理**：
   - 始终检查API Key是否存在
   - 处理API调用失败的情况
   - 记录错误日志便于调试

## 🧪 测试配置

访问 `/api/test-cloudmist` 端点来验证配置是否正确：

```bash
curl http://localhost:3000/api/test-cloudmist
```

预期响应：
```json
{
  "hasGeneralKey": true,
  "hasGoogleKey": true,
  "generalKeyPreview": "sk-Q03GKbq...",
  "googleKeyPreview": "sk-cN5DSZ2..."
}
```

## 🔄 部署配置

在部署到生产环境时，确保在部署平台（如Vercel、Netlify等）的环境变量设置中添加这些配置：

- `CLOUDMIST_API_KEY`
- `CLOUDMIST_GOOGLE_API_KEY`

配置完成后，重启应用以加载新的环境变量。
