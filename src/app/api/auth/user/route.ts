import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentSupabaseClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const accessToken = cookieStore.get('sb-access-token')?.value

    if (!accessToken) {
      return NextResponse.json(
        { error: '未认证' },
        { status: 401 }
      )
    }

    const supabase = createServerComponentSupabaseClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)

    if (authError || !user) {
      return NextResponse.json(
        { error: '无效的认证令牌' },
        { status: 401 }
      )
    }

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
      return NextResponse.json(
        { error: '获取用户信息失败' },
        { status: 404 }
      )
    }

    return NextResponse.json(userData)

  } catch (error) {
    console.error('获取用户信息错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}