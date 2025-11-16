import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const searchParams = request.nextUrl.searchParams
    const tableName = searchParams.get('table')

    if (!tableName) {
      return NextResponse.json({
        success: false,
        error: '请指定表名'
      })
    }

    // 查看指定表的内容
    const { data, error } = await supabase
      .from(tableName as any)
      .select('*')
      .limit(10)

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        code: error.code
      })
    }

    return NextResponse.json({
      success: true,
      table: tableName,
      data: data,
      count: data?.length || 0
    })

  } catch (error) {
    console.error('查看表内容失败:', error)
    return NextResponse.json({
      success: false,
      error: '查看失败',
      details: error
    }, { status: 500 })
  }
}