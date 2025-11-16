import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { inviteCode, userId } = await request.json()

    if (!inviteCode || !userId) {
      return NextResponse.json({
        success: false,
        error: '缺少邀请码或用户ID'
      })
    }

    console.log('测试基础邀请奖励:', { inviteCode, userId })
    const supabase = createServerSupabaseClient()

    // 1. 验证邀请码（不依赖复杂查询）
    const { data: inviteData, error: inviteError } = await supabase
      .from('invitation_codes' as any)
      .select('*')
      .eq('code', inviteCode)
      .eq('is_active', true)
      .single()

    if (inviteError || !inviteData) {
      console.error('邀请码验证失败:', inviteError)
      return NextResponse.json({
        success: false,
        error: '邀请码无效或已过期',
        details: inviteError
      })
    }

    console.log('邀请码验证成功:', inviteData)

    // 2. 检查是否在邀请自己
    if (userId === (inviteData as any).inviter_id) {
      return NextResponse.json({
        success: false,
        error: '不能邀请自己'
      })
    }

    // 3. 检查是否已经使用过
    const { data: existingTransaction, error: checkError } = await supabase
      .from('point_transactions' as any)
      .select('*')
      .eq('description', `邀请奖励 - ${inviteCode}`)
      .eq('user_id', userId)
      .single()

    if (!checkError && existingTransaction) {
      return NextResponse.json({
        success: false,
        error: '您已经使用过此邀请码'
      })
    }

    // 3. 检查用户积分记录
    const { data: userPoints, error: pointsError } = await supabase
      .from('user_points' as any)
      .select('*')
      .eq('user_id', userId)
      .single()

    if (pointsError && pointsError.code !== 'PGRST116') {
      return NextResponse.json({
        success: false,
        error: '获取用户积分失败',
        details: pointsError
      })
    }

    let currentPoints = 0
    if (!userPoints) {
      // 创建用户积分记录
      const { data: newPoints, error: createError } = await supabase
        .from('user_points' as any)
        .insert([{
          user_id: userId,
          points: 0,
          last_updated: new Date().toISOString()
        }] as any)
        .select()
        .single()

      if (createError) {
        return NextResponse.json({
          success: false,
          error: '创建用户积分记录失败',
          details: createError
        })
      }
    } else {
      currentPoints = (userPoints as any)?.points || 0
    }

    // 4. 发放基础奖励（固定30点）
    const basePoints = 30
    const totalPoints = basePoints

    console.log(`发放基础奖励: ${totalPoints}点 (当前: ${currentPoints})`)

    // 5. 创建积分交易记录
    const { data: transaction, error: transactionError } = await supabase
      .from('point_transactions' as any)
      .insert([{
        user_id: userId,
        amount: totalPoints,
        type: 'BONUS',
        description: `邀请奖励 - ${inviteCode}`,
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

    // 6. 更新用户积分
    const newPoints = currentPoints + totalPoints
    const updateCall = (supabase as any).from('user_points').update({
        points: newPoints,
        last_updated: new Date().toISOString()
      })
    const { error: updateError } = await updateCall.eq('user_id', userId)

    if (updateError) {
      console.error('更新用户积分失败:', updateError)
      return NextResponse.json({
        success: false,
        error: '更新用户积分失败',
        details: updateError
      })
    }

    // 7. 创建邀请记录（可选，但重要）
    const { data: invitationRecord, error: invitationError } = await supabase
      .from('invitations' as any)
      .insert([{
        invitation_code_id: (inviteData as any).id,
        inviter_id: (inviteData as any).inviter_id,
        invited_user_id: userId,
        status: 'completed',
        registered_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      }] as any)
      .select()
      .single()

    if (invitationError) {
      console.error('创建邀请记录失败:', invitationError)
      // 不影响主流程
    }

    console.log('基础邀请奖励发放成功!')

    // 8. 检查里程碑奖励
    console.log('检查里程碑奖励...')
    let milestoneRewards = []
    let totalMilestonePoints = 0

    try {
      const milestoneResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3007'}/api/invite/check-milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inviterId: (inviteData as any).inviter_id
        })
      })

      if (milestoneResponse.ok) {
        const milestoneData = await milestoneResponse.json()
        if (milestoneData.success && milestoneData.rewardsAwarded) {
          milestoneRewards = milestoneData.rewardsAwarded
          totalMilestonePoints = milestoneData.totalPointsAwarded || 0
          console.log(`里程碑奖励发放成功: ${totalMilestonePoints}点`)
        }
      } else {
        console.error('里程碑奖励检查失败:', milestoneResponse.statusText)
      }
    } catch (milestoneError) {
      console.error('里程碑奖励检查异常:', milestoneError)
      // 不影响基础奖励流程
    }

    const totalPointsAwarded = totalPoints + totalMilestonePoints

    return NextResponse.json({
      success: true,
      data: {
        transactionId: (transaction as any)?.id,
        pointsAwarded: totalPointsAwarded,
        basePoints: basePoints,
        milestonePoints: totalMilestonePoints,
        previousPoints: currentPoints,
        newPoints: currentPoints + totalPointsAwarded,
        inviterId: (inviteData as any).inviter_id,
        milestoneRewards: milestoneRewards
      },
      message: totalMilestonePoints > 0
        ? `基础奖励和里程碑奖励发放成功！总计${totalPointsAwarded}点`
        : '基础奖励发放成功！'
    })

  } catch (error) {
    console.error('测试基础邀请奖励失败:', error)
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

    // 检查各个表的状态
    const tables = {
      invitation_codes: await checkTable(supabase, 'invitation_codes'),
      invitations: await checkTable(supabase, 'invitations'),
      user_points: await checkTable(supabase, 'user_points'),
      point_transactions: await checkTable(supabase, 'point_transactions')
    }

    return NextResponse.json({
      success: true,
      tables: tables
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: '检查失败',
      details: error
    }, { status: 500 })
  }
}

async function checkTable(supabase: any, tableName: string) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('count(*)')
      .single()

    return {
      exists: !error,
      count: error ? 0 : data?.count || 0,
      error: error?.message
    }
  } catch (err) {
    return {
      exists: false,
      count: 0,
      error: err
    }
  }
}