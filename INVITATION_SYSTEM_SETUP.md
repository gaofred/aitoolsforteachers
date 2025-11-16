# 邀请有礼系统设置指南

## 📋 系统概述

邀请有礼系统是一个完整的用户推荐奖励机制，允许用户通过邀请朋友注册来获得点数奖励。系统包含二维码生成、邀请码追踪、自动积分发放等功能。

### 🎯 核心功能
- **邀请码生成**：为每个用户生成唯一的邀请码
- **二维码生成**：自动生成包含邀请链接的二维码
- **邀请追踪**：多渠道追踪邀请来源（URL参数、Cookie、LocalStorage）
- **自动奖励发放**：新用户注册后自动为邀请者发放点数
- **防刷机制**：IP限制、设备指纹等防作弊措施
- **里程碑奖励**：邀请达到特定数量时的额外奖励

## 🗄️ 数据库设置

### 1. 执行SQL脚本

在Supabase SQL编辑器中执行 `invitation-system-database.sql` 文件中的所有SQL语句：

```bash
# 在Supabase Dashboard的SQL编辑器中执行：
# 1. 打开 invitation-system-database.sql 文件
# 2. 复制所有SQL内容
# 3. 粘贴到Supabase SQL编辑器
# 4. 点击 "Run" 执行
```

### 2. 验证数据库表创建

确认以下表已成功创建：

```sql
-- 检查表是否创建成功
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'invitation_codes',
    'invitations',
    'invitation_rewards',
    'invitation_reward_payouts'
  );

-- 检查视图是否创建成功
SELECT table_name
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name = 'invitation_stats';
```

### 3. 验证数据库函数

确认以下函数已创建成功：

```sql
-- 检查函数是否创建成功
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'generate_unique_invitation_code',
    'create_invitation_code',
    'process_invitation_reward',
    'auto_create_invitation_code'
  );
```

### 4. 检查初始数据

验证奖励配置是否正确插入：

```sql
SELECT * FROM invitation_rewards;
```

应该看到一条记录，配置如下：
- `points_per_invitation`: 30
- `bonus_points_threshold`: 10
- `bonus_points_amount`: 300
- `max_rewards_per_user`: 50
- `max_daily_registrations_per_ip`: 3

## 🎨 前端组件

### 1. 核心组件

#### QRCodeGenerator (`src/components/invite/QRCodeGenerator.tsx`)
- 生成个性化二维码
- 显示邀请统计信息
- 提供复制和分享功能

#### InviteRewardModal (`src/components/invite/InviteRewardModal.tsx`)
- 显示邀请奖励成功弹窗
- 自动关闭机制
- 引导用户进行更多邀请

### 2. 页面路由

#### 邀请主页 (`/invite`)
- 完整的邀请功能界面
- 二维码展示和操作
- 邀请记录和统计

### 3. 集成入口

在主页面侧边栏中已添加"邀请有礼"入口：
- 位置：写作教学工具类别下方
- 图标：礼物标签图标
- 路由：`/invite`

## 🔧 API接口

### 1. 邀请码管理 (`/api/invite`)

#### POST - 创建邀请码
```typescript
POST /api/invite
Content-Type: application/json

{
  "userId": "user_id_here"
}
```

#### GET - 获取邀请信息
```typescript
GET /api/invite?userId=user_id_here          // 获取用户邀请统计
GET /api/invite?code=INVITE_CODE_HERE       // 验证邀请码
```

### 2. 奖励认领 (`/api/invite/claim`)

#### POST - 处理邀请奖励
```typescript
POST /api/invite/claim
Content-Type: application/json

{
  "inviteCode": "INVITE_CODE_HERE",
  "userId": "new_user_id_here",
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0..."
}
```

## 📱 使用流程

### 1. 邀请者流程

1. **访问邀请页面**：用户点击侧边栏"邀请有礼"或直接访问 `/invite`
2. **生成邀请码**：系统自动为用户生成唯一邀请码
3. **分享邀请**：用户可以通过二维码、链接等方式分享邀请
4. **查看统计**：实时查看邀请数量和获得的奖励

### 2. 被邀请者流程

1. **访问邀请链接**：通过邀请链接访问网站，URL包含 `invite_code` 参数
2. **看到邀请提示**：页面显示邀请者信息和奖励说明
3. **完成注册**：用户注册账户
4. **自动发放奖励**：系统自动为邀请者发放点数奖励

### 3. 奖励发放机制

```typescript
// 基础奖励：每成功邀请1人 = 30点数
// 里程碑奖励：邀请满10人 = 额外300点数
// 防刷限制：同IP地址24小时内最多3次注册
// 上限限制：每用户最多获得50次基础奖励
```

## 🔒 安全机制

### 1. 防刷措施

- **IP地址限制**：同一IP地址24小时内限制注册数量
- **设备指纹**：结合User-Agent进行设备识别
- **邮箱验证**：新用户必须完成邮箱验证
- **奖励上限**：防止无限获得奖励

### 2. 数据验证

- **邀请码唯一性**：系统生成唯一邀请码
- **重复邀请检查**：防止同一用户重复认领奖励
- **数据完整性**：数据库约束确保数据一致性

### 3. 隐私保护

- **数据加密**：敏感数据加密存储
- **访问控制**：RLS策略确保用户只能访问自己的数据
- **日志记录**：完整的操作日志便于审计

## 📊 监控和统计

### 1. 关键指标

```sql
-- 查看系统整体统计
SELECT
  COUNT(DISTINCT ic.inviter_id) as total_inviters,
  COUNT(i.id) as total_invitations,
  COUNT(CASE WHEN i.status = 'completed' THEN 1 END) as successful_invitations,
  SUM(irp.points_awarded) as total_points_awarded
FROM invitation_codes ic
LEFT JOIN invitations i ON ic.id = i.invitation_code_id
LEFT JOIN invitation_reward_payouts irp ON i.id = irp.invitation_id;
```

### 2. 用户邀请排行

```sql
-- 查看邀请排行榜
SELECT
  u.name,
  u.email,
  COUNT(CASE WHEN i.status = 'completed' THEN 1 END) as successful_invitations,
  COALESCE(SUM(irp.points_awarded), 0) as total_rewards
FROM users u
LEFT JOIN invitation_codes ic ON u.id = ic.inviter_id
LEFT JOIN invitations i ON ic.id = i.invitation_code_id
LEFT JOIN invitation_reward_payouts irp ON i.id = irp.invitation_id
GROUP BY u.id, u.name, u.email
ORDER BY successful_invitations DESC
LIMIT 10;
```

### 3. 奖励发放统计

```sql
-- 查看奖励发放统计
SELECT
  DATE(created_at) as date,
  COUNT(*) as payout_count,
  SUM(points_awarded) as total_points,
  COUNT(CASE WHEN bonus_applied THEN 1 END) as bonus_count
FROM invitation_reward_payouts
GROUP BY DATE(created_at)
ORDER BY date DESC
LIMIT 30;
```

## 🚀 部署检查清单

### 1. 数据库部署
- [ ] 执行 `invitation-system-database.sql`
- [ ] 验证所有表创建成功
- [ ] 验证所有函数创建成功
- [ ] 检查初始数据插入

### 2. 前端部署
- [ ] 确认所有组件文件存在
- [ ] 检查路由配置正确
- [ ] 验证依赖包已安装 (`qrcode`, `@radix-ui/react-dialog`)

### 3. 环境变量
- [ ] Supabase URL和密钥配置正确
- [ ] 数据库连接正常

### 4. 功能测试
- [ ] 邀请码生成功能正常
- [ ] 二维码显示正常
- [ ] 邀请链接访问正常
- [ ] 新用户注册奖励发放正常
- [ ] 邀请统计显示正常

### 5. 安全检查
- [ ] RLS策略生效
- [ ] API接口权限控制正常
- [ ] 防刷机制工作正常

## 🐛 常见问题

### 1. 邀请码生成失败
**问题**：用户无法生成邀请码
**解决方案**：
- 检查数据库函数是否正确创建
- 验证用户ID是否有效
- 检查Supabase连接配置

### 2. 奖励发放失败
**问题**：新用户注册后邀请者未收到奖励
**解决方案**：
- 检查邀请码是否正确传递
- 验证IP限制是否触发
- 查看API错误日志

### 3. 二维码显示异常
**问题**：二维码无法生成或显示
**解决方案**：
- 确认 `qrcode` 包已安装
- 检查邀请链接格式是否正确
- 验证图片生成权限

### 4. 统计数据不准确
**问题**：邀请统计显示有误
**解决方案**：
- 检查数据库视图查询逻辑
- 验证数据更新触发器
- 重新计算统计数据

## 📞 技术支持

如果遇到问题，请按以下步骤排查：

1. **检查日志**：查看浏览器控制台和服务器日志
2. **验证数据**：检查数据库中的数据是否正确
3. **测试API**：使用Postman等工具测试API接口
4. **检查配置**：确认环境变量和配置文件正确

---

🎉 **恭喜！邀请有礼系统设置完成！**

现在您的网站已经具备了完整的邀请推荐功能，用户可以通过邀请朋友获得点数奖励，帮助您快速扩大用户群体！