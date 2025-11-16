import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { inviterId } = await request.json()

    if (!inviterId) {
      return NextResponse.json({
        success: false,
        error: '缺少邀请者ID'
      })
    }

    console.log('检查里程碑奖励:', inviterId)
    const supabase = createServerSupabaseClient()

    // 1. 获取邀请者的成功邀请数量
    const { data: inviteStats, error: statsError } = await supabase
      .from('invitation_stats' as any)
      .select('*')
      .eq('inviter_id', inviterId)
      .single()

    if (statsError && statsError.code !== 'PGRST116') {
      console.error('获取邀请统计失败:', statsError)
      return NextResponse.json({
        success: false,
        error: '获取邀请统计失败',
        details: statsError
      })
    }

    const successfulInvitations = (inviteStats as any)?.successful_invitations || 0
    console.log(`当前成功邀请数量: ${successfulInvitations}`)

    // 2. 获取所有活跃的里程碑
    const { data: milestones, error: milestonesError } = await supabase
      .from('invitation_milestones' as any)
      .select('*')
      .eq('is_active', true)
      .order('threshold', { ascending: true })

    if (milestonesError) {
      console.error('获取里程碑失败:', milestonesError)
      return NextResponse.json({
        success: false,
        error: '获取里程碑失败',
        details: milestonesError
      })
    }

    console.log(`找到 ${milestones?.length || 0} 个里程碑配置`)

    // 3. 检查哪些里程碑已达成但未发放奖励
    const achievedMilestones = (milestones as any[])?.filter(m =>
      successfulInvitations >= m.threshold
    ) || []

    console.log(`已达成里程碑数量: ${achievedMilestones.length}`)

    if (achievedMilestones.length === 0) {
      return NextResponse.json({
        success: true,
        message: '暂无可发放的里程碑奖励',
        currentInvitations: successfulInvitations,
        nextMilestone: (milestones as any[])?.find(m => m.threshold > successfulInvitations) || null,
        rewardsAwarded: []
      })
    }

    // 4. 检查已发放的奖励记录
    const { data: existingRewards, error: rewardsError } = await supabase
      .from('invitation_reward_payouts' as any)
      .select('*')
      .eq('inviter_id', inviterId)

    if (rewardsError) {
      console.error('获取奖励记录失败:', rewardsError)
      return NextResponse.json({
        success: false,
        error: '获取奖励记录失败',
        details: rewardsError
      })
    }

    const paidMilestoneIds = (existingRewards as any[])?.map((r: any) => r.milestone_id) || []
    const unpaidMilestones = achievedMilestones.filter((m: any) =>
      !paidMilestoneIds.includes(m.id)
    )

    console.log(`待发放奖励里程碑数量: ${unpaidMilestones.length}`)

    if (unpaidMilestones.length === 0) {
      return NextResponse.json({
        success: true,
        message: '所有里程碑奖励已发放',
        currentInvitations: successfulInvitations,
        nextMilestone: (milestones as any[])?.find(m => m.threshold > successfulInvitations) || null,
        rewardsAwarded: []
      })
    }

    // 5. 发放里程碑奖励
    const rewardResults = []
    let totalPointsAwarded = 0

    for (const milestone of unpaidMilestones) {
      console.log(`发放里程碑奖励: ${milestone.threshold}人 - ${milestone.bonus_points}点`)

      // 获取用户当前积分
      const { data: userPoints, error: pointsError } = await supabase
        .from('user_points' as any)
        .select('*')
        .eq('user_id', inviterId)
        .single()

      if (pointsError && pointsError.code !== 'PGRST116') {
        console.error('获取用户积分失败:', pointsError)
        continue
      }

      const currentPoints = (userPoints as any)?.points || 0
      const newPoints = currentPoints + milestone.bonus_points

      // 创建积分交易记录
      const { data: transaction, error: transactionError } = await supabase
        .from('point_transactions' as any)
        .insert([{
          user_id: inviterId,
          amount: milestone.bonus_points,
          type: 'BONUS',
          description: `里程碑奖励 - 成功邀请${milestone.threshold}位朋友`,
          created_at: new Date().toISOString()
        }] as any)
        .select()
        .single()

      if (transactionError) {
        console.error('创建积分交易失败:', transactionError)
        continue
      }

      // 更新用户积分
      const updateCall = (supabase as any).from('user_points').update({
        points: newPoints,
        last_updated: new Date().toISOString()
      })
      const { error: updateError } = await updateCall.eq('user_id', inviterId)

      if (updateError) {
        console.error('更新用户积分失败:', updateError)
        // 回滚交易记录
        await supabase
          .from('point_transactions' as any)
          .delete()
          .eq('id', (transaction as any)?.id)
        continue
      }

      // 记录奖励发放
      const { data: payoutRecord, error: payoutError } = await supabase
        .from('invitation_reward_payouts' as any)
        .insert([{
          inviter_id: inviterId,
          milestone_id: milestone.id,
          invitation_count: successfulInvitations,
          bonus_points: milestone.bonus_points,
          payout_date: new Date().toISOString(),
          transaction_id: (transaction as any)?.id,
          created_at: new Date().toISOString()
        }] as any)
        .select()
        .single()

      if (payoutError) {
        console.error('记录奖励发放失败:', payoutError)
        // 回滚积分和交易
        const rollbackCall = (supabase as any).from('user_points').update({ points: currentPoints })
        await rollbackCall.eq('user_id', inviterId)
        await supabase
          .from('point_transactions' as any)
          .delete()
          .eq('id', (transaction as any)?.id)
        continue
      }

      rewardResults.push({
        milestoneId: milestone.id,
        threshold: milestone.threshold,
        bonusPoints: milestone.bonus_points,
        description: milestone.description,
        transactionId: (transaction as any)?.id,
        payoutId: (payoutRecord as any)?.id,
        previousPoints: currentPoints,
        newPoints: newPoints
      })

      totalPointsAwarded += milestone.bonus_points
      console.log(`里程碑奖励发放成功: ${milestone.bonus_points}点 (${currentPoints}→${newPoints})`)
    }

    return NextResponse.json({
      success: true,
      message: `成功发放 ${rewardResults.length} 个里程碑奖励`,
      currentInvitations: successfulInvitations,
      totalPointsAwarded: totalPointsAwarded,
      nextMilestone: (milestones as any[])?.find((m: any) =>
        m.threshold > successfulInvitations &&
        !unpaidMilestones.some((um: any) => um.id === m.id)
      ) || null,
      rewardsAwarded: rewardResults
    })

  } catch (error) {
    console.error('检查里程碑奖励失败:', error)
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
    message: '请使用 POST 方法检查里程碑奖励',
    usage: {
      method: 'POST',
      body: { inviterId: '用户ID' }
    }
  })
}