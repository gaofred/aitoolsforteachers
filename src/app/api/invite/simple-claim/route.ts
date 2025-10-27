import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { inviteCode, userId } = await request.json()

    if (!inviteCode || !userId) {
      return NextResponse.json({
        success: false,
        error: '缺少邀请码或用户ID'
      })
    }

    console.log('简化的邀请奖励处理:', { inviteCode, userId })
    const supabase = createServerSupabaseClient()

    // 1. 验证邀请码
    const { data: inviteData, error: inviteError } = await supabase
      .from('invitation_codes' as any)
      .select('*')
      .eq('code', inviteCode)
      .eq('is_active', true)
      .single()

    if (inviteError || !inviteData) {
      console.error('邀请码验证失败:', inviteError)
      return NextResponse.json({
        success: false,
        error: '邀请码无效或已过期',
        details: inviteError
      })
    }

    // 2. 检查是否自己邀请自己
    if (userId === (inviteData as any).inviter_id) {
      return NextResponse.json({
        success: false,
        error: '不能邀请自己'
      })
    }

    console.log('邀请码验证成功:', inviteData)

    // 3. 检查是否已经使用过这个邀请码
    const { data: existingTransaction, error: checkError } = await supabase
      .from('point_transactions' as any)
      .select('*')
      .eq('description', `邀请奖励 - ${inviteCode}`)
      .eq('user_id', userId)
      .single()

    if (!checkError && existingTransaction) {
      return NextResponse.json({
        success: false,
        error: '您已经使用过此邀请码'
      })
    }

    // 4. 检查用户积分记录 - 但只检查被邀请者（新用户）
    // 这里应该为被邀请者创建积分记录，而不是邀请者
    const { data: newUserPoints, error: newPointsError } = await supabase
      .from('user_points' as any)
      .select('*')
      .eq('user_id', userId)
      .single()

    if (newPointsError && newPointsError.code !== 'PGRST116') {
      console.error('获取被邀请者积分失败:', newPointsError)
      return NextResponse.json({
        success: false,
        error: '获取被邀请者积分失败',
        details: newPointsError
      })
    }

    let newUserCurrentPoints = 0
    if (!newUserPoints) {
      // 为被邀请者创建积分记录
      const { data: createdNewPoints, error: createNewError } = await supabase
        .from('user_points' as any)
        .insert([{
          user_id: userId,
          points: 0,
          last_updated: new Date().toISOString()
        }] as any)
        .select()
        .single()

      if (createNewError) {
        // 如果创建失败（可能因为用户不存在），跳过积分记录创建
        console.log('被邀请者积分记录创建失败，可能用户不存在，跳过:', createNewError.message)
      } else {
        newUserCurrentPoints = 0
      }
    } else {
      newUserCurrentPoints = (newUserPoints as any)?.points || 0
    }

    // 5. 获取邀请者当前积分
    const { data: inviterPoints, error: inviterPointsError } = await supabase
      .from('user_points' as any)
      .select('*')
      .eq('user_id', (inviteData as any).inviter_id)
      .single()

    if (inviterPointsError) {
      console.error('获取邀请者积分失败:', inviterPointsError)
      return NextResponse.json({
        success: false,
        error: '获取邀请者积分失败',
        details: inviterPointsError
      })
    }

    const inviterCurrentPoints = (inviterPoints as any)?.points || 0

    // 6. 发放基础奖励（固定30点）给邀请者
    const basePoints = 30

    console.log(`发放基础奖励: ${basePoints}点 给邀请者 (当前: ${inviterCurrentPoints})`)

    // 7. 创建积分交易记录
    const { data: transaction, error: transactionError } = await supabase
      .from('point_transactions' as any)
      .insert([{
        user_id: (inviteData as any).inviter_id,
        amount: basePoints,
        type: 'BONUS',
        description: `邀请奖励 - ${inviteCode}`,
        created_at: new Date().toISOString()
      }] as any)
      .select()
      .single()

    if (transactionError) {
      console.error('创建积分交易失败:', transactionError)
      return NextResponse.json({
        success: false,
        error: '创建积分交易失败',
        details: transactionError
      })
    }

    // 8. 更新邀请者积分
    const inviterNewPoints = inviterCurrentPoints + basePoints
    const { error: updateError } = await supabase
      .from('user_points' as any)
      .update({
        points: inviterNewPoints,
        last_updated: new Date().toISOString()
      })
      .eq('user_id', (inviteData as any).inviter_id)

    if (updateError) {
      console.error('更新用户积分失败:', updateError)
      // 回滚交易记录
      await supabase
        .from('point_transactions' as any)
        .delete()
        .eq('id', (transaction as any)?.id)
      return NextResponse.json({
        success: false,
        error: '更新用户积分失败',
        details: updateError
      })
    }

    // 8. 创建邀请记录（可选，但重要）
    const { data: invitationRecord, error: invitationError } = await supabase
      .from('invitations' as any)
      .insert([{
        invitation_code_id: (inviteData as any).id,
        inviter_id: (inviteData as any).inviter_id,
        invited_user_id: userId,
        status: 'completed',
        registered_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      }] as any)
      .select()
      .single()

    if (invitationError) {
      console.error('创建邀请记录失败:', invitationError)
      // 不影响主流程
    }

    console.log('基础邀请奖励发放成功!')

    // 9. 检查里程碑奖励
    console.log('检查里程碑奖励...')
    let milestoneRewards = []
    let totalMilestonePoints = 0

    try {
      const milestoneResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3010'}/api/invite/check-milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inviterId: (inviteData as any).inviter_id
        })
      })

      if (milestoneResponse.ok) {
        const milestoneData = await milestoneResponse.json()
        if (milestoneData.success && milestoneData.rewardsAwarded) {
          milestoneRewards = milestoneData.rewardsAwarded
          totalMilestonePoints = milestoneData.totalPointsAwarded || 0
          console.log(`里程碑奖励发放成功: ${totalMilestonePoints}点`)
        }
      } else {
        console.error('里程碑奖励检查失败:', milestoneResponse.statusText)
      }
    } catch (milestoneError) {
      console.error('里程碑奖励检查异常:', milestoneError)
      // 不影响基础奖励流程
    }

    const totalPointsAwarded = basePoints + totalMilestonePoints

    return NextResponse.json({
      success: true,
      data: {
        transactionId: (transaction as any)?.id,
        pointsAwarded: totalPointsAwarded,
        basePoints: basePoints,
        milestonePoints: totalMilestonePoints,
        previousPoints: inviterCurrentPoints,
        newPoints: inviterNewPoints,
        inviterId: (inviteData as any).inviter_id,
        milestoneRewards: milestoneRewards,
        inviterName: (inviteData as any)?.inviter?.name || '朋友'
      },
      message: totalMilestonePoints > 0
        ? `基础奖励和里程碑奖励发放成功！总计${totalPointsAwarded}点`
        : '基础奖励发放成功！'
    })

  } catch (error) {
    console.error('简化的邀请奖励处理失败:', error)
    return NextResponse.json({
      success: false,
      error: '服务器错误',
      details: error
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: '请使用 POST 方法处理邀请奖励',
    usage: {
      method: 'POST',
      body: {
        inviteCode: '邀请码',
        userId: '用户ID'
      }
    }
  })
}