import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { inviterId, milestoneId } = await request.json()

    if (!inviterId || !milestoneId) {
      return NextResponse.json({
        success: false,
        error: '缺少邀请者ID或里程碑ID'
      })
    }

    console.log('直接发放里程碑奖励:', { inviterId, milestoneId })
    const supabase = createServerSupabaseClient()

    // 1. 获取里程碑信息
    const { data: milestone, error: milestoneError } = await supabase
      .from('invitation_milestones' as any)
      .select('*')
      .eq('id', milestoneId)
      .single()

    if (milestoneError || !milestone) {
      console.error('获取里程碑失败:', milestoneError)
      return NextResponse.json({
        success: false,
        error: '里程碑不存在',
        details: milestoneError
      })
    }

    console.log(`里程碑信息: ${(milestone as any).threshold}人 - ${(milestone as any).bonus_points}点`)

    // 2. 获取用户当前积分
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

    const currentPoints = (userPoints as any)?.points || 0
    const newPoints = currentPoints + (milestone as any).bonus_points

    // 3. 创建积分交易记录
    const { data: transaction, error: transactionError } = await supabase
      .from('point_transactions' as any)
      .insert([{
        user_id: inviterId,
        amount: (milestone as any).bonus_points,
        type: 'BONUS',
        description: `里程碑奖励测试 - 成功邀请${(milestone as any).threshold}位朋友`,
        created_at: new Date().toISOString()
      }] as any)
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

    // 4. 更新用户积分
    const updateCall = (supabase as any).from('user_points').update({
        points: newPoints,
        last_updated: new Date().toISOString()
      })
    const { error: updateError } = await updateCall.eq('user_id', inviterId)

    if (updateError) {
      console.error('更新用户积分失败:', updateError)
      return NextResponse.json({
        success: false,
        error: '更新用户积分失败',
        details: updateError
      })
    }

    // 5. 记录奖励发放（跳过外键约束检查）
    console.log('里程碑奖励发放成功: 跳过payout记录（数据库架构问题）')

    console.log(`里程碑奖励发放成功: ${(milestone as any).bonus_points}点 (${currentPoints}→${newPoints})`)

    return NextResponse.json({
      success: true,
      message: '里程碑奖励发放成功！',
      data: {
        milestoneId: (milestone as any).id,
        threshold: (milestone as any).threshold,
        bonusPoints: (milestone as any).bonus_points,
        description: (milestone as any).description,
        transactionId: (transaction as any)?.id,
        payoutId: null, // 跳过payout记录
        previousPoints: currentPoints,
        newPoints: newPoints
      }
    })

  } catch (error) {
    console.error('直接发放里程碑奖励失败:', error)
    return NextResponse.json({
      success: false,
      error: '服务器错误',
      details: error
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = createServerSupabaseClient()

    // 获取可用的里程碑列表
    const { data: milestones, error } = await supabase
      .from('invitation_milestones' as any)
      .select('*')
      .eq('is_active', true)
      .order('threshold', { ascending: true })

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message
      })
    }

    return NextResponse.json({
      success: true,
      message: '请使用 POST 方法直接发放里程碑奖励',
      milestones: milestones,
      usage: {
        method: 'POST',
        body: {
          inviterId: '用户ID',
          milestoneId: '里程碑ID'
        }
      }
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: '服务器错误',
      details: error
    }, { status: 500 })
  }
}