// 简单的数据库检查脚本
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// 创建Supabase客户端
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkDatabase() {
  console.log('🔍 开始检查数据库...\n');

  try {
    // 1. 检查point_transactions表
    console.log('📊 检查point_transactions表...');
    const { data: transactions, error: transError } = await supabase
      .from('point_transactions')
      .select('*')
      .limit(5);

    if (transError) {
      console.error('❌ point_transactions表查询失败:', transError);
    } else {
      console.log(`✅ point_transactions表正常，找到 ${transactions.length} 条记录`);
      if (transactions.length > 0) {
        console.log('最新记录示例:', {
          id: transactions[0].id,
          user_id: transactions[0].user_id,
          type: transactions[0].type,
          amount: transactions[0].amount,
          description: transactions[0].description,
          created_at: transactions[0].created_at
        });
      }
    }

    // 2. 检查users表结构
    console.log('\n👥 检查users表结构...');
    const { data: usersColumns, error: columnsError } = await supabase
      .rpc('get_table_columns', { table_name: 'users' });

    if (columnsError) {
      // 如果RPC不存在，用SQL查询
      console.log('使用SQL查询表结构...');
      const { data: sqlColumns, error: sqlError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type')
        .eq('table_name', 'users')
        .eq('table_schema', 'public');

      if (sqlError) {
        console.error('❌ 表结构查询失败:', sqlError);
      } else {
        console.log('✅ users表字段:', sqlColumns.map(col => `${col.column_name}(${col.data_type})`).join(', '));
      }
    } else {
      console.log('✅ users表字段:', usersColumns);
    }

    // 检查users表数据
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(5);

    if (usersError) {
      console.error('❌ users表查询失败:', usersError);
    } else {
      console.log(`✅ users表正常，找到 ${users.length} 个用户`);
      if (users.length > 0) {
        console.log('用户示例:', users[0]);
      }
    }

    // 3. 检查user_points表
    console.log('\n💰 检查user_points表...');
    const { data: points, error: pointsError } = await supabase
      .from('user_points')
      .select('*')
      .limit(5);

    if (pointsError) {
      console.error('❌ user_points表查询失败:', pointsError);
    } else {
      console.log(`✅ user_points表正常，找到 ${points.length} 条记录`);
      if (points.length > 0) {
        console.log('用户点数示例:', {
          user_id: points[0].user_id,
          points: points[0].points,
          last_updated: points[0].last_updated
        });
      }
    }

    // 4. 测试API路由
    console.log('\n🌐 测试积分历史API...');
    try {
      const response = await fetch('http://localhost:5555/api/points-history', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      console.log(`API响应状态: ${response.status}`);
      console.log('API响应数据:', result);
    } catch (apiError) {
      console.error('❌ API测试失败:', apiError.message);
    }

  } catch (error) {
    console.error('❌ 检查过程中发生错误:', error);
  }
}

// 运行检查
checkDatabase().then(() => {
  console.log('\n🎉 检查完成！');
  process.exit(0);
}).catch((error) => {
  console.error('💥 检查失败:', error);
  process.exit(1);
});