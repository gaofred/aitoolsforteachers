import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { z } from 'zod'

const signInSchema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
  password: z.string().min(1, "请输入密码")
})

export async function POST(request: NextRequest) {
  try {
    console.log('登录API被调用')
    
    const body = await request.json()
    console.log('请求body:', { email: body.email, password: '***' })
    
    const validation = signInSchema.safeParse(body)

    if (!validation.success) {
      console.error('验证失败:', validation.error)
      return NextResponse.json(
        { error: "输入数据无效", details: validation.error.issues.map(e => e.message).join(", ") },
        { status: 400 }
      )
    }

    const { email, password } = validation.data
    
    console.log('创建Supabase客户端...')
    let supabase
    try {
      supabase = createServerSupabaseClient()
      console.log('Supabase客户端创建成功')
    } catch (createError) {
      console.error('创建Supabase客户端失败:', createError)
      return NextResponse.json(
        { error: "服务器配置错误: " + (createError instanceof Error ? createError.message : "未知错误") },
        { status: 500 }
      )
    }

    // 使用Supabase进行邮箱登录
    console.log('调用Supabase登录API...')
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    console.log('Supabase响应 - 有错误:', !!error, '有用户:', !!data?.user, '有会话:', !!data?.session)

    if (error) {
      console.error('Supabase登录失败:', error)
      
      // 提供更详细的错误信息
      let errorMessage = '登录失败'
      if (error.message.includes('Invalid login credentials')) {
        errorMessage = '邮箱或密码错误'
      } else {
        errorMessage = `登录失败: ${error.message}`
      }

      return NextResponse.json(
        {
          error: errorMessage,
          details: error,
          suggestion: "请检查邮箱和密码是否正确，或尝试重置密码。"
        },
        { status: 400 }
      )
    }

    if (data.user && data.session) {
      // 设置认证cookie
      const response = NextResponse.json({
        message: "登录成功！",
        user: {
          id: data.user.id,
          email: data.user.email,
          emailConfirmed: data.user.email_confirmed_at != null
        }
      })

      // 设置Supabase会话cookie
      if (data.session.access_token) {
        response.cookies.set('sb-access-token', data.session.access_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7 // 7天
        })
      }

      if (data.session.refresh_token) {
        response.cookies.set('sb-refresh-token', data.session.refresh_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 30 // 30天
        })
      }

      return response
    }

    return NextResponse.json(
      { error: "登录失败，请稍后重试" },
      { status: 400 }
    )

  } catch (error) {
    console.error('登录异常:', error)
    const errorMessage = error instanceof Error ? error.message : "未知错误"
    console.error('错误详情:', errorMessage)
    
    // 确保返回有效的JSON响应
    return NextResponse.json(
      { 
        error: "登录失败: " + errorMessage,
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}







