import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('sb-access-token')?.value

    if (!accessToken) {
      return NextResponse.json(
        { error: '未认证' },
        { status: 401 }
      )
    }

    const supabase = createServerSupabaseClient()

    // 使用access token获取用户信息
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)

    if (authError || !user) {
      console.error('认证错误:', authError)
      return NextResponse.json(
        { error: '无效的认证令牌' },
        { status: 401 }
      )
    }

    // 获取用户扩展信息
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select(`
        *,
        user_points (*),
        memberships (*)
      `)
      .eq('id', user.id)
      .single()

    if (userError) {
      console.error('获取用户数据错误:', userError)
      // 如果用户数据不存在，返回基本用户信息（不含积分和会员信息）
      return NextResponse.json({
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.email?.split('@')[0],
        avatar_url: user.user_metadata?.avatar_url,
        provider: user.app_metadata?.provider || 'email',
        role: 'USER'
      })
    }

    console.log('用户API返回数据:', userData);
    console.log('用户API最终返回:', userData);
    return NextResponse.json(userData)

  } catch (error) {
    console.error('获取用户信息错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}