import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const debugInfo: any = {}

    // 1. 检查最近的邀请记录
    const { data: recentInvitations, error: invitationsError } = await supabase
      .from('invitations')
      .select(`
        *,
        inviter:users!invitations_inviter_id_fkey (name, email),
        invited_user:users!invitations_invited_user_id_fkey (name, email)
      `)
      .order('created_at', { ascending: false })
      .limit(10)

    debugInfo.recentInvitations = recentInvitations || []
    debugInfo.invitationsError = invitationsError

    // 2. 检查积分交易记录
    const { data: pointTransactions, error: transactionsError } = await supabase
      .from('point_transactions')
      .select(`
        *,
        user:users(id, name, email)
      `)
      .or('description.ilike.%邀请%,description.ilike.%invite%')
      .order('created_at', { ascending: false })
      .limit(10)

    debugInfo.pointTransactions = pointTransactions || []
    debugInfo.transactionsError = transactionsError

    // 3. 检查邀请奖励发放记录
    const { data: payouts, error: payoutsError } = await supabase
      .from('invitation_reward_payouts')
      .select(`
        *,
        inviter:users(id, name, email),
        invited_user:users(id, name, email)
      `)
      .order('created_at', { ascending: false })
      .limit(10)

    debugInfo.payouts = payouts || []
    debugInfo.payoutsError = payoutsError

    // 4. 检查用户积分状态
    const { data: userPoints, error: pointsError } = await supabase
      .from('user_points')
      .select(`
        *,
        user:users(id, name, email)
      `)
      .order('points', { ascending: false })
      .limit(10)

    debugInfo.userPoints = userPoints || []
    debugInfo.pointsError = pointsError

    // 5. 检查邀请码状态
    const { data: inviteCodes, error: codesError } = await supabase
      .from('invitation_codes')
      .select(`
        *,
        inviter:users(id, name, email)
      `)
      .order('created_at', { ascending: false })
      .limit(10)

    debugInfo.inviteCodes = inviteCodes || []
    debugInfo.codesError = codesError

    // 6. 检查里程碑奖励配置
    const { data: milestones, error: milestonesError } = await supabase
      .from('invitation_milestones')
      .select('*')
      .eq('is_active', true)
      .order('threshold')

    debugInfo.milestones = milestones || []
    debugInfo.milestonesError = milestonesError

    // 7. 检查最近注册用户的邀请情况
    const { data: recentUsers, error: recentUsersError } = await supabase
      .from('users')
      .select(`
        id,
        name,
        email,
        created_at,
        invitations!invitations_invited_user_id_fkey (
          id,
          status,
          inviter_id,
          inviter:users!invitations_inviter_id_fkey (name)
        )
      `)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(10)

    debugInfo.recentUsers = recentUsers || []
    debugInfo.recentUsersError = recentUsersError

    // 8. 统计信息 - 修复语法错误
    const { data: allInvitations, error: allInvitationsError } = await supabase
      .from('invitations')
      .select('status')

    // 手动统计状态
    const stats = allInvitations?.reduce((acc: any, inv: any) => {
      acc[inv.status] = (acc[inv.status] || 0) + 1
      return acc
    }, {}) || {}

    debugInfo.invitationStats = Object.entries(stats).map(([status, count]) => ({
      status,
      count: count as number
    }))
    debugInfo.statsError = allInvitationsError

    return NextResponse.json({
      success: true,
      data: debugInfo,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('调试邀请积分API错误:', error)
    return NextResponse.json({
      success: false,
      error: '调试API出错',
      details: error
    }, { status: 500 })
  }
}