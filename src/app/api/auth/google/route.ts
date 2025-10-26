import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    
    // 构建Google OAuth登录URL
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/callback`,
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











