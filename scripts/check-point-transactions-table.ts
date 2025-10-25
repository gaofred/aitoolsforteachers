#!/usr/bin/env tsx

import { createServerSupabaseClient } from '../src/lib/supabase-server';

async function checkPointTransactionsTable() {
  console.log('🔍 检查 point_transactions 表状态...');
  
  try {
    const supabase = createServerSupabaseClient();
    
    // 尝试查询 point_transactions 表
    const { data, error } = await supabase
      .from('point_transactions')
      .select('count(*)')
      .limit(1);
    
    if (error) {
      console.log('❌ point_transactions 表不存在或有问题:');
      console.log('错误信息:', error.message);
      console.log('错误代码:', error.code);
      console.log('错误详情:', error.details);
      console.log('错误提示:', error.hint);
      
      if (error.message.includes('relation "point_transactions" does not exist')) {
        console.log('\n💡 解决方案:');
        console.log('请在 Supabase SQL 编辑器中执行以下脚本:');
        console.log('1. 打开 Supabase 控制台');
        console.log('2. 进入 SQL 编辑器');
        console.log('3. 执行 quick-fix-point-transactions.sql 文件中的内容');
      }
      
      return false;
    }
    
    console.log('✅ point_transactions 表存在且正常');
    console.log('数据记录数:', (data as any)?.[0]?.count || 0);
    return true;
    
  } catch (error) {
    console.error('💥 检查失败:', error);
    return false;
  }
}

// 运行检查
checkPointTransactionsTable()
  .then((success) => {
    if (success) {
      console.log('\n🎉 数据库表检查完成！');
    } else {
      console.log('\n⚠️ 数据库表需要修复！');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('💥 脚本执行失败:', error);
    process.exit(1);
  });







