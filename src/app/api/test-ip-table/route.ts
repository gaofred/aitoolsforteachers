import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    console.log('检查ip_registration_logs表是否存在...')
    const supabase = createServerSupabaseClient()

    // 尝试查询ip_registration_logs表
    const { data, error } = await supabase
      .from('ip_registration_logs')
      .select('count')
      .limit(1)

    console.log('ip_registration_logs表检查结果:', {
      hasError: !!error,
      hasData: !!data,
      error: error?.message,
      data: data
    })

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        tableExists: false,
        details: error
      })
    }

    return NextResponse.json({
      success: true,
      tableExists: true,
      message: 'ip_registration_logs表存在且可访问',
      data: data
    })

  } catch (error) {
    console.error('检查表时发生异常:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "未知错误",
      tableExists: false
    }, { status: 500 })
  }
}