// 创建测试用户和积分交易数据
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// 创建Supabase客户端
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function createTestData() {
  console.log('🚀 开始创建测试数据...\n');

  try {
    // 1. 创建测试用户
    console.log('👤 创建测试用户...');
    const testUserId = '00000000-0000-0000-0000-000000000001';

    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('id', testUserId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ 检查用户失败:', checkError);
      return;
    }

    if (!existingUser) {
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          id: testUserId,
          email: 'test@example.com',
          name: '测试用户',
          role: 'USER',
          membership_level: 'FREE',
          membership_days: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (userError) {
        console.error('❌ 创建用户失败:', userError);
        return;
      }
      console.log('✅ 测试用户创建成功:', newUser.email);
    } else {
      console.log('✅ 测试用户已存在:', existingUser.email);
    }

    // 2. 创建用户积分记录
    console.log('\n💰 创建用户积分记录...');
    const { data: existingPoints, error: pointsCheckError } = await supabase
      .from('user_points')
      .select('*')
      .eq('user_id', testUserId)
      .single();

    if (pointsCheckError && pointsCheckError.code !== 'PGRST116') {
      console.error('❌ 检查积分失败:', pointsCheckError);
      return;
    }

    if (!existingPoints) {
      const { data: newPoints, error: pointsError } = await supabase
        .from('user_points')
        .insert({
          user_id: testUserId,
          points: 100,
          last_updated: new Date().toISOString()
        })
        .select()
        .single();

      if (pointsError) {
        console.error('❌ 创建积分记录失败:', pointsError);
        return;
      }
      console.log('✅ 积分记录创建成功，当前积分:', newPoints.points);
    } else {
      console.log('✅ 积分记录已存在，当前积分:', existingPoints.points);
    }

    // 3. 创建测试交易记录
    console.log('\n📊 创建测试交易记录...');

    const testTransactions = [
      {
        user_id: testUserId,
        type: 'BONUS',
        amount: 25,
        description: '新用户注册奖励',
        related_id: null,
        metadata: { source: 'registration' },
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() // 7天前
      },
      {
        user_id: testUserId,
        type: 'REDEEM',
        amount: 50,
        description: '兑换码兑换: WELCOME50',
        related_id: 'WELCOME50',
        metadata: { code: 'WELCOME50', type: 'points' },
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() // 5天前
      },
      {
        user_id: testUserId,
        type: 'GENERATE',
        amount: -6,
        description: '英语文本深度分析 - Fred老师原创',
        related_id: 'text-analysis-001',
        metadata: { toolType: 'text-analysis', modelType: 'STANDARD', textLength: 1500 },
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() // 3天前
      },
      {
        user_id: testUserId,
        type: 'GENERATE',
        amount: -6,
        description: '英语文本深度分析 - Fred老师原创',
        related_id: 'text-analysis-002',
        metadata: { toolType: 'text-analysis', modelType: 'STANDARD', textLength: 2300 },
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() // 2天前
      },
      {
        user_id: testUserId,
        type: 'BONUS',
        amount: 10,
        description: '每日登录奖励',
        related_id: null,
        metadata: { source: 'daily-login' },
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() // 1天前
      }
    ];

    for (const transaction of testTransactions) {
      const { data: newTransaction, error: transError } = await supabase
        .from('point_transactions')
        .insert(transaction)
        .select()
        .single();

      if (transError) {
        console.error('❌ 创建交易记录失败:', transError);
        continue;
      }
      console.log(`✅ 交易记录创建成功: ${transaction.description} (${transaction.amount > 0 ? '+' : ''}${transaction.amount}点)`);
    }

    // 4. 更新用户积分（计算最终积分）
    const finalPoints = 25 + 50 - 6 - 6 + 10; // 73点
    const { error: updateError } = await supabase
      .from('user_points')
      .update({
        points: finalPoints,
        last_updated: new Date().toISOString()
      })
      .eq('user_id', testUserId);

    if (updateError) {
      console.error('❌ 更新积分失败:', updateError);
    } else {
      console.log(`✅ 用户积分更新成功，最终积分: ${finalPoints}点`);
    }

    // 5. 验证数据创建结果
    console.log('\n🔍 验证数据创建结果...');

    const { data: finalTransactions, error: verifyError } = await supabase
      .from('point_transactions')
      .select('*')
      .eq('user_id', testUserId)
      .order('created_at', { ascending: false });

    if (verifyError) {
      console.error('❌ 验证交易记录失败:', verifyError);
    } else {
      console.log(`✅ 共创建 ${finalTransactions.length} 条交易记录`);
      finalTransactions.forEach((trans, index) => {
        console.log(`  ${index + 1}. ${trans.description} - ${trans.amount > 0 ? '+' : ''}${trans.amount}点`);
      });
    }

    console.log('\n🎉 测试数据创建完成！');
    console.log('📝 测试用户信息:');
    console.log(`   邮箱: test@example.com`);
    console.log(`   用户ID: ${testUserId}`);
    console.log(`   当前积分: ${finalPoints}点`);
    console.log(`   交易记录: ${finalTransactions.length}条`);

  } catch (error) {
    console.error('❌ 创建测试数据失败:', error);
  }
}

// 运行创建
createTestData().then(() => {
  console.log('\n✨ 数据创建脚本执行完成！');
  process.exit(0);
}).catch((error) => {
  console.error('💥 脚本执行失败:', error);
  process.exit(1);
});