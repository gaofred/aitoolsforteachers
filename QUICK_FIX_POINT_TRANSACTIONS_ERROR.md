# 快速修复点数交易记录错误

## 问题
您遇到的错误：`获取交易记录失败: {}` 是因为 `point_transactions` 表不存在。

## 立即解决方案

### 步骤1：打开 Supabase 控制台
1. 登录您的 Supabase 项目
2. 点击左侧菜单的 "SQL Editor"

### 步骤2：执行以下SQL脚本

复制并粘贴以下代码到 SQL 编辑器中，然后点击 "Run"：

```sql
-- 创建 point_transactions 表
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

-- 启用行级安全策略
ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;

-- 删除现有策略（如果存在）
DROP POLICY IF EXISTS "Users can view own transactions" ON public.point_transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.point_transactions;

-- 创建新的RLS策略
CREATE POLICY "Users can view own transactions" ON public.point_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions" ON public.point_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_point_transactions_user_id_created_at 
ON public.point_transactions(user_id, created_at);

-- 验证表创建成功
SELECT 'point_transactions 表创建成功！' as message;
```

### 步骤3：验证修复
执行完成后，您应该看到 "point_transactions 表创建成功！" 的消息。

### 步骤4：测试功能
1. 刷新您的应用程序页面
2. 尝试访问点数历史页面
3. 错误应该消失

## 如果仍有问题

如果执行脚本后仍有问题，请检查：

1. **确保脚本完全执行** - 没有任何错误信息
2. **检查用户权限** - 确保您有足够的数据库权限
3. **刷新页面** - 清除浏览器缓存

## 预防措施

为了避免将来出现类似问题：
1. 定期备份数据库
2. 在执行重要操作前先测试
3. 保持数据库脚本的版本控制

---

**注意**：这个修复是安全的，不会影响现有数据。如果表已存在，脚本会跳过创建步骤。








