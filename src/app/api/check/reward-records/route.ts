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

    const supabase = createServerSupabaseClient()

    // 查询奖励发放记录
    const { data: rewards, error: rewardsError } = await supabase
      .from('invitation_reward_payouts' as any)
      .select('*')
      .eq('inviter_id', inviterId)
      .order('payout_date', { ascending: false })

    if (rewardsError) {
      console.error('查询奖励记录失败:', rewardsError)
      return NextResponse.json({
        success: false,
        error: rewardsError.message
      })
    }

    // 查询里程碑配置
    const { data: milestones, error: milestonesError } = await supabase
      .from('invitation_milestones' as any)
      .select('*')
      .eq('is_active', true)
      .order('threshold', { ascending: true })

    if (milestonesError) {
      console.error('查询里程碑失败:', milestonesError)
    }

    return NextResponse.json({
      success: true,
      inviterId: inviterId,
      existingRewards: rewards || [],
      milestoneCount: milestones?.length || 0,
      milestones: milestones || [],
      paidMilestoneIds: rewards?.map((r: any) => r.milestone_id) || [],
      hasRewards: (rewards?.length || 0) > 0
    })

  } catch (error) {
    console.error('检查奖励记录失败:', error)
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
    message: '请使用 POST 方法检查奖励记录',
    usage: {
      method: 'POST',
      body: { inviterId: '用户ID' }
    }
  })
}