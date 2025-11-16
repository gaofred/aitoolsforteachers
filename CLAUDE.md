# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个英语AI教学工具平台，为英语教师提供文本分析、语法练习、写作指导、词汇学习等多种教学工具。项目使用现代技术栈构建，采用组件化和模块化设计。

### 核心技术栈

- **框架**: Next.js 15 (App Router) + React 18 + TypeScript
- **样式**: Tailwind CSS + shadcn/ui 组件库
- **构建工具**: Biome (代码格式化和检查) + Turbopack (开发服务器)
- **包管理**: Bun (支持 bunx 命令)
- **数据库**: Supabase (PostgreSQL)
- **AI服务**: OpenAI API

## 常用开发命令

### 开发和构建
```bash
# 启动开发服务器 (使用 Turbopack)
bun dev 或 npm run dev
# 构建生产版本
bun build 或 npm run build
# 启动生产服务器
bun start 或 npm run start
```

### 代码质量检查
```bash
# TypeScript 类型检查 + ESLint
bun lint 或 npm run lint
# 代码格式化
bun format 或 npm run format
```

### 测试
```bash
# 运行 Playwright 测试
bunx playwright test
# 运行特定测试文件
bunx playwright test tests/example.spec.ts
```

## 项目架构

### 目录结构
```
src/
├── app/                    # Next.js App Router 页面
│   ├── globals.css        # 全局样式 (包含 shadcn/ui CSS 变量)
│   ├── layout.tsx         # 根布局 (包含 Geist 字体和 same-runtime)
│   ├── page.tsx           # 主页面 (英语教学工具界面)
│   ├── ClientBody.tsx     # 客户端组件包装器
│   ├── api/               # API 路由 (当前被注释)
│   │   ├── auth/          # 认证相关 API
│   │   └── user/          # 用户管理 API
│   └── auth/              # 认证页面 (当前被注释)
│       ├── signin/        # 登录页面
│       └── signup/        # 注册页面
├── components/
│   ├── ui/                # shadcn/ui 组件库
│   ├── auth/              # 认证相关组件
│   └── providers/         # Context 提供者
├── lib/
│   ├── utils.ts           # 样式工具函数 (cn 函数)
│   ├── supabase.ts        # Supabase 客户端
│   ├── user-context.tsx   # 用户状态管理
│   └── *.ts               # 各种业务服务模块
├── types/                 # TypeScript 类型定义
│   ├── index.ts           # 核心业务类型
│   └── database.ts        # 数据库类型
└── auth/                  # 认证配置 (当前被注释)
```

### 核心功能模块

#### 用户系统与认证
- **用户管理**: 基于邮箱密码的注册登录系统 (NextAuth 配置当前被注释)
- **角色系统**: USER/ADMIN 角色权限控制
- **会员等级**: FREE/PREMIUM/PRO 三级会员制度
- **积分系统**: 用户点数消耗、充值、交易记录
- **邀请系统**: 用户邀请奖励机制
- **每日签到**: 自动登录奖励系统

#### AI教学工具分类
主页面包含以下教学工具类别：

1. **阅读教学工具**:
   - 所学词汇编排成阅读理解题
   - 课文文章分析
   - 外刊文章改编为CD篇
   - CD篇命题
   - 阅读理解深度分析
   - 语法填空解析
   - 阅读理解解析
   - 完形填空解析

2. **词汇学习工具**:
   - 单元词汇梳理及配套练习生成
   - BCD篇阅读重点词汇整理
   - 七选五重点词汇整理
   - 完形填空重点词汇整理

3. **语法练习工具**:
   - 多句语法填空
   - 语法填空生成器
   - 语法错误校正
   - 语法填空命题

4. **写作教学工具**:
   - 应用文范文写作
   - 读后续写
   - 应用文写作

5. **AI图片生成工具**:
   - AI生成故事组图

#### 数据存储与对话
- **Supabase数据库**: 用户、积分、会员、AI生成记录、对话、邀请等完整业务模型
- **AI生成记录**: 存储每次AI工具的使用记录、输入输出数据
- **对话系统**: 支持与AI进行多轮对话调整结果

### 技术特点

#### 样式系统
- 使用 **shadcn/ui** 组件库，基于 Radix UI 原语
- **Tailwind CSS** 配置了自定义主题变量，支持暗色模式
- CSS 变量定义在 `globals.css` 中，包含完整的色彩系统
- 使用 Inter 字体作为主要字体，JetBrains Mono 作为等宽字体

#### 响应式设计
- 移动优先的设计理念
- 侧边栏在移动端以覆盖层形式显示
- 使用 Tailwind 的响应式断点 (sm/md/lg/xl)

#### 状态管理
- 使用 React Context API 管理全局用户状态
- 本地组件状态使用 useState hooks
- 包含用户点数系统、工具选择、分析状态等

#### 数据库系统
- **Supabase**: 提供完整的后端服务，包括数据库、认证、存储
- **数据库模型**: 用户、积分、会员、AI生成记录、对话、邀请码等完整业务模型
- **实时功能**: 支持 Supabase 实时订阅和更新

## 开发注意事项

### 代码风格
- 使用 Biome 进行代码格式化，配置文件：`biome.json`
- JavaScript 使用双引号
- 启用了 organizeImports 自动整理导入
- 关闭了部分 a11y 检查规则以适应当前开发阶段

### 组件开发
- 优先使用 shadcn/ui 组件
- 遵循现有的命名约定和文件结构
- 使用 TypeScript 严格模式
- 组件文件使用 `.tsx` 扩展名
- 大部分组件是客户端组件 ("use client")

### 构建和环境
- 项目配置为监听所有网络接口 (`-H 0.0.0.0`)
- 开发环境使用 Turbopack 提升构建速度
- 支持 TypeScript 增量编译
- 构建时忽略 TypeScript 和 ESLint 错误（用于快速部署）

### 认证系统状态
- **当前状态**: NextAuth.js 配置被临时注释，存在版本兼容性问题
- **影响范围**: 用户注册登录功能暂时不可用
- **数据库准备**: Supabase 数据库表结构已就绪
- **替代方案**: 当前使用自定义用户状态管理

### 安全配置
- **CSP headers**: 在 next.config.js 中配置了内容安全策略
- **图片域名**: 配置了允许的外部图片域名
- **环境变量**: 需要配置 Supabase 和 OpenAI 相关环境变量

## 功能扩展指南

### 添加新教学工具
1. 在 `page.tsx` 的 `navigationData` 中添加新工具
2. 更新相应的点数消耗和处理逻辑
3. 在 `handleAnalyze` 函数中添加工具特定的处理逻辑
4. 创建对应的工具页面路由

### 数据库模型扩展
1. 在 Supabase 中定义新表或修改现有表结构
2. 更新 `types/database.ts` 中的类型定义
3. 如需要，添加相应的业务服务模块

### 用户系统开发
1. 修复 `src/auth/` 中的 NextAuth 配置
2. 启用认证相关的 API 路由
3. 实现用户注册、登录、权限验证功能
4. 连接现有的积分和会员系统

### 样式定制
- CSS 变量在 `globals.css` 中定义
- Tailwind 主题在 `tailwind.config.ts` 中配置
- 遵循 shadcn/ui 的设计系统规范

### 性能优化
- 使用 React.memo 优化组件重渲染
- 利用 Next.js 的动态导入功能
- 图片使用 next/image 组件 (已配置 unoptimized: true)
- Supabase 查询优化和连接管理