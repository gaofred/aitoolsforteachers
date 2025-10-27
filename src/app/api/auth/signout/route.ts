import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()

    // Supabase会自动处理session清理和cookie删除
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('Supabase登出错误:', error)
      return NextResponse.json(
        { error: '登出失败: ' + error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { message: '登出成功' },
      { status: 200 }
    )

  } catch (error) {
    console.error('登出错误:', error)
    return NextResponse.json(
      { error: '登出失败' },
      { status: 500 }
    )
  }
}