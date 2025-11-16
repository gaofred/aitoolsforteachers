import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: '邮箱和密码不能为空' },
        { status: 400 }
      )
    }

    console.log('开始测试Supabase注册...')
    const supabase = createServerSupabaseClient()

    // 只测试Supabase注册，不创建业务数据
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: '测试用户'
        },
        emailRedirectTo: undefined // 禁用邮箱重定向
      }
    })

    console.log('Supabase注册结果:', {
      hasError: !!error,
      hasUser: !!data?.user,
      hasSession: !!data?.session,
      error: error?.message,
      userId: data?.user?.id
    })

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        details: error
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: 'Supabase注册成功',
      user: {
        id: data.user?.id,
        email: data.user?.email,
        emailConfirmed: data.user?.email_confirmed_at != null,
        hasSession: !!data?.session
      }
    })

  } catch (error) {
    console.error('测试注册异常:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "未知错误",
      details: error
    }, { status: 500 })
  }
}