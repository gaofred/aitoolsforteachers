import { createServerSupabaseClient } from '../src/lib/supabase-server';

async function simpleDbCheck() {
  console.log('🔍 简单数据库检查...');

  const supabase = createServerSupabaseClient();

  try {
    // 检查point_transactions表
    console.log('检查 point_transactions 表...');
    const { data, error } = await supabase
      .from('point_transactions')
      .select('count', { count: 'exact', head: true });

    if (error) {
      console.log('❌ point_transactions 表不存在或无法访问');
      console.log('错误信息:', error.message);
      console.log('\n🔧 解决方案:');
      console.log('1. 在Supabase SQL编辑器中执行 supabase-upgrade.sql 文件');
      console.log('2. 确保所有表都已正确创建');
      return false;
    } else {
      console.log('✅ point_transactions 表存在');
      return true;
    }

  } catch (error) {
    console.error('💥 检查失败:', error);
    return false;
  }
}

// 运行检查
if (require.main === module) {
  simpleDbCheck()
    .then((success) => {
      if (success) {
        console.log('\n🎉 数据库检查通过！');
      } else {
        console.log('\n❌ 数据库需要升级！');
      }
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('💥 检查失败:', error);
      process.exit(1);
    });
}

export { simpleDbCheck };









