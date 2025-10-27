# 邀请系统生产环境部署指南

## 已完成的修改

### ✅ 数据库配置修改
- **文件**: `invitation-system-database.sql`
- **修改**: 数据库函数 `create_invitation_code` 现在直接使用生产环境URL
- **新URL**: `https://aitoolsforteachers.net/invite/redirect?invite_code={code}`

### ✅ API路由修改
- **文件**: `src/app/api/invite/route.ts`
- **修改**: 移除环境变量判断，直接使用生产环境域名
- **新URL**: `https://aitoolsforteachers.net/invite/redirect?invite_code={code}`

### ✅ 数据库更新脚本
- **文件**: `scripts/update-invite-urls.sql`
- **功能**: 更新现有邀请码URL指向生产环境

## 部署步骤

### 1. 构建项目
```bash
npm run build
# 或
bun build
```

### 2. 部署到生产环境
将构建后的文件部署到 `aitoolsforteachers.net`

### 3. 数据库更新
在生产环境数据库中执行以下SQL脚本：

```sql
-- 更新现有邀请码的URL，适配生产环境
UPDATE invitation_codes
SET invite_url = REPLACE(invite_url, 'http://localhost:', 'https://aitoolsforteachers.net')
WHERE invite_url LIKE '%localhost:%';

-- 也可以直接设置为生产环境URL
UPDATE invitation_codes
SET invite_url = 'https://aitoolsforteachers.net/invite/redirect?invite_code=' || code
WHERE invite_url NOT LIKE 'https://aitoolsforteachers.net/%';
```

或者直接执行：
```bash
# 如果你有数据库连接工具
psql -d your_database -f scripts/update-invite-urls.sql
```

## 测试流程

### 1. 访问邀请页面
- URL: `https://aitoolsforteachers.net/invite`
- 确保页面正常加载

### 2. 生成邀请码
- 登录用户账号
- 点击"生成邀请码"
- 确认生成的QR码包含正确的生产环境URL

### 3. 扫码测试
- 使用手机扫描生成的QR码
- 确认跳转到: `https://aitoolsforteachers.net/auth/signup?invite_code={code}`
- 确认注册页面显示邀请码信息

### 4. 注册新用户
- 使用新邮箱完成注册
- 登录后检查邀请者是否获得30积分奖励

## 关键文件清单

- `src/app/invite/page.tsx` - 邀请页面主组件
- `src/app/invite/redirect/page.tsx` - 邀请码重定向页面
- `src/app/api/invite/route.ts` - 邀请码API
- `src/app/api/invite/claim-direct/route.ts` - 直接奖励处理API
- `src/components/auth/EmailRegisterForm.tsx` - 注册表单（含邀请码检测）
- `src/lib/invite-tracking-client.ts` - 客户端邀请追踪

## 注意事项

1. **确保域名正确**: 所有URL都应指向 `https://aitoolsforteachers.net`
2. **数据库连接**: 确保生产环境能正常连接数据库
3. **Supabase配置**: 确保Supabase认证在生产环境正常工作
4. **积分系统**: 确保积分更新逻辑在生产环境正常执行
5. **错误日志**: 检查生产环境错误日志，及时发现并解决问题

## 故障排除

### QR码扫描404
- 检查生成的URL是否包含正确的域名
- 确认重定向页面是否正确部署

### 邀请奖励未发放
- 检查 `invite-tracking-client.ts` 是否正确执行
- 查看 `/api/invite/claim-direct` 的日志
- 确认数据库中的邀请记录是否正确创建

### 注册页面未显示邀请码
- 检查URL参数是否正确传递
- 确认 `EmailRegisterForm.tsx` 中的邀请码检测逻辑

完成部署后，整个邀请奖励系统应该能在生产环境正常运行！