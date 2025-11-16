import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const searchParams = request.nextUrl.searchParams

    // 获取邀请码和其他参数
    const inviteCode = searchParams.get('invite_code')
    const nextUrl = searchParams.get('next') || '/'

    console.log('Google OAuth请求，邀请码:', inviteCode)

    // 构建回调URL，包含邀请码参数
    let redirectTo = `${process.env.NEXTAUTH_URL}/api/auth/callback`
    const params = new URLSearchParams()

    if (nextUrl && nextUrl !== '/') {
      params.set('next', nextUrl)
    }

    if (inviteCode) {
      params.set('invite_code', inviteCode)
    }

    if (params.toString()) {
      redirectTo += `?${params.toString()}`
    }

    // 构建Google OAuth登录URL
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })

    if (error) {
      console.error('Google OAuth初始化失败:', error)
      return NextResponse.json(
        { error: 'Google登录初始化失败' },
        { status: 400 }
      )
    }

    console.log('Google OAuth重定向URL:', data.url)
    // 重定向到Google OAuth页面
    return NextResponse.redirect(data.url)

  } catch (error) {
    console.error('Google登录错误:', error)
    return NextResponse.json(
      { error: 'Google登录失败' },
      { status: 500 }
    )
  }
}


























