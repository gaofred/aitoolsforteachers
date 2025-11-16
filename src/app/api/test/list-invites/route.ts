import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()

    // 获取所有活跃的邀请码
    const { data: invites, error: inviteError } = await supabase
      .from('invitation_codes')
      .select(`
        *,
        inviter:users!invitation_codes_inviter_id_fkey (
          id,
          name,
          email
        )
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (inviteError) {
      console.error('获取邀请码失败:', inviteError)
      return NextResponse.json({
        success: false,
        error: '获取邀请码失败',
        details: inviteError
      })
    }

    // 获取最近的用户
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, name, email, created_at')
      .order('created_at', { ascending: false })
      .limit(10)

    if (userError) {
      console.error('获取用户失败:', userError)
      return NextResponse.json({
        success: false,
        error: '获取用户失败',
        details: userError
      })
    }

    // 获取邀请记录
    const { data: invitations, error: invitationError } = await supabase
      .from('invitations')
      .select(`
        *,
        invitation_code:invitation_codes (
          code,
          inviter_id
        ),
        invited_user:users (
          name,
          email
        )
      `)
      .order('created_at', { ascending: false })
      .limit(10)

    if (invitationError) {
      console.error('获取邀请记录失败:', invitationError)
    }

    return NextResponse.json({
      success: true,
      data: {
        invites: invites || [],
        users: users || [],
        invitations: invitations || []
      }
    })

  } catch (error) {
    console.error('测试邀请列表API错误:', error)
    return NextResponse.json({
      success: false,
      error: '服务器错误',
      details: error
    })
  }
}