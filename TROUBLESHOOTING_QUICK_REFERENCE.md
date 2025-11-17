# 火山引擎 veFaaS 故障排查快速参考

## 🚨 快速诊断流程

### 1. 构建失败时的第一反应

```
❌ 构建报错
├─ 立即检查 build.sh 输出日志
├─ 找到具体错误类型
└─ 按对应解决方案快速修复
```

## 📋 常见错误及 5 分钟解决方案

### 🔧 环境变量相关问题

#### 错误 1: 缺少环境变量
**症状**: `❌ 错误：缺少必填环境变量 NEXT_PUBLIC_SUPABASE_URL`

**5 分钟解决**:
1. 登录火山引擎 veFaaS 控制台
2. 进入「配置」→「环境变量」
3. 添加缺失的变量（4个都要添加）
4. 选择「函数运行时」作用范围
5. 点击「保存」→「发布管理」→「创建发布」
6. 重新触发构建

#### 错误 2: URL 格式无效
**症状**: `❌ 错误：NEXT_PUBLIC_SUPABASE_URL 格式无效，必须以 https:// 开头`

**5 分钟解决**:
```bash
# ✅ 正确格式
https://beevwnzudplsrseehrgn.supabase.co

# ❌ 错误格式
http://beevwnzudplsrseehrgn.supabase.co  # 缺少 s
beevwnzudplsrseehrgn.supabase.co        # 缺少协议
https://your-project.supabase.co      # 项目名错误
```

#### 错误 3: 密钥格式无效
**症状**: `❌ 错误：NEXT_PUBLIC_SUPABASE_ANON_KEY 格式无效`

**5 分钟解决**:
- 检查密钥是否包含 2 个 `.` 分隔符
- 重新从 Supabase 控制台复制完整密钥
- 确保没有多余的空格或换行

### 🔧 代码引用相关问题

#### 错误 4: 未使用 process.env. 前缀
**症状**: `❌ 错误：xxx 中引用变量但未使用 process.env. 前缀`

**5 分钟解决**:
```javascript
// ❌ 错误引用
const supabaseUrl = NEXT_PUBLIC_SUPABASE_URL;

// ✅ 正确引用
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
```

### 🔧 构建相关问题

#### 错误 5: 依赖安装失败
**症状**: `❌ 依赖安装失败`

**5 分钟解决**:
1. 检查 package.json 格式是否正确
2. 清理缓存：`npm cache clean --force`
3. 删除 node_modules 重新安装
4. 检查 Node.js 版本兼容性

#### 错误 6: TypeScript 编译错误
**症状**: `Failed to compile` + TypeScript 错误

**5 分钟解决**:
1. 检查 tsconfig.json 配置
2. 确保所有 import 路径正确
3. 检查类型定义文件是否存在

## 🛠️ 手动兜底方案（紧急情况）

当平台配置暂时无法生效时，使用手动兜底：

### 步骤 1: 修改 build.sh
```bash
# 在 build.sh 开头找到这部分：
# export NEXT_PUBLIC_SUPABASE_URL="https://beevwnzudplsrseehrgn.supabase.co"
# export NEXT_PUBLIC_SUPABASE_ANON_KEY="..."

# 取消注释并填入真实值：
export NEXT_PUBLIC_SUPABASE_URL="https://beevwnzudplsrseehrgn.supabase.co"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
export ZhipuOfficial="47812fc92da84de3953e8dc565c1b646.X3Muu34yJMODdN2Q"
export OPENAI_API_KEY="sk-your-api-key"
```

### 步骤 2: 重新提交并构建
```bash
git add build.sh
git commit -m "emergency: add manual environment variables"
git push origin main
```

## 📞 寻求技术支持

### 自助诊断清单

在请求支持前，请准备好以下信息：

1. **完整构建日志**
   - 包含 `build.sh` 的完整输出
   - 包含具体的错误信息

2. **环境变量配置截图**
   - 运行时环境变量配置页面
   - 构建环境变量配置页面

3. **项目状态截图**
   - 发布管理页面
   - 函数配置页面

4. **代码检查**
   - 确认 `next.config.js` 没有 `env` 覆盖
   - 确认没有冲突的 `.env` 文件

### 联系方式

- **火山引擎技术支持**: 控制台 → 工单系统
- **项目问题**: 提供 GitHub 仓库链接和详细错误信息

## 🎯 成功验证清单

构建成功后，按此清单验证：

### ✅ 构建验证
- [ ] build.sh 执行无错误
- [ ] 显示 "🎉 构建完成！环境变量已正常注入"
- [ ] .next 目录存在且大小合理
- [ ] server.js 文件存在

### ✅ 功能验证
- [ ] 页面可以正常访问
- [ ] 用户登录功能正常
- [ ] AI 工具可以正常使用
- [ ] 数据库连接正常

### ✅ 性能验证
- [ ] 页面加载速度正常（< 3秒）
- [ ] API 响应时间正常（< 5秒）
- [ ] 内存使用正常（< 1GB）

---

## 📌 快速参考卡片

### 必需环境变量（4个）
```
NEXT_PUBLIC_SUPABASE_URL=https://beevwnzudplsrseehrgn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...（JWT格式）
ZhipuOfficial=478...（含.分隔符）
OPENAI_API_KEY=sk-...（sk-开头）
```

### 正确引用格式
```javascript
process.env.NEXT_PUBLIC_SUPABASE_URL
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
process.env.ZhipuOfficial
process.env.OPENAI_API_KEY
```

### 关键配置文件
- `build.sh` - 增强构建脚本
- `next.config.js` - Next.js 配置
- `.env.fallback` - 兜底环境变量（可选）

---

**💡 记住**: 99% 的问题都是环境变量配置问题，按照本指南操作可以一次性解决！