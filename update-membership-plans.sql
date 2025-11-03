-- 更新会员套餐配置
-- 删除现有套餐
DELETE FROM membership_plans;

-- 插入新的会员套餐
INSERT INTO membership_plans (plan_type, name, daily_points, points_cost, duration_days, description, features, is_active) VALUES
('PREMIUM_I', 'Premium 会员I', 500, 2100, 30, '享受500点数每日重置和更多特权，有效期30天',
 '{"daily_points": 500, "priority_support": true, "advanced_tools": true, "plan_tier": "premium_i"}'),
('PREMIUM_II', 'Premium 会员II', 500, 5500, 90, '享受500点数每日重置和更多特权，有效期90天',
 '{"daily_points": 500, "priority_support": true, "advanced_tools": true, "plan_tier": "premium_ii"}'),
('PRO', 'Pro会员', 800, 19900, 365, '享受800点数每日重置和全部功能特权，有效期365天',
 '{"daily_points": 800, "priority_support": true, "advanced_tools": true, "beta_access": true, "plan_tier": "pro"}');

-- 验证插入结果
SELECT * FROM membership_plans ORDER BY points_cost;