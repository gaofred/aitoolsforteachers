-- 更新会员套餐表以支持新的套餐类型

-- 修改membership_plans表的plan_type字段约束
ALTER TABLE membership_plans
DROP CONSTRAINT IF EXISTS membership_plans_plan_type_check;

-- 添加新的约束以支持所有套餐类型
ALTER TABLE membership_plans
ADD CONSTRAINT membership_plans_plan_type_check
CHECK (plan_type IN ('PREMIUM_I', 'PREMIUM_II', 'PRO'));

-- 确保现有数据与新约束兼容
-- 如果有旧的PREMIUM数据，将其更新为PREMIUM_I
UPDATE membership_plans
SET plan_type = 'PREMIUM_I'
WHERE plan_type = 'PREMIUM';

-- 验证表结构
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'membership_plans'
AND table_schema = 'public'
ORDER BY ordinal_position;