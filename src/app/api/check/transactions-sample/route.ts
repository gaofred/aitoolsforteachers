import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET() {
  try {
    const supabase = createServerSupabaseClient()

    // 查询最新的积分交易记录
    const { data: transactions, error } = await supabase
      .from('point_transactions' as any)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(3)

    if (error) {
      console.error('查询积分交易记录失败:', error)
      return NextResponse.json({
        success: false,
        error: error.message
      })
    }

    // 如果有数据，显示字段信息
    if (transactions && transactions.length > 0) {
      const columns = Object.keys(transactions[0])
      return NextResponse.json({
        success: true,
        columns: columns,
        sampleRecord: transactions[0],
        totalRecords: transactions.length
      })
    } else {
      return NextResponse.json({
        success: true,
        message: '没有找到积分交易记录',
        columns: [],
        totalRecords: 0
      })
    }

  } catch (error) {
    console.error('查询失败:', error)
    return NextResponse.json({
      success: false,
      error: '服务器错误',
      details: error
    }, { status: 500 })
  }
}