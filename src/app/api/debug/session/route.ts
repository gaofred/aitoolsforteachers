import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    console.log('=== 会话调试开始 ===')

    // 检查所有cookie
    const cookieStore = cookies()
    const allCookies = cookieStore.getAll()
    console.log('所有Cookie:', allCookies.map(c => ({ name: c.name, value: c.value.substring(0, 20) + '...' })))

    // 检查Supabase特定的cookie
    const sbAccessToken = cookieStore.get('sb-access-token')
    const sbRefreshToken = cookieStore.get('sb-refresh-token')

    console.log('Supabase Access Token存在:', !!sbAccessToken)
    console.log('Supabase Refresh Token存在:', !!sbRefreshToken)

    // 尝试创建Supabase客户端
    let supabase
    try {
      supabase = createServerSupabaseClient()
      console.log('Supabase客户端创建成功')
    } catch (error) {
      console.error('Supabase客户端创建失败:', error)
      return NextResponse.json({
        error: 'Supabase客户端创建失败',
        details: error instanceof Error ? error.message : error
      }, { status: 500 })
    }

    // 检查用户认证状态
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('认证检查结果:', { user: !!user, error: !!authError })

    if (authError) {
      console.error('认证错误:', authError)
    }

    if (user) {
      console.log('用户信息:', { id: user.id, email: user.email })
    }

    // 检查会话状态
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    console.log('会话检查结果:', { session: !!session, error: !!sessionError })

    if (sessionError) {
      console.error('会话错误:', sessionError)
    }

    if (session) {
      console.log('会话信息:', {
        hasAccessToken: !!session.access_token,
        hasRefreshToken: !!session.refresh_token,
        expiresAt: new Date(session.expires_at! * 1000).toISOString()
      })
    }

    console.log('=== 会话调试结束 ===')

    return NextResponse.json({
      success: true,
      data: {
        cookies: {
          count: allCookies.length,
          hasSbAccessToken: !!sbAccessToken,
          hasSbRefreshToken: !!sbRefreshToken,
          allCookieNames: allCookies.map(c => c.name)
        },
        auth: {
          hasUser: !!user,
          userEmail: user?.email || null,
          authError: authError?.message || null
        },
        session: {
          hasSession: !!session,
          hasAccessToken: !!session?.access_token,
          hasRefreshToken: !!session?.refresh_token,
          expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
          sessionError: sessionError?.message || null
        }
      }
    })

  } catch (error) {
    console.error('会话调试异常:', error)
    return NextResponse.json({
      error: '会话调试失败',
      details: error instanceof Error ? error.message : error
    }, { status: 500 })
  }
}