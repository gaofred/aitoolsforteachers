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

    console.log('直接处理邀请奖励:', { inviteCode, userId })

    const supabase = createServerSupabaseClient()

    // 1. 验证邀请码
    const { data: inviteData, error: inviteError } = await supabase
      .from('invitation_codes')
      .select(`
        *,
        inviter:users!invitation_codes_inviter_id_fkey (
          id,
          name,
          email
        )
      `)
      .eq('code', inviteCode)
      .eq('is_active', true)
      .single()

    if (inviteError || !inviteData) {
      console.error('邀请码验证失败:', inviteError)
      return NextResponse.json({
        success: false,
        error: '邀请码无效或已过期'
      })
    }

    // 类型断言，解决TypeScript类型推断问题
    const invite = inviteData as any
    console.log('邀请码验证成功:', invite.code)

    // 2. 检查是否已经使用过这个邀请码
    const { data: existingInvitation, error: checkError } = await supabase
      .from('invitations')
      .select('*')
      .eq('invitation_code_id', invite.id)
      .eq('invited_user_id', userId)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('检查邀请记录失败:', checkError)
      return NextResponse.json({
        success: false,
        error: '检查邀请记录失败'
      })
    }

    if (existingInvitation) {
      console.log('用户已经使用过此邀请码')
      return NextResponse.json({
        success: false,
        error: '您已经使用过此邀请码'
      })
    }

    // 3. 检查是否自己邀请自己
    if (invite.inviter_id === userId) {
      return NextResponse.json({
        success: false,
        error: '不能邀请自己'
      })
    }

    // 4. 获取邀请者当前积分
    const { data: inviterPoints, error: pointsError } = await supabase
      .from('user_points')
      .select('*')
      .eq('user_id', invite.inviter_id)
      .single()

    if (pointsError || !inviterPoints) {
      console.error('获取邀请者积分失败:', pointsError)
      return NextResponse.json({
        success: false,
        error: '获取邀请者积分失败'
      })
    }

    console.log('邀请者当前积分:', (inviterPoints as any).points)

    // 5. 创建邀请记录
    const { data: newInvitation, error: invitationError } = await supabase
      .from('invitations')
      .insert({
        invitation_code_id: invite.id,
        inviter_id: invite.inviter_id,
        invited_user_id: userId,
        status: 'completed',
        ip_address: 'direct_claim',
        user_agent: 'direct_claim_api',
        registered_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      } as any)
      .select()
      .single()

    if (invitationError) {
      console.error('创建邀请记录失败:', invitationError)
      return NextResponse.json({
        success: false,
        error: '创建邀请记录失败'
      })
    }

    console.log('邀请记录创建成功:', (newInvitation as any)?.id)

    // 6. 计算奖励
    let basePoints = 30
    let bonusPoints = 0
    let milestoneRewards: Array<{threshold: number, points: number, description: string}> = []

    // 获取当前成功邀请人数
    const { data: successfulInvites, error: countError } = await supabase
      .from('invitations')
      .select('id')
      .eq('inviter_id', invite.inviter_id)
      .eq('status', 'completed')

    if (!countError && successfulInvites) {
      const inviteCount = successfulInvites.length
      console.log('邀请者成功邀请次数:', inviteCount)

      // 获取里程碑奖励配置
      const { data: milestones, error: milestoneError } = await supabase
        .from('invitation_milestones')
        .select('*')
        .eq('is_active', true)
        .order('threshold')

      if (!milestoneError && milestones) {
        for (const milestone of milestones as any[]) {
          if (inviteCount === milestone.threshold) {
            // 如果刚好达到里程碑，给予奖励
            bonusPoints += milestone.bonus_points
            milestoneRewards.push({
              threshold: milestone.threshold,
              points: milestone.bonus_points,
              description: milestone.description || `达成${milestone.threshold}人里程碑`
            })
            console.log(`🎉 达到${milestone.threshold}人里程碑奖励！额外获得${milestone.bonus_points}点`)
          }
        }
      }
    }

    const totalPoints = basePoints + bonusPoints
    console.log('应获得积分:', {
      basePoints,
      bonusPoints,
      totalPoints,
      milestoneRewards: milestoneRewards.length > 0 ? milestoneRewards : '无里程碑奖励'
    })

    // 7. 发放积分奖励
    const { data: transaction, error: transactionError } = await supabase
      .from('point_transactions')
      .insert({
        user_id: invite.inviter_id,
        points_change: totalPoints,
        type: 'BONUS',
        description: `邀请奖励 - ${invite.code} (${invite.inviter?.name || '朋友'} 邒请新用户)`,
        created_at: new Date().toISOString()
      } as any)
      .select()
      .single()

    if (transactionError) {
      console.error('创建积分交易失败:', transactionError)
      // 回滚邀请记录
      await supabase
        .from('invitations')
        .delete()
        .eq('id', (newInvitation as any)?.id)

      return NextResponse.json({
        success: false,
        error: '发放积分奖励失败'
      })
    }

    console.log('积分交易创建成功:', (transaction as any)?.id)

    // 8. 更新邀请者积分
    const { error: updateError } = await (supabase
      .from('user_points') as any)
      .update({
        points: (inviterPoints as any).points + totalPoints,
        last_updated: new Date().toISOString()
      })
      .eq('user_id', invite.inviter_id)

    if (updateError) {
      console.error('更新邀请者积分失败:', updateError)
      return NextResponse.json({
        success: false,
        error: '更新邀请者积分失败'
      })
    }

    console.log('邀请者积分更新成功')

    // 9. 创建奖励发放记录
    const { error: payoutError } = await (supabase
      .from('invitation_reward_payouts') as any)
      .insert({
        invitation_id: (newInvitation as any)?.id,
        inviter_id: invite.inviter_id,
        invited_user_id: userId,
        reward_type: 'points',
        points_awarded: totalPoints,
        bonus_applied: bonusPoints > 0,
        payout_description: `基础奖励: ${basePoints}点${bonusPoints > 0 ? `, 里程碑奖励: ${bonusPoints}点 (${milestoneRewards.map(m => m.description).join(', ')})` : ''}`,
        transaction_id: (transaction as any)?.id,
        created_at: new Date().toISOString()
      })

    if (payoutError) {
      console.error('创建奖励发放记录失败:', payoutError)
      // 不影响主流程，只记录错误
    } else {
      console.log('奖励发放记录创建成功')
    }

    // 10. 更新邀请码统计
    const { error: updateStatsError } = await (supabase
      .from('invitation_codes') as any)
      .update({
        successful_invitations: invite.successful_invitations + 1,
        total_invitations: invite.total_invitations + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', invite.id)

    if (updateStatsError) {
      console.error('更新邀请码统计失败:', updateStatsError)
    } else {
      console.log('邀请码统计更新成功')
    }

    // 11. 返回成功结果
    const finalPoints = (inviterPoints as any).points + totalPoints

    return NextResponse.json({
      success: true,
      data: {
        invitationId: (newInvitation as any)?.id,
        transactionId: (transaction as any)?.id,
        pointsAwarded: totalPoints,
        basePoints: basePoints,
        bonusPoints: bonusPoints,
        inviterName: invite.inviter?.name,
        inviterEmail: invite.inviter?.email,
        previousPoints: (inviterPoints as any).points,
        newPoints: finalPoints
      }
    })

  } catch (error) {
    console.error('直接处理邀请奖励API错误:', error)
    return NextResponse.json({
      success: false,
      error: '服务器错误',
      details: error
    })
  }
}