import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { processInviteForNewUserServer } from '@/lib/invite-tracking-server'

export async function GET(request: NextRequest) {
  try {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const next = requestUrl.searchParams.get('next') ?? '/'

    if (code) {
      const supabase = createServerSupabaseClient()
      
      // 交换授权码获取会话 - Supabase会自动处理cookie设置
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('Google OAuth回调处理失败:', error)
        return NextResponse.redirect(new URL('/auth/signin?error=oauth_callback_failed', requestUrl.origin))
      }

      if (data.user) {
        // 检查用户是否已存在于我们的数据库中
        const { data: existingUser, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id as any)
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

          if (!createError) {
            console.log('新用户创建成功:', data.user.id)

            // 处理邀请奖励（异步执行，不阻塞登录流程）
            await processInviteForNewUserServer(data.user.id, request).catch((error) => {
              console.error('处理邀请奖励失败:', error)
            })
          } else {
            console.error('创建用户失败:', createError)
            // 即使创建用户失败，也允许登录，因为触发器会自动创建
          }
        } else {
          // 用户已存在，检查是否需要处理邀请奖励
          // 这里可以添加逻辑，如果用户刚注册不久且还没有处理过邀请奖励
          await processInviteForNewUserServer(data.user.id, request).catch((error) => {
            console.error('处理邀请奖励失败:', error)
          })
        }

        // 手动设置Edge浏览器兼容的认证cookies
        const redirectUrl = new URL(next, requestUrl.origin)
        redirectUrl.searchParams.set('signed_in', 'true')
        redirectUrl.searchParams.set('accessToken', data.session?.access_token || '')
        redirectUrl.searchParams.set('refreshToken', data.session?.refresh_token || '')

        const response = NextResponse.redirect(redirectUrl)

        // 设置sb-access-token cookie（整个项目都在使用这个名称）
        if (data.session?.access_token) {
          response.cookies.set('sb-access-token', data.session.access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: data.session.expires_in || 60 * 60 * 24 * 7 // 7天
          })
        }

        // 设置sb-refresh-token cookie
        if (data.session?.refresh_token) {
          response.cookies.set('sb-refresh-token', data.session.refresh_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 30 // 30天
          })
        }

        console.log('Google OAuth回调 - 已设置Edge浏览器兼容的认证cookies')

        return response
      }
    }

    // 如果没有代码或用户数据，重定向到登录页面
    return NextResponse.redirect(new URL('/auth/signin?error=oauth_callback_failed', requestUrl.origin))

  } catch (error) {
    console.error('OAuth回调处理错误:', error)
    const requestUrl = new URL(request.url)
    return NextResponse.redirect(new URL('/auth/signin?error=callback_processing_failed', requestUrl.origin))
  }
}













