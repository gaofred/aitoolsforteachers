# 会员系统部署指南

## 🎯 功能概述

本会员系统包含以下核心功能：
- **每日点数重置**：会员每天北京时间0点自动获得500点数
- **会员等级管理**：FREE、PREMIUM、PRO三个等级
- **点数兑换会员**：支持用点数购买会员
- **兑换码系统**：支持会员天数和会员套餐兑换码
- **自动到期处理**：会员到期自动转为免费用户

## 📋 部署步骤

### 1. 数据库升级

在 Supabase SQL 编辑器中依次执行以下SQL脚本：

#### 1.1 基础会员系统
```sql
-- 执行 membership-system-upgrade.sql
```

#### 1.2 兑换码系统升级
```sql
-- 执行 upgrade-redemption-codes.sql
```

### 2. 环境变量配置

在 `.env.local` 文件中添加以下环境变量：

```env
# 定时任务安全密钥
CRON_SECRET_KEY=your-secure-cron-key-here

# 确保其他必需的API密钥
COZE_TOKEN=your-coze-token
ZhipuOfficial=your-zhipu-api-key
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-key
```

### 3. Vercel部署配置

#### 3.1 更新 vercel.json
项目根目录的 `vercel.json` 已配置每日0:00（北京时间16:00）的定时任务。

#### 3.2 部署到Vercel
```bash
git add .
git commit -m "添加会员系统功能"
git push origin main
```

### 4. 功能验证

#### 4.1 验证数据库表结构
```sql
-- 检查新表是否创建成功
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('membership_plans', 'membership_purchases', 'daily_reset_logs', 'membership_redemptions');

-- 检查会员套餐数据
SELECT * FROM membership_plans;

-- 检查用户点数表新字段
SELECT user_id, points, daily_points, is_member, membership_expires_at
FROM user_points LIMIT 5;
```

#### 4.2 验证API接口
```bash
# 获取会员套餐
curl https://your-domain.com/api/membership/plans

# 获取会员状态（需要先登录）
curl https://your-domain.com/api/membership/status
```

#### 4.3 验证定时任务
```bash
# 手动触发定时任务（需要提供CRON_SECRET_KEY）
curl -X POST https://your-domain.com/api/cron/daily-points-reset \
  -H "Authorization: Bearer your-secure-cron-key-here"
```

## 🎨 功能使用说明

### 1. 用户端功能

#### 1.1 会员中心
- 访问路径：`/membership`
- 查看当前会员状态
- 购买会员套餐
- 查看会员特权对比

#### 1.2 用户菜单
- 显示会员等级徽章
- 显示每日点数状态
- 显示会员到期时间
- 进入会员中心入口

#### 1.3 兑换码兑换
- 支持点数兑换码
- 支持会员天数兑换码
- 支持会员套餐兑换码

### 2. 管理员功能

#### 2.1 会员套餐管理
- 创建和管理会员套餐
- 设置点数价格和天数
- 启用/禁用套餐

#### 2.2 兑换码管理
- 创建多种类型兑换码
- 查看兑换记录
- 管理兑换码状态

#### 2.3 系统管理
- 手动重置用户点数
- 查看重置日志
- 监控系统运行状态

## ⚙️ 系统配置

### 会员套餐配置
- **FREE**：25点数/天
- **PREMIUM**：500点数/天，3000点数/30天
- **PRO**：800点数/天，5000点数/30天

### 定时任务配置
- **执行时间**：每天北京时间0:00（UTC 16:00）
- **任务路径**：`/api/cron/daily-points-reset`
- **安全验证**：需要 `CRON_SECRET_KEY` 环境变量

### 兑换码类型
- **POINTS**：点数兑换码
- **MEMBERSHIP_DAYS**：会员天数兑换码
- **MEMBERSHIP**：会员套餐兑换码

## 🔧 维护操作

### 1. 每日重置监控
```sql
-- 查看今日重置日志
SELECT * FROM daily_reset_logs
WHERE reset_date = CURRENT_DATE
ORDER BY created_at DESC;

-- 查看重置统计
SELECT
  plan_type,
  COUNT(*) as user_count,
  AVG(new_points) as avg_points
FROM daily_reset_logs
WHERE reset_date = CURRENT_DATE
GROUP BY plan_type;
```

### 2. 会员状态检查
```sql
-- 查看即将到期的会员
SELECT
  u.email,
  mp.plan_type,
  mp.end_date,
  EXTRACT(DAYS FROM (mp.end_date - CURRENT_TIMESTAMP)) as days_remaining
FROM membership_purchases mp
JOIN public.users u ON mp.user_id = u.id
WHERE mp.is_active = true
AND mp.end_date > CURRENT_TIMESTAMP
AND mp.end_date <= CURRENT_TIMESTAMP + INTERVAL '7 days'
ORDER BY mp.end_date;
```

### 3. 数据备份
定期备份以下重要表：
- `membership_purchases`
- `daily_reset_logs`
- `membership_redemptions`
- `user_points`

## 🚨 注意事项

1. **时区问题**：定时任务使用UTC时间，北京时间需要减8小时
2. **数据一致性**：会员状态变更会立即触发点数重置
3. **安全考虑**：定时任务接口需要CRON_SECRET_KEY验证
4. **性能优化**：批量重置操作已优化，支持大量用户
5. **错误处理**：系统包含完善的错误处理和回滚机制

## 🆘 故障排除

### 常见问题

#### 1. 定时任务未执行
- 检查 `vercel.json` 配置
- 验证 `CRON_SECRET_KEY` 环境变量
- 查看 Vercel Functions 日志

#### 2. 会员状态不正确
- 检查 `membership_purchases` 表数据
- 验证会员到期时间设置
- 手动执行重置操作

#### 3. 兑换码无法使用
- 检查兑换码类型配置
- 验证兑换码状态
- 确认用户权限

#### 4. 点数重置失败
- 检查数据库连接
- 验证函数权限
- 查看错误日志

## 📈 监控指标

建议监控以下指标：
- 每日重置成功率
- 会员转化率
- 兑换码使用率
- 会员续费率
- 系统响应时间

---

🎉 会员系统部署完成！如有问题，请参考故障排除部分或联系技术支持。