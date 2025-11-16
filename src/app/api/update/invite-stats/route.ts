import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { inviterId, forceCount } = await request.json()

    if (!inviterId) {
      return NextResponse.json({
        success: false,
        error: '缺少邀请者ID'
      })
    }

    console.log('更新邀请统计:', inviterId)
    const supabase = createServerSupabaseClient()

    // 1. 统计实际的成功邀请数量
    let actualCount = 0

    if (forceCount !== undefined) {
      // 使用指定的数量（用于测试）
      actualCount = forceCount
      console.log(`使用指定邀请数量: ${actualCount}`)
    } else {
      // 从数据库统计实际的邀请数量
      const { data: invitations, error: inviteError } = await supabase
        .from('invitations' as any)
        .select('*')
        .eq('inviter_id', inviterId)
        .eq('status', 'completed')

      if (inviteError) {
        console.error('统计邀请数量失败:', inviteError)
        return NextResponse.json({
          success: false,
          error: '统计邀请数量失败',
          details: inviteError
        })
      }

      actualCount = invitations?.length || 0
      console.log(`实际统计邀请数量: ${actualCount}`)
    }

    // 2. 更新或创建邀请统计记录
    const { data: stats, error: upsertError } = await supabase
      .from('invitation_stats' as any)
      .upsert({
        inviter_id: inviterId,
        successful_invitations: actualCount,
        completed_invitations: actualCount,
        total_rewards_earned: 0 // 这个字段可以后续计算
      })
      .select()
      .single()

    if (upsertError) {
      console.error('更新邀请统计失败:', upsertError)
      return NextResponse.json({
        success: false,
        error: '更新邀请统计失败',
        details: upsertError
      })
    }

    // 3. 获取邀请者信息
    const { data: user, error: userError } = await supabase
      .from('users' as any)
      .select('name, email')
      .eq('id', inviterId)
      .single()

    if (!userError && user) {
      // 更新统计记录中的用户信息
      await supabase
        .from('invitation_stats' as any)
        .update({
          inviter_name: user.name,
          inviter_email: user.email
        })
        .eq('inviter_id', inviterId)
    }

    console.log(`邀请统计更新成功: ${actualCount}人`)

    return NextResponse.json({
      success: true,
      message: '邀请统计更新成功',
      inviterId: inviterId,
      successfulInvitations: actualCount,
      stats: stats
    })

  } catch (error) {
    console.error('更新邀请统计失败:', error)
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
    message: '请使用 POST 方法更新邀请统计',
    usage: {
      method: 'POST',
      body: {
        inviterId: '用户ID',
        forceCount: 10 // 可选，强制设置邀请数量（用于测试）
      }
    }
  })
}