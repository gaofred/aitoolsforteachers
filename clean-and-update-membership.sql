-- 彻底清理并更新会员套餐数据
-- 确保不会出现重复的Pro会员

-- 1. 首先检查当前的数据
SELECT 'Before cleanup - Current membership plans:' as info;
SELECT plan_type, name, daily_points, points_cost, duration_days, is_active
FROM membership_plans
ORDER BY plan_type;

-- 2. 删除所有现有的会员套餐数据
DELETE FROM membership_plans;

-- 3. 插入新的、正确的会员套餐配置
INSERT INTO membership_plans (plan_type, name, daily_points, points_cost, duration_days, description, features, is_active) VALUES
('PREMIUM_I', 'Premium 会员I', 500, 2100, 30, '享受500点数每日重置和更多特权，有效期30天',
 '{"daily_points": 500, "priority_support": true, "advanced_tools": true, "plan_tier": "premium_i"}'),
('PREMIUM_II', 'Premium 会员II', 500, 5500, 90, '享受500点数每日重置和更多特权，有效期90天',
 '{"daily_points": 500, "priority_support": true, "advanced_tools": true, "plan_tier": "premium_ii"}'),
('PRO', 'Pro会员', 800, 19900, 365, '享受800点数每日重置和全部功能特权，有效期365天',
 '{"daily_points": 800, "priority_support": true, "advanced_tools": true, "beta_access": true, "plan_tier": "pro"}');

-- 4. 验证插入结果
SELECT 'After cleanup - New membership plans:' as info;
SELECT plan_type, name, daily_points, points_cost, duration_days, is_active
FROM membership_plans
ORDER BY points_cost;

-- 5. 确保plan_type字段约束正确
ALTER TABLE membership_plans
DROP CONSTRAINT IF EXISTS membership_plans_plan_type_check;

ALTER TABLE membership_plans
ADD CONSTRAINT membership_plans_plan_type_check
CHECK (plan_type IN ('PREMIUM_I', 'PREMIUM_II', 'PRO'));

-- 6. 验证约束
SELECT 'Constraints updated successfully' as info;

-- 7. 检查是否有重复的购买记录（可选）
SELECT 'Checking for duplicate purchases:' as info;
SELECT user_id, plan_type, COUNT(*) as purchase_count
FROM membership_purchases
WHERE is_active = true
GROUP BY user_id, plan_type
HAVING COUNT(*) > 1;