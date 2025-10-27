import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { tableName } = await request.json()

    if (!tableName) {
      return NextResponse.json({
        success: false,
        error: '缺少表名'
      })
    }

    const supabase = createServerSupabaseClient()

    // 简化查询表结构：尝试查询一条记录获取字段名
    const { data, error } = await supabase
      .from(tableName as any)
      .select('*')
      .limit(1)

    if (error) {
      console.error('查询表结构失败:', error)
      return NextResponse.json({
        success: false,
        error: error.message
      })
    }

    // 从查询结果中提取字段名
    const columns = data && data.length > 0
      ? Object.keys(data[0]).map(key => ({ column_name: key, data_type: 'unknown' }))
      : []

    return NextResponse.json({
      success: true,
      tableName: tableName,
      columns: columns,
      hasData: data && data.length > 0
    })

  } catch (error) {
    console.error('查询表结构失败:', error)
    return NextResponse.json({
      success: false,
      error: '服务器错误',
      details: error
    }, { status: 500 })
  }
}