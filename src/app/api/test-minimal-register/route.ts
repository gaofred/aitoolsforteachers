import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    console.log('最简化Supabase注册测试（使用客户端SDK）...')

    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: '邮箱和密码不能为空' },
        { status: 400 }
      )
    }

    // 使用客户端SDK而不是服务端SDK
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    console.log('开始使用客户端SDK创建用户...')

    // 尝试最简单的用户创建
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    console.log('客户端SDK注册结果:', {
      hasError: !!error,
      hasUser: !!data?.user,
      hasSession: !!data?.session,
      error: error?.message,
      errorCode: error?.code,
      userId: data?.user?.id
    })

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        details: error
      }, { status: 400 })
    }

    // 如果成功，立即删除用户
    if (data.user?.id) {
      console.log('删除测试用户...')
      try {
        // 注意：删除需要服务端SDK，所以这里我们先不删除
        console.log('测试用户创建成功，ID:', data.user.id)
      } catch (err) {
        console.error('清理测试数据时出错:', err)
      }
    }

    return NextResponse.json({
      success: true,
      message: '客户端SDK注册测试成功',
      user: {
        id: data.user?.id,
        email: data.user?.email,
        emailConfirmed: data.user?.email_confirmed_at != null
      }
    })

  } catch (error) {
    console.error('客户端SDK测试异常:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "未知错误",
      details: error
    }, { status: 500 })
  }
}