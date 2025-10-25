import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const result: any = {
      environment: {
        NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      },
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...',
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    }

    // 测试网络连接
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
        method: 'HEAD',
        headers: {
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY || '',
        }
      })
      result.networkTest = {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      }
    } catch (networkError) {
      result.networkTest = {
        error: networkError instanceof Error ? networkError.message : 'Unknown error',
        code: (networkError as any)?.code
      }
    }

    // 尝试创建Supabase客户端
    try {
      const supabase = createServerSupabaseClient()
      // 尝试一个简单的操作
      const { data, error } = await supabase.from('user_points').select('count').limit(1)
      result.clientTest = {
        success: !error,
        error: error ? error.message : null
      }
    } catch (error) {
      result.clientTest = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}

