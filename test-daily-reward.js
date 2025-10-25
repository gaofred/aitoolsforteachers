// 简单的每日奖励API测试脚本
// 在浏览器控制台中运行此脚本来测试每日奖励功能

async function testDailyRewardAPI() {
  console.log('🧪 开始测试每日奖励API...');

  try {
    // 测试GET请求 - 检查奖励状态
    console.log('\n📋 测试GET请求 - 检查奖励状态');
    const getResponse = await fetch('/api/daily-reward', {
      method: 'GET',
      credentials: 'include'
    });

    console.log('GET响应状态:', getResponse.status);
    const getData = await getResponse.json();
    console.log('GET响应数据:', getData);

    if (getData.success && !getData.hasClaimedToday) {
      console.log('✅ 可以领取今日奖励，测试POST请求...');

      // 测试POST请求 - 领取奖励
      console.log('\n🎁 测试POST请求 - 领取奖励');
      const postResponse = await fetch('/api/daily-reward', {
        method: 'POST',
        credentials: 'include'
      });

      console.log('POST响应状态:', postResponse.status);
      const postData = await postResponse.json();
      console.log('POST响应数据:', postData);

      if (postData.success) {
        console.log('🎉 每日奖励领取成功！获得积分:', postData.pointsAdded);

        // 再次测试GET请求，确认状态更新
        console.log('\n🔍 再次检查奖励状态...');
        setTimeout(async () => {
          const verifyResponse = await fetch('/api/daily-reward', {
            method: 'GET',
            credentials: 'include'
          });
          const verifyData = await verifyResponse.json();
          console.log('验证响应数据:', verifyData);

          if (verifyData.hasClaimedToday) {
            console.log('✅ 状态同步正常！今日奖励已标记为已领取');
          } else {
            console.log('❌ 状态同步异常！请检查前端逻辑');
          }
        }, 1000);
      } else {
        console.log('❌ 每日奖励领取失败:', postData.message);
      }
    } else if (getData.hasClaimedToday) {
      console.log('ℹ️ 今日奖励已领取，无需重复领取');
    } else {
      console.log('❌ GET请求失败:', getData);
    }

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
  }
}

// 页面刷新测试
function testPageRefresh() {
  console.log('\n🔄 测试页面刷新后状态保持...');
  console.log('当前dailyRewardClaimed状态:', window.dailyRewardClaimed || '未知');
  console.log('请手动刷新页面，然后观察每日奖励按钮是否正确显示/隐藏');
}

// 自动运行测试
console.log('🚀 每日奖励功能测试脚本已加载');
console.log('📝 使用方法：');
console.log('1. testDailyRewardAPI() - 测试API功能');
console.log('2. testPageRefresh() - 测试页面刷新');
console.log('3. 刷新页面验证前端状态同步');

// 5秒后自动运行API测试
setTimeout(() => {
  console.log('\n⏰ 自动开始API测试...');
  testDailyRewardAPI();
}, 5000);