import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const token_hash = searchParams.get('token_hash')
    const type = searchParams.get('type')
    const next = searchParams.get('next') ?? '/'

    if (token_hash && type) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const { error } = await supabase.auth.verifyOtp({
        token_hash,
        type: type as any,
      })

      if (!error) {
        // 验证成功，重定向到指定页面
        return NextResponse.redirect(`${process.env.NEXTAUTH_URL}${next}?message=邮箱确认成功`)
      }
    }

    // 验证失败，重定向到错误页面
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/auth/signin?error=email_confirmation_failed`)

  } catch (error) {
    console.error('邮箱确认处理错误:', error)
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/auth/signin?error=confirmation_processing_failed`)
  }
}