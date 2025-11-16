# 点数交易记录错误修复指南

## 问题描述

用户遇到以下错误：
```
获取交易记录失败: {}
src/lib/supabase-points-service.ts (144:17) @ SupabasePointsService.getPointTransactions
```

## 问题原因

这个错误通常是因为 `point_transactions` 表不存在或配置不正确导致的。

## 解决方案

### 方法1：使用SQL脚本修复（推荐）

1. **打开 Supabase 控制台**
   - 登录到您的 Supabase 项目
   - 进入 SQL 编辑器

2. **执行修复脚本**
   - 复制 `quick-fix-point-transactions.sql` 文件中的内容
   - 在 SQL 编辑器中执行该脚本

3. **验证修复**
   ```sql
   SELECT COUNT(*) FROM public.point_transactions;
   ```

### 方法2：使用检查脚本

运行以下命令检查表状态：
```bash
npm run check:point-transactions-table
```

### 方法3：手动创建表

如果上述方法不起作用，可以手动创建表：

```sql
-- 1. 创建表
CREATE TABLE IF NOT EXISTS public.point_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('REDEEM', 'GENERATE', 'REFUND', 'BONUS', 'PURCHASE', 'MEMBERSHIP')),
  amount INTEGER NOT NULL,
  description TEXT NOT NULL,
  related_id TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 启用行级安全策略
ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;

-- 3. 创建策略
CREATE POLICY "Users can view own transactions" ON public.point_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions" ON public.point_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 4. 创建索引
CREATE INDEX IF NOT EXISTS idx_point_transactions_user_id_created_at 
ON public.point_transactions(user_id, created_at);
```

## 验证修复

修复完成后，您可以：

1. **刷新点数历史页面** - 错误应该消失
2. **检查控制台** - 不应该再有相关错误
3. **测试功能** - 尝试使用AI功能，应该能正常扣除点数并记录交易

## 预防措施

1. **定期备份数据库**
2. **在执行数据库迁移前先测试**
3. **使用版本控制管理SQL脚本**

## 常见问题

### Q: 执行脚本后仍然有错误？
A: 确保：
- 脚本完全执行成功
- 没有语法错误
- 用户有足够的权限

### Q: 表存在但仍然无法访问？
A: 检查：
- 行级安全策略是否正确配置
- 用户是否已正确登录
- 数据库连接是否正常

### Q: 如何确认修复成功？
A: 运行检查脚本：
```bash
npm run check:point-transactions-table
```

## 联系支持

如果问题仍然存在，请：
1. 收集错误日志
2. 记录复现步骤
3. 提供数据库表状态信息








