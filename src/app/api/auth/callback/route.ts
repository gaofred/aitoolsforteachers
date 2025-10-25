import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const next = requestUrl.searchParams.get('next') ?? '/'

    if (code) {
      const supabase = createServerSupabaseClient()
      
      // 交换授权码获取会话
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('Google OAuth回调处理失败:', error)
        return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/auth/signin?error=oauth_callback_failed`)
      }

      if (data.user) {
        // 检查用户是否已存在于我们的数据库中
        const { data: existingUser, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single()

        if (userError && userError.code === 'PGRST116') {
          // 用户不存在，创建新用户
          const { error: createError } = await supabase
            .from('users')
            .insert({
              id: data.user.id,
              email: data.user.email,
              name: data.user.user_metadata?.full_name || data.user.email?.split('@')[0],
              avatar_url: data.user.user_metadata?.avatar_url,
              provider: 'google',
              email_verified: data.user.email_confirmed_at ? new Date(data.user.email_confirmed_at).toISOString() : null,
            } as any)

          if (createError) {
            console.error('创建用户失败:', createError)
            // 即使创建用户失败，也允许登录，因为触发器会自动创建
          }
        }

        // 设置认证cookie
        const response = NextResponse.redirect(`${process.env.NEXTAUTH_URL}${next}?signed_in=true`)
        
        // 设置Supabase会话cookie
        if (data.session?.access_token) {
          response.cookies.set('sb-access-token', data.session.access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7 // 7天
          })
        }

        if (data.session?.refresh_token) {
          response.cookies.set('sb-refresh-token', data.session.refresh_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 30 // 30天
          })
        }

        return response
      }
    }

    // 如果没有代码或用户数据，重定向到登录页面
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/auth/signin?error=oauth_callback_failed`)

  } catch (error) {
    console.error('OAuth回调处理错误:', error)
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/auth/signin?error=callback_processing_failed`)
  }
}









