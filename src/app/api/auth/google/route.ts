import { NextRequest, NextResponse } from 'next/server'
import { supabaseAuth } from '@/lib/supabase-auth'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    if (error) {
      return NextResponse.redirect(
        new URL('/auth/signin?error=auth_failed', request.url)
      )
    }

    if (!code) {
      const { data } = await supabaseAuth.signInWithGoogle()

      if (data.url) {
        return NextResponse.redirect(data.url)
      }

      return NextResponse.redirect(
        new URL('/auth/signin?error=auth_init_failed', request.url)
      )
    }

    const { user, session } = await supabaseAuth.handleAuthCallback(code)

    if (session.access_token) {
      const cookieStore = cookies()
      cookieStore.set('sb-access-token', session.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7天
        path: '/'
      })

      cookieStore.set('sb-refresh-token', session.refresh_token || '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30天
        path: '/'
      })
    }

    return NextResponse.redirect(
      new URL('/?signed_in=true', request.url)
    )

  } catch (error) {
    console.error('Google认证错误:', error)
    return NextResponse.redirect(
      new URL('/auth/signin?error=auth_error', request.url)
    )
  }
}