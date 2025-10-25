import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    console.log('测试API：开始查询point_transactions表...')

    // 测试查询所有交易记录
    const { data: allTransactions, error: allError } = await supabase
      .from('point_transactions')
      .select('*')
      .limit(5)

    if (allError) {
      console.error('测试API - 查询所有交易失败:', allError)
      return NextResponse.json({
        error: '查询所有交易失败',
        details: allError
      }, { status: 500 })
    }

    console.log('测试API - 查询结果:', allTransactions)

    // 测试查询用户表
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email')
      .limit(3)

    if (usersError) {
      console.error('测试API - 查询用户失败:', usersError)
      return NextResponse.json({
        error: '查询用户失败',
        details: usersError
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      transactions: allTransactions,
      users: users,
      totalTransactions: allTransactions.length,
      totalUsers: users.length
    })

  } catch (error) {
    console.error('测试API - 服务器错误:', error)
    return NextResponse.json({
      error: '服务器错误',
      details: error
    }, { status: 500 })
  }
}