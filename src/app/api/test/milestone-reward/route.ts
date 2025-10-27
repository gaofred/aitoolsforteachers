import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { inviterId, invitationCount } = await request.json()

    if (!inviterId || invitationCount === undefined) {
      return NextResponse.json({
        success: false,
        error: '缺少邀请者ID或邀请数量'
      })
    }

    console.log('测试里程碑奖励:', { inviterId, invitationCount })
    const supabase = createServerSupabaseClient()

    // 1. 获取所有活跃的里程碑
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

    // 2. 检查哪些里程碑已达成
    const achievedMilestones = (milestones as any[])?.filter((m: any) =>
      invitationCount >= m.threshold
    ) || []

    console.log(`已达成里程碑数量: ${achievedMilestones.length}`)

    if (achievedMilestones.length === 0) {
      return NextResponse.json({
        success: true,
        message: '暂无可发放的里程碑奖励',
        invitationCount: invitationCount,
        nextMilestone: (milestones as any[])?.find((m: any) => m.threshold > invitationCount) || null,
        rewardsAwarded: []
      })
    }

    // 3. 检查已发放的奖励记录
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
        invitationCount: invitationCount,
        nextMilestone: (milestones as any[])?.find((m: any) => m.threshold > invitationCount) || null,
        rewardsAwarded: []
      })
    }

    // 4. 发放里程碑奖励
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
      const newPoints = currentPoints + (milestone as any).bonus_points

      // 创建积分交易记录
      const { data: transaction, error: transactionError } = await supabase
        .from('point_transactions' as any)
        .insert({
          user_id: inviterId,
          amount: milestone.bonus_points,
          type: 'BONUS',
          description: `里程碑奖励 - 成功邀请${milestone.threshold}位朋友`,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (transactionError) {
        console.error('创建积分交易失败:', transactionError)
        continue
      }

      // 更新用户积分
      const { error: updateError } = await supabase
        .from('user_points' as any)
        .update({
          points: newPoints,
          last_updated: new Date().toISOString()
        })
        .eq('user_id', inviterId)

      if (updateError) {
        console.error('更新用户积分失败:', updateError)
        // 回滚交易记录
        await supabase
          .from('point_transactions' as any)
          .delete()
          .eq('id', transaction.id)
        continue
      }

      // 记录奖励发放
      const { data: payoutRecord, error: payoutError } = await supabase
        .from('invitation_reward_payouts' as any)
        .insert({
          inviter_id: inviterId,
          milestone_id: milestone.id,
          invitation_count: invitationCount,
          bonus_points: milestone.bonus_points,
          payout_date: new Date().toISOString(),
          transaction_id: transaction.id,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (payoutError) {
        console.error('记录奖励发放失败:', payoutError)
        // 回滚积分和交易
        await supabase
          .from('user_points' as any)
          .update({ points: currentPoints })
          .eq('user_id', inviterId)
        await supabase
          .from('point_transactions' as any)
          .delete()
          .eq('id', transaction.id)
        continue
      }

      rewardResults.push({
        milestoneId: milestone.id,
        threshold: milestone.threshold,
        bonusPoints: milestone.bonus_points,
        description: milestone.description,
        transactionId: transaction.id,
        payoutId: payoutRecord.id,
        previousPoints: currentPoints,
        newPoints: newPoints
      })

      totalPointsAwarded += milestone.bonus_points
      console.log(`里程碑奖励发放成功: ${milestone.bonus_points}点 (${currentPoints}→${newPoints})`)
    }

    return NextResponse.json({
      success: true,
      message: `成功发放 ${rewardResults.length} 个里程碑奖励`,
      invitationCount: invitationCount,
      totalPointsAwarded: totalPointsAwarded,
      nextMilestone: milestones?.find(m =>
        m.threshold > invitationCount &&
        !unpaidMilestones.some(um => um.id === m.id)
      ) || null,
      rewardsAwarded: rewardResults
    })

  } catch (error) {
    console.error('测试里程碑奖励失败:', error)
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
    message: '请使用 POST 方法测试里程碑奖励',
    usage: {
      method: 'POST',
      body: {
        inviterId: '用户ID',
        invitationCount: 10 // 邀请数量
      }
    }
  })
}