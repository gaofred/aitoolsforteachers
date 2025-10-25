// 使用管理员权限检查数据库
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// 使用Service Role Key创建Supabase客户端（管理员权限）
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function adminDatabaseCheck() {
  console.log('🔐 使用管理员权限检查数据库...\n');

  try {
    // 1. 检查point_transactions表
    console.log('📊 检查point_transactions表...');
    const { data: transactions, error: transError } = await supabaseAdmin
      .from('point_transactions')
      .select('*')
      .limit(10);

    if (transError) {
      console.error('❌ point_transactions表查询失败:', transError);
    } else {
      console.log(`✅ point_transactions表正常，找到 ${transactions.length} 条记录`);
      if (transactions.length > 0) {
        console.log('最新交易记录:');
        transactions.forEach((trans, index) => {
          console.log(`  ${index + 1}. [${trans.type}] ${trans.description} - ${trans.amount > 0 ? '+' : ''}${trans.amount}点`);
          console.log(`     用户ID: ${trans.user_id}`);
          console.log(`     时间: ${trans.created_at}`);
          if (trans.metadata) {
            console.log(`     元数据: ${JSON.stringify(trans.metadata)}`);
          }
          console.log('');
        });
      }
    }

    // 2. 获取总记录数
    console.log('📈 获取统计信息...');
    const { count: totalCount, error: countError } = await supabaseAdmin
      .from('point_transactions')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ 获取总数失败:', countError);
    } else {
      console.log(`✅ 总交易记录数: ${totalCount}`);
    }

    // 3. 按类型统计
    const { data: typeData, error: typeError } = await supabaseAdmin
      .from('point_transactions')
      .select('type');

    if (typeError) {
      console.error('❌ 类型统计失败:', typeError);
    } else {
      const stats = {};
      typeData.forEach(item => {
        stats[item.type] = (stats[item.type] || 0) + 1;
      });
      console.log('✅ 按类型统计:');
      Object.entries(stats).forEach(([type, count]) => {
        console.log(`  ${type}: ${count}条`);
      });
    }

    // 4. 检查users表
    console.log('\n👥 检查users表...');
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('*')
      .limit(5);

    if (usersError) {
      console.error('❌ users表查询失败:', usersError);
    } else {
      console.log(`✅ users表正常，找到 ${users.length} 个用户`);
      if (users.length > 0) {
        users.forEach((user, index) => {
          console.log(`  ${index + 1}. ID: ${user.id}`);
          console.log(`     邮箱: ${user.email}`);
          console.log(`     角色: ${user.role || 'N/A'}`);
          console.log(`     创建时间: ${user.created_at || user.created_at}`);
          console.log('');
        });
      }
    }

    // 5. 检查user_points表
    console.log('\n💰 检查user_points表...');
    const { data: userPoints, error: pointsError } = await supabaseAdmin
      .from('user_points')
      .select('*')
      .limit(5);

    if (pointsError) {
      console.error('❌ user_points表查询失败:', pointsError);
    } else {
      console.log(`✅ user_points表正常，找到 ${userPoints.length} 条记录`);
      if (userPoints.length > 0) {
        userPoints.forEach((point, index) => {
          console.log(`  ${index + 1}. 用户ID: ${point.user_id}`);
          console.log(`     当前积分: ${point.points}`);
          console.log(`     最后更新: ${point.last_updated}`);
          console.log('');
        });
      }
    }

    // 6. 测试SupabasePointsService
    console.log('\n🧪 测试SupabasePointsService...');
    if (users && users.length > 0) {
      const testUserId = users[0].id;
      console.log(`使用用户ID ${testUserId} 测试积分服务...`);

      // 动态导入SupabasePointsService
      const { SupabasePointsService } = await import('../src/lib/supabase-points-service.js');

      try {
        const result = await SupabasePointsService.getPointTransactions(testUserId, 1, 10);
        console.log(`✅ SupabasePointsService测试成功，返回 ${result.transactions.length} 条记录`);
        console.log('第一笔交易:', result.transactions[0]);
      } catch (serviceError) {
        console.error('❌ SupabasePointsService测试失败:', serviceError);
        console.error('错误详情:', serviceError.message);
        console.error('错误堆栈:', serviceError.stack);
      }
    }

  } catch (error) {
    console.error('❌ 管理员权限检查失败:', error);
  }
}

// 运行检查
adminDatabaseCheck().then(() => {
  console.log('\n🎉 管理员权限检查完成！');
  process.exit(0);
}).catch((error) => {
  console.error('💥 检查失败:', error);
  process.exit(1);
});