// 手动测试邀请奖励系统的Node.js脚本
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

// 创建Supabase客户端
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testInviteSystem() {
  console.log('🔍 开始测试邀请系统...');

  try {
    // 1. 检查现有的邀请码
    console.log('\n📋 1. 检查现有的邀请码:');
    const { data: invites, error: inviteError } = await supabase
      .from('invitation_codes')
      .select(`
        *,
        inviter:users!invitation_codes_inviter_id_fkey (
          id,
          name,
          email
        )
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (inviteError) {
      console.error('❌ 获取邀请码失败:', inviteError);
      return;
    }

    console.log('✅ 找到', invites?.length || 0, '个活跃邀请码');
    if (invites && invites.length > 0) {
      console.log('最新邀请码:', invites[0]);
    }

    // 2. 检查最近的用户
    console.log('\n👥 2. 检查最近的用户:');
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, name, email, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (userError) {
      console.error('❌ 获取用户失败:', userError);
      return;
    }

    console.log('✅ 最近注册的用户:');
    users.forEach(user => {
      console.log(`  - ${user.name} (${user.email}) - ${user.created_at}`);
    });

    // 3. 检查邀请记录
    console.log('\n🤝 3. 检查邀请记录:');
    const { data: invitations, error: invitationError } = await supabase
      .from('invitations')
      .select(`
        *,
        invitation_code:invitation_codes (
          code,
          inviter_id
        ),
        invited_user:users (
          name,
          email
        )
      `)
      .order('created_at', { ascending: false })
      .limit(5);

    if (invitationError) {
      console.error('❌ 获取邀请记录失败:', invitationError);
    } else {
      console.log('✅ 找到', invitations?.length || 0, '条邀请记录');
      invitations.forEach(inv => {
        console.log(`  - ${inv.invited_user?.name} 通过邀请码 ${inv.invitation_code?.code} (状态: ${inv.status})`);
      });
    }

    // 4. 检查邀请奖励记录
    console.log('\n🎁 4. 检查邀请奖励记录:');
    const { data: rewards, error: rewardError } = await supabase
      .from('invitation_rewards')
      .select(`
        *,
        invitation_code:invitation_codes (
          code,
          inviter_id
        )
      `)
      .order('created_at', { ascending: false })
      .limit(5);

    if (rewardError) {
      console.error('❌ 获取邀请奖励失败:', rewardError);
    } else {
      console.log('✅ 找到', rewards?.length || 0, '条奖励记录');
      rewards.forEach(reward => {
        console.log(`  - 邀请码 ${reward.invitation_code?.code}: ${reward.base_points} + ${reward.bonus_points} 积分 (状态: ${reward.status})`);
      });
    }

    // 5. 如果有邀请码和用户，尝试手动处理邀请奖励
    if (invites && invites.length > 0 && users && users.length > 1) {
      console.log('\n🧪 5. 测试邀请奖励处理:');

      const testInviteCode = invites[0].code;
      const testUserId = users[0].id; // 使用最新的用户

      console.log(`使用邀请码: ${testInviteCode}`);
      console.log(`测试用户ID: ${testUserId}`);

      // 获取邀请者当前积分
      const inviterId = invites[0].inviter_id;
      const { data: currentPoints, error: pointsError } = await supabase
        .from('user_points')
        .select('points')
        .eq('user_id', inviterId)
        .single();

      if (pointsError) {
        console.error('❌ 获取当前积分失败:', pointsError);
      } else {
        console.log(`✅ 邀请者当前积分: ${currentPoints.points}`);

        // 调用数据库函数处理邀请奖励
        console.log('🚀 调用 process_invitation_reward 函数...');
        const { data: rewardResult, error: processError } = await supabase.rpc('process_invitation_reward', {
          p_invite_code: testInviteCode,
          p_new_user_id: testUserId,
          p_ip_address: 'test_ip',
          p_user_agent: 'test_script'
        });

        if (processError) {
          console.error('❌ 处理邀请奖励失败:', processError);

          // 检查具体错误类型
          if (processError.message.includes('already used')) {
            console.log('ℹ️  这个邀请码已经被该用户使用过了');
          } else if (processError.message.includes('Invalid invite code')) {
            console.log('ℹ️  邀请码无效');
          } else {
            console.log('ℹ️  其他错误:', processError.message);
          }
        } else {
          console.log('✅ 邀请奖励处理成功:', rewardResult);

          // 再次检查积分变化
          const { data: updatedPoints, error: updateError } = await supabase
            .from('user_points')
            .select('points')
            .eq('user_id', inviterId)
            .single();

          if (updateError) {
            console.error('❌ 获取更新后积分失败:', updateError);
          } else {
            const pointsDiff = updatedPoints.points - currentPoints.points;
            console.log(`🎉 积分变化: ${currentPoints.points} → ${updatedPoints.points} (+${pointsDiff})`);
          }
        }
      }
    }

    console.log('\n✨ 测试完成！');

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
  }
}

// 运行测试
testInviteSystem();