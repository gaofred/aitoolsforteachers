/**
 * 调试 claim-direct API
 */

async function testClaimDirect() {
  const testData = {
    inviteCode: 'INVITE_test_1234567890', // 测试邀请码
    userId: '830a6f1f-bcc1-45c4-9a00-6746eee4421a' // 测试用户ID
  }

  console.log('测试 claim-direct API...')
  console.log('测试数据:', testData)

  try {
    const response = await fetch('http://localhost:3007/api/invite/claim-direct', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    })

    const data = await response.json()
    console.log('API响应状态:', response.status)
    console.log('API响应数据:', JSON.stringify(data, null, 2))

    // 分析可能的问题
    if (!data.success) {
      console.log('\n=== 错误分析 ===')
      console.log('错误信息:', data.error)

      if (data.error?.includes('invalid') || data.error?.includes('expired')) {
        console.log('❌ 问题: 邀请码无效或过期')
        console.log('💡 解决: 检查 invitation_codes 表中是否存在有效的邀请码')
      } else if (data.error?.includes('already used')) {
        console.log('❌ 问题: 邀请码已被使用')
        console.log('💡 解决: 检查 invitations 表中是否有重复记录')
      } else if (data.error?.includes('points') || data.error?.includes('reward')) {
        console.log('❌ 问题: 积分发放失败')
        console.log('💡 解决: 检查 user_points 和 point_transactions 表')
      } else {
        console.log('❌ 未知错误:', data.error)
      }
    } else {
      console.log('\n✅ API调用成功!')
      console.log('奖励详情:', data.data)
    }

  } catch (error) {
    console.error('API调用失败:', error)
  }
}

// 检查邀请码是否存在
async function checkInviteCode() {
  console.log('\n=== 检查邀请码是否存在 ===')

  try {
    // 这里我们只能模拟，实际需要数据库查询
    console.log('需要检查 invitation_codes 表中是否有有效的邀请码')
    console.log('建议SQL: SELECT * FROM invitation_codes WHERE is_active = true LIMIT 5;')
  } catch (error) {
    console.error('检查邀请码失败:', error)
  }
}

// 运行测试
testClaimDirect()
checkInviteCode()