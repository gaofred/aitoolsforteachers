import { createServerSupabaseClient } from '../src/lib/supabase-server';

async function checkDatabaseTables() {
  console.log('🔍 检查Supabase数据库表结构...');

  const supabase = createServerSupabaseClient();

  try {
    // 检查所有需要的表是否存在
    const tables = [
      'users',
      'user_points', 
      'memberships',
      'ai_generations',
      'conversations',
      'redemption_codes',
      'point_transactions',
      'ai_tool_configs'
    ];

    console.log('\n📊 表结构检查结果:');
    console.log('================================');

    for (const tableName of tables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('count', { count: 'exact', head: true });

        if (error) {
          console.log(`❌ ${tableName}: 表不存在或无法访问 - ${error.message}`);
        } else {
          console.log(`✅ ${tableName}: 表存在，记录数: ${data || 0}`);
        }
      } catch (err) {
        console.log(`❌ ${tableName}: 检查失败 - ${err}`);
      }
    }

    console.log('\n🔧 如果发现表缺失，请执行以下步骤:');
    console.log('1. 在Supabase SQL编辑器中执行 supabase-upgrade.sql');
    console.log('2. 或者运行: npm run supabase:init');

    // 检查触发器是否存在
    console.log('\n🔍 检查数据库触发器:');
    console.log('================================');

    const { data: triggers, error: triggerError } = await supabase.rpc('check_triggers');

    if (triggerError) {
      console.log('⚠️ 无法检查触发器状态，可能需要手动检查');
    } else {
      console.log('触发器检查结果:', triggers);
    }

  } catch (error) {
    console.error('💥 检查数据库时发生错误:', error);
  }
}

// 运行检查
if (require.main === module) {
  checkDatabaseTables()
    .then(() => {
      console.log('\n🎉 数据库检查完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 检查失败:', error);
      process.exit(1);
    });
}

export { checkDatabaseTables };







