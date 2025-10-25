import { createServerSupabaseClient } from '../src/lib/supabase-server';

async function fixMissingTables() {
  console.log('🔧 修复缺失的数据库表...');

  const supabase = createServerSupabaseClient();

  try {
    // 创建point_transactions表
    console.log('创建 point_transactions 表...');
    
    const createPointTransactionsTable = `
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
    `;

    const { error: tableError } = await supabase.rpc('exec_sql', {
      sql: createPointTransactionsTable
    } as any);

    if (tableError) {
      console.log('⚠️ 无法通过RPC创建表，请手动在Supabase SQL编辑器中执行:');
      console.log(createPointTransactionsTable);
    } else {
      console.log('✅ point_transactions 表创建成功');
    }

    // 启用RLS
    console.log('启用行级安全策略...');
    const enableRLS = `ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;`;
    
    const { error: rlsError } = await supabase.rpc('exec_sql', {
      sql: enableRLS
    } as any);

    if (rlsError) {
      console.log('⚠️ 无法通过RPC启用RLS，请手动在Supabase SQL编辑器中执行:');
      console.log(enableRLS);
    } else {
      console.log('✅ RLS策略启用成功');
    }

    // 创建RLS策略
    console.log('创建RLS策略...');
    const createPolicy = `
      CREATE POLICY "Users can view own transactions" ON public.point_transactions
        FOR SELECT USING (auth.uid() = user_id);
    `;
    
    const { error: policyError } = await supabase.rpc('exec_sql', {
      sql: createPolicy
    } as any);

    if (policyError) {
      console.log('⚠️ 无法通过RPC创建策略，请手动在Supabase SQL编辑器中执行:');
      console.log(createPolicy);
    } else {
      console.log('✅ RLS策略创建成功');
    }

    // 创建索引
    console.log('创建索引...');
    const createIndex = `CREATE INDEX IF NOT EXISTS idx_point_transactions_user_id_created_at ON public.point_transactions(user_id, created_at);`;
    
    const { error: indexError } = await supabase.rpc('exec_sql', {
      sql: createIndex
    } as any);

    if (indexError) {
      console.log('⚠️ 无法通过RPC创建索引，请手动在Supabase SQL编辑器中执行:');
      console.log(createIndex);
    } else {
      console.log('✅ 索引创建成功');
    }

    console.log('\n🎉 修复完成！');
    console.log('\n如果上述操作失败，请手动在Supabase SQL编辑器中执行以下SQL:');
    console.log('==========================================');
    console.log(createPointTransactionsTable);
    console.log(enableRLS);
    console.log(createPolicy);
    console.log(createIndex);

  } catch (error) {
    console.error('💥 修复过程中发生错误:', error);
    console.log('\n请手动在Supabase SQL编辑器中执行 supabase-upgrade.sql 文件');
  }
}

// 运行修复
if (require.main === module) {
  fixMissingTables()
    .then(() => {
      console.log('\n🎉 修复脚本完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 修复失败:', error);
      process.exit(1);
    });
}

export { fixMissingTables };







