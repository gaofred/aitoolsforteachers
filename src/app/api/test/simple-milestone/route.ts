import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { inviterId, threshold, bonusPoints } = await request.json()

    if (!inviterId || threshold === undefined || bonusPoints === undefined) {
      return NextResponse.json({
        success: false,
        error: '缺少必要参数'
      })
    }

    console.log('简化里程碑奖励测试:', { inviterId, threshold, bonusPoints })
    const supabase = createServerSupabaseClient()

    // 1. 获取用户当前积分
    const { data: userPoints, error: pointsError } = await supabase
      .from('user_points' as any)
      .select('*')
      .eq('user_id', inviterId)
      .single()

    if (pointsError && pointsError.code !== 'PGRST116') {
      console.error('获取用户积分失败:', pointsError)
      return NextResponse.json({
        success: false,
        error: '获取用户积分失败',
        details: pointsError
      })
    }

    const currentPoints = userPoints?.points || 0
    const newPoints = currentPoints + bonusPoints

    // 2. 创建积分交易记录
    const { data: transaction, error: transactionError } = await supabase
      .from('point_transactions' as any)
      .insert({
        user_id: inviterId,
        amount: bonusPoints,
        type: 'BONUS',
        description: `里程碑奖励测试 - 成功邀请${threshold}位朋友`,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (transactionError) {
      console.error('创建积分交易失败:', transactionError)
      return NextResponse.json({
        success: false,
        error: '创建积分交易失败',
        details: transactionError
      })
    }

    // 3. 更新用户积分
    const { error: updateError } = await supabase
      .from('user_points' as any)
      .update({
        points: newPoints,
        last_updated: new Date().toISOString()
      })
      .eq('user_id', inviterId)

    if (updateError) {
      console.error('更新用户积分失败:', updateError)
      return NextResponse.json({
        success: false,
        error: '更新用户积分失败',
        details: updateError
      })
    }

    console.log(`里程碑奖励发放成功: ${bonusPoints}点 (${currentPoints}→${newPoints})`)

    return NextResponse.json({
      success: true,
      message: '里程碑奖励发放成功！',
      data: {
        threshold: threshold,
        bonusPoints: bonusPoints,
        transactionId: transaction.id,
        previousPoints: currentPoints,
        newPoints: newPoints,
        description: `成功邀请${threshold}位朋友的里程碑奖励`
      }
    })

  } catch (error) {
    console.error('简化里程碑奖励测试失败:', error)
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
    message: '请使用 POST 方法测试简化里程碑奖励',
    usage: {
      method: 'POST',
      body: {
        inviterId: '用户ID',
        threshold: 10,
        bonusPoints: 100
      }
    }
  })
}