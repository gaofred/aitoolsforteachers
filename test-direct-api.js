// 测试直接邀请API的脚本
require('dotenv').config({ path: '.env.local' });

async function testDirectAPI() {
  console.log('🧪 测试直接邀请API...');

  try {
    // 获取现有的邀请码和用户
    const { data: invites } = await getInvites();
    const { data: users } = await getUsers();

    if (!invites || invites.length === 0) {
      console.log('❌ 没有找到邀请码');
      return;
    }

    if (!users || users.length === 0) {
      console.log('❌ 没有找到用户');
      return;
    }

    const testInvite = invites[0];
    const testUser = users.find(u => u.id !== testInvite.inviter_id) || users[0];

    console.log('📋 测试数据:');
    console.log('  邀请码:', testInvite.code);
    console.log('  邀请者:', testInvite.inviter?.name);
    console.log('  测试用户:', testUser.name);

    // 获取邀请者当前积分
    const inviterPoints = await getUserPoints(testInvite.inviter_id);
    console.log('  邀请者当前积分:', inviterPoints);

    // 测试直接API
    console.log('\n🚀 调用直接邀请API...');

    const response = await fetch('http://localhost:3013/api/invite/claim-direct', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inviteCode: testInvite.code,
        userId: testUser.id
      })
    });

    const data = await response.json();
    console.log('API响应:', data);

    if (data.success) {
      console.log('\n✅ 邀请奖励处理成功！');
      console.log('  获得积分:', data.data.pointsAwarded);
      console.log('  基础积分:', data.data.basePoints);
      console.log('  奖励积分:', data.data.bonusPoints);
      console.log('  邀请者:', data.data.inviterName);
      console.log('  积分变化:', data.data.previousPoints, '→', data.data.newPoints);
    } else {
      console.log('\n❌ 邀请奖励处理失败:', data.error);
    }

    // 再次检查积分变化
    const newInviterPoints = await getUserPoints(testInvite.inviter_id);
    console.log('\n📊 最终积分对比:');
    console.log('  处理前:', inviterPoints);
    console.log('  处理后:', newInviterPoints);
    console.log('  变化:', newInviterPoints - inviterPoints);

  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

// 辅助函数
async function getInvites() {
  const response = await fetch('http://localhost:3013/api/test/list-invites');
  const data = await response.json();
  return data.success ? data.data.invites : [];
}

async function getUsers() {
  const response = await fetch('http://localhost:3013/api/test/list-invites');
  const data = await response.json();
  return data.success ? data.data.users : [];
}

async function getUserPoints(userId) {
  try {
    const response = await fetch(`http://localhost:3013/api/test/user-points/${userId}`);
    const data = await response.json();
    return data.success ? data.points : 0;
  } catch (error) {
    console.error('获取用户积分失败:', error);
    return 0;
  }
}

// 运行测试
testDirectAPI();