# 邀请系统修复说明

## 问题描述

新用户通过邀请链接注册后，邀请人应该获得积分奖励，但之前需要新用户额外登录才能触发奖励。

## 问题原因

1. **Supabase cookies处理问题**：在Next.js 15中，`cookies()`需要await，但`createServerClient`的回调函数无法使用async
2. **邀请码传递问题**：OAuth回调时邀请码传递可能丢失

## 解决方案

### 1. 修复Supabase客户端cookies处理

修改 `src/lib/supabase-server.ts`，使用try-catch处理cookies获取错误：

```typescript
getAll() {
  try {
    const cookieStore = cookies()
    return cookieStore.getAll()
  } catch (error) {
    console.log('Cookie获取错误:', error)
    return []
  }
}
```

### 2. 邀请奖励自动处理流程

1. **邀请链接生成**：用户在 `/invite` 页面生成邀请码
2. **邀请码传递**：通过URL参数传递，如 `/auth/signup?invite_code=xxx`
3. **OAuth回调处理**：在 `src/app/api/auth/callback/route.ts` 中：
   - 创建新用户后立即调用 `processInviteForNewUserServer`
   - 检查URL中的 `invite_code` 参数
   - 验证邀请码并发放奖励
4. **奖励发放**：调用 `/api/invite/simple-claim` 处理积分奖励

## 工作流程

```
1. 邀请人A访问 /invite 页面
   ↓
2. 生成邀请码并复制邀请链接
   ↓
3. 新用户B通过邀请链接访问
   ↓
4. URL中包含 invite_code 参数
   ↓
5. 新用户注册（邮箱或Google OAuth）
   ↓
6. OAuth回调：/api/auth/callback?invite_code=xxx
   ↓
7. 创建新用户记录
   ↓
8. 自动调用 processInviteForNewUserServer
   ↓
9. 验证邀请码 → 创建邀请记录 → 发放积分奖励
   ↓
10. 邀请人A获得积分（记录在 point_transactions 表）
```

## 相关数据表

### point_transactions
记录所有积分变动，包括邀请奖励：
- `user_id`: 获得积分的用户
- `amount`: 积分数量
- `type`: 交易类型（INVITE_REWARD）
- `description`: 交易描述
- `related_id`: 关联的邀请记录ID

### invitations
记录邀请关系：
- `inviter_id`: 邀请人ID
- `invited_user_id`: 被邀请人ID
- `invitation_code_id`: 使用的邀请码ID
- `status`: 邀请状态

### invitation_codes
邀请码表：
- `code`: 邀请码
- `inviter_id`: 邀请人ID
- `is_active`: 是否有效

## 测试步骤

1. 访问 `/invite` 页面生成邀请码
2. 使用无痕模式或新浏览器访问邀请链接
3. 通过Google OAuth注册新账号
4. 检查邀请人的积分是否增加
5. 查看 `point_transactions` 表确认奖励记录

## 注意事项

- 邀请码只能使用一次
- 不能邀请自己
- 奖励发放在后台异步执行，不会阻塞用户注册流程
- 如果奖励发放失败，会记录错误日志但不会影响用户注册

