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

    console.log('测试邀请奖励处理:', { inviteCode, userId })

    const supabase = createServerSupabaseClient()

    // 首先验证邀请码
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
        error: '邀请码无效或已过期',
        details: inviteError
      })
    }

    console.log('邀请码验证成功:', inviteData)

    // 类型断言
    const invite = inviteData as any

    // 检查是否已经使用过这个邀请码
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
        error: '检查邀请记录失败',
        details: checkError
      })
    }

    if (existingInvitation) {
      console.log('用户已经使用过此邀请码')
      return NextResponse.json({
        success: false,
        error: '您已经使用过此邀请码'
      })
    }

    // 获取邀请者的积分记录
    const { data: inviterPoints, error: pointsError } = await supabase
      .from('user_points')
      .select('*')
      .eq('user_id', invite.inviter_id)
      .single()

    if (pointsError || !inviterPoints) {
      console.error('获取邀请者积分失败:', pointsError)
      return NextResponse.json({
        success: false,
        error: '获取邀请者积分失败',
        details: pointsError
      })
    }

    console.log('邀请者当前积分:', (inviterPoints as any)?.points)

    // 使用数据库函数处理邀请奖励
    const { data: rewardData, error: rewardError } = await (supabase as any)
      .rpc('process_invitation_reward', {
        p_invite_code: inviteCode,
        p_new_user_id: userId,
        p_ip_address: 'test_ip',
        p_user_agent: 'test_agent'
      })

    if (rewardError) {
      console.error('处理邀请奖励失败:', rewardError)
      return NextResponse.json({
        success: false,
        error: '处理邀请奖励失败',
        details: rewardError
      })
    }

    console.log('邀请奖励处理成功:', rewardData)

    // 获取更新后的积分
    const { data: updatedPoints, error: updateError } = await supabase
      .from('user_points')
      .select('*')
      .eq('user_id', invite.inviter_id)
      .single()

    if (updateError) {
      console.error('获取更新后积分失败:', updateError)
    } else {
      console.log('邀请者更新后积分:', (updatedPoints as any)?.points)
    }

    return NextResponse.json({
      success: true,
      data: {
        inviteData,
        rewardData,
        inviterName: invite.inviter?.name,
        inviterEmail: invite.inviter?.email,
        previousPoints: (inviterPoints as any).points,
        updatedPoints: (updatedPoints as any)?.points,
        pointsAwarded: updatedPoints ? (updatedPoints as any).points - (inviterPoints as any).points : 0
      }
    })

  } catch (error) {
    console.error('测试邀请奖励API错误:', error)
    return NextResponse.json({
      success: false,
      error: '服务器错误',
      details: error
    })
  }
}