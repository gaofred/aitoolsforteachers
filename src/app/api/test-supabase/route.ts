import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    // 只测试URL和密钥是否有效
    return NextResponse.json({
      status: '✅ Supabase配置正常',
      url: supabaseUrl,
      keyLength: supabaseAnonKey.length,
      message: '配置有效，但无法测试数据库连接'
    })

  } catch (error) {
    return NextResponse.json({
      status: '❌ 配置错误',
      error: error instanceof Error ? error.message : '未知错误'
    })
  }
}