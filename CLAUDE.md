# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个英语AI教学工具平台，为英语教师提供文本分析、语法练习、写作指导等多种教学工具。项目使用现代技术栈构建，采用组件化和模块化设计。

### 核心技术栈

- **框架**: Next.js 15 (App Router) + React 18 + TypeScript
- **样式**: Tailwind CSS + shadcn/ui 组件库
- **构建工具**: Biome (代码格式化和检查) + Turbopack (开发服务器)
- **包管理**: Bun (支持 bunx 命令)

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

### 数据库管理
```bash
# 数据库连接测试
bun db:test 或 npm run db:test
# 推送数据库架构 (开发环境)
bun db:push 或 npm run db:push
# 数据库迁移 (生产环境)
bun db:migrate 或 npm run db:migrate
# 打开数据库管理界面
bun db:studio 或 npm run db:studio
# 运行种子数据
bun db:seed 或 npm run db:seed
# 初始化数据库 (测试+推送+种子)
bun db:setup 或 npm run db:setup
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
│   ├── api/               # API 路由
│   │   ├── auth/          # 认证相关 API
│   │   └── user/          # 用户管理 API
│   └── auth/              # 认证页面
│       ├── signin/        # 登录页面
│       └── signup/        # 注册页面
├── components/
│   ├── ui/                # shadcn/ui 组件库
│   └── providers/         # Context 提供者
├── lib/
│   ├── utils.ts           # 样式工具函数 (cn 函数)
│   └── prisma.ts          # Prisma 客户端实例
├── types/                 # TypeScript 类型定义
│   ├── index.ts           # 核心业务类型
│   └── next-auth.d.ts     # NextAuth 类型扩展
├── auth/
│   └── config.ts          # 认证配置 (当前被注释)
├── prisma/
│   ├── schema.prisma      # 数据库模型定义
│   └── seed.ts            # 种子数据脚本
└── scripts/
    ├── test-db-connection.ts  # 数据库连接测试
    └── init-database.ts       # 数据库初始化
```

### 核心功能模块

#### 用户系统与认证
- **用户管理**: 支持邮箱密码注册登录，基于 NextAuth.js (当前被注释待修复)
- **角色系统**: USER/ADMIN 角色权限控制
- **会员等级**: FREE/PREMIUM/PRO 三级会员制度
- **积分系统**: 用户点数消耗、充值、交易记录

#### AI教学工具
主页面包含以下教学工具类别：
1. **阅读教学工具**: 文本分析、CD篇命题、结构分析、完形填空
2. **语法练习工具**: 语法填空、生成器、命题工具
3. **写作教学工具**: 应用文范文、学案、读后续写
4. **翻译与多媒体工具**: 听力生成、英汉互译
5. **词汇学习工具**: 词汇练习、分析工具

#### 数据存储与对话
- **AI生成记录**: 存储每次AI工具的使用记录、输入输出数据
- **对话系统**: 支持与AI进行多轮对话调整结果
- **兑换码系统**: 支持会员天数和积分兑换码

### 技术特点

#### 样式系统
- 使用 **shadcn/ui** 组件库，基于 Radix UI 原语
- **Tailwind CSS** 配置了自定义主题变量，支持暗色模式
- CSS 变量定义在 `globals.css` 中，包含完整的色彩系统

#### 响应式设计
- 移动优先的设计理念
- 侧边栏在移动端以覆盖层形式显示
- 使用 Tailwind 的响应式断点 (sm/md/lg/xl)

#### 状态管理
- 使用 React hooks (useState) 管理本地状态
- 包含用户点数系统、工具选择、分析状态等

#### 数据库系统
- **Prisma ORM**: 使用 PostgreSQL 数据库，支持类型安全的数据库操作
- **数据库模型**: 用户、积分、会员、AI生成记录、对话、兑换码等完整业务模型
- **种子数据**: 自动创建管理员账号和示例兑换码
- **连接管理**: 支持连接池和SSL连接

#### 特殊配置
- **same-runtime**: 集成在 layout.tsx 中，提供额外功能
- **图片配置**: next.config.js 中配置了多个图片域名
- **TypeScript**: 使用路径别名 `@/*` 指向 `./src/*`
- **认证系统**: NextAuth.js 配置当前被注释 (存在版本兼容性问题待修复)

## 开发注意事项

### 代码风格
- 使用 Biome 进行代码格式化，配置文件：`biome.json`
- JavaScript 使用双引号
- 启用了 organizeImports 自动整理导入
- 关闭了部分 a11y 检查规则

### 组件开发
- 优先使用 shadcn/ui 组件
- 遵循现有的命名约定和文件结构
- 使用 TypeScript 严格模式
- 组件文件使用 `.tsx` 扩展名

### 构建和环境
- 项目配置为监听所有网络接口 (`0.0.0.0`)
- 开发环境使用 Turbopack 提升构建速度
- 支持 TypeScript 增量编译

### 数据库开发
- **环境变量**: 需要配置 `DATABASE_URL` 等数据库连接信息
- **开发流程**: 使用 `db:setup` 命令一键初始化数据库
- **架构变更**: 开发环境使用 `db:push`，生产环境使用 `db:migrate`
- **数据管理**: 通过 Prisma Studio 可视化管理数据库

### 认证系统状态
- **当前状态**: NextAuth.js 配置被临时注释，存在版本兼容性问题
- **影响范围**: 用户注册登录功能暂时不可用
- **数据库准备**: 用户模型和认证相关表结构已就绪
- **修复计划**: 需要解决 NextAuth 5.0 beta 版本兼容性问题

## 功能扩展指南

### 添加新教学工具
1. 在 `page.tsx` 的 `navigationData` 中添加新工具
2. 更新相应的点数消耗和处理逻辑
3. 在 `handleAnalyze` 函数中添加工具特定的处理逻辑

### 数据库模型扩展
1. 在 `prisma/schema.prisma` 中定义新模型
2. 使用 `bun db:push` 更新数据库架构
3. 更新 `types/index.ts` 中的类型定义
4. 如需要，添加相应的种子数据

### 用户系统开发
1. 修复 `src/auth/config.ts` 中的 NextAuth 配置
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
- 数据库查询优化和连接池管理