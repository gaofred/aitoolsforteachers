import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: '缺少用户ID'
      })
    }

    const supabase = createServerSupabaseClient()

    // 1. 获取用户积分记录
    const { data: userPoints, error: pointsError } = await supabase
      .from('user_points' as any)
      .select('*')
      .eq('user_id', userId)
      .single()

    if (pointsError) {
      return NextResponse.json({
        success: false,
        error: '获取用户积分失败',
        details: pointsError
      })
    }

    // 2. 获取所有积分交易记录
    const { data: transactions, error: transactionError } = await supabase
      .from('point_transactions' as any)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (transactionError) {
      return NextResponse.json({
        success: false,
        error: '获取交易记录失败',
        details: transactionError
      })
    }

    // 3. 计算总积分变化
    const totalPoints = transactions?.reduce((sum: number, t: any) => sum + (t.amount || 0), 0) || 0

    return NextResponse.json({
      success: true,
      data: {
        userId: userId,
        currentPoints: userPoints?.points || 0,
        totalTransactionPoints: totalPoints,
        transactionCount: transactions?.length || 0,
        recentTransactions: transactions?.slice(0, 5) || [],
        userPointsRecord: userPoints,
        pointsDiscrepancy: (userPoints?.points || 0) !== totalPoints
      }
    })

  } catch (error) {
    console.error('检查用户积分失败:', error)
    return NextResponse.json({
      success: false,
      error: '服务器错误',
      details: error
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: '请使用 POST 方法检查用户积分',
    usage: {
      method: 'POST',
      body: {
        userId: '用户ID'
      }
    }
  })
}