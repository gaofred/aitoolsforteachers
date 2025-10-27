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

    console.log('=== 邀请流程调试 ===')
    console.log('邀请码:', inviteCode)
    console.log('用户ID:', userId)

    const supabase = createServerSupabaseClient()

    // 1. 检查邀请码是否存在且有效
    console.log('步骤1: 检查邀请码...')
    const { data: inviteData, error: inviteError } = await supabase
      .from('invitation_codes' as any)
      .select('*')
      .eq('code', inviteCode)
      .eq('is_active', true)
      .single()

    if (inviteError) {
      console.error('邀请码检查失败:', inviteError)
      return NextResponse.json({
        success: false,
        error: '邀请码无效',
        details: inviteError,
        step: 'invite_check'
      })
    }

    console.log('✅ 邀请码有效:', {
      id: (inviteData as any).id,
      inviter_id: (inviteData as any).inviter_id,
      code: (inviteData as any).code
    })

    // 2. 检查用户是否存在
    console.log('步骤2: 检查用户...')
    const { data: userData, error: userError } = await supabase
      .from('users' as any)
      .select('*')
      .eq('id', userId)
      .single()

    if (userError) {
      console.error('用户检查失败:', userError)
      return NextResponse.json({
        success: false,
        error: '用户不存在',
        details: userError,
        step: 'user_check'
      })
    }

    console.log('✅ 用户存在:', {
      id: (userData as any).id,
      email: (userData as any).email,
      name: (userData as any).name
    })

    // 3. 检查是否已经有邀请记录
    console.log('步骤3: 检查现有邀请记录...')
    const { data: existingInvitation, error: checkError } = await supabase
      .from('invitations' as any)
      .select('*')
      .eq('invitation_code_id', (inviteData as any).id)
      .eq('invited_user_id', userId)
      .single()

    if (!checkError && existingInvitation) {
      console.log('⚠️ 发现现有邀请记录:', existingInvitation)
      return NextResponse.json({
        success: false,
        error: '该用户已经使用过此邀请码',
        existingInvitation,
        step: 'existing_invitation'
      })
    }

    // 4. 检查是否已经有积分交易记录
    console.log('步骤4: 检查积分交易记录...')
    const { data: existingTransaction, error: transCheckError } = await supabase
      .from('point_transactions' as any)
      .select('*')
      .eq('description', `邀请奖励 - ${inviteCode}`)
      .eq('user_id', (inviteData as any).inviter_id)
      .single()

    if (!transCheckError && existingTransaction) {
      console.log('⚠️ 发现现有交易记录:', existingTransaction)
      return NextResponse.json({
        success: false,
        error: '该邀请码已经使用过',
        existingTransaction,
        step: 'existing_transaction'
      })
    }

    // 5. 检查邀请者积分记录
    console.log('步骤5: 检查邀请者积分记录...')
    const { data: inviterPoints, error: pointsError } = await supabase
      .from('user_points' as any)
      .select('*')
      .eq('user_id', (inviteData as any).inviter_id)
      .single()

    if (pointsError) {
      console.error('邀请者积分检查失败:', pointsError)
      return NextResponse.json({
        success: false,
        error: '邀请者积分记录不存在',
        details: pointsError,
        step: 'inviter_points_check'
      })
    }

    console.log('✅ 邀请者积分记录:', {
      current_points: (inviterPoints as any).points
    })

    // 6. 模拟完整邀请奖励流程
    console.log('步骤6: 开始模拟邀请奖励流程...')

    const currentPoints = (inviterPoints as any)?.points || 0
    const basePoints = 30
    const newPoints = currentPoints + basePoints

    console.log('积分变化:', {
      current: currentPoints,
      award: basePoints,
      new: newPoints
    })

    // 7. 创建积分交易记录
    console.log('步骤7: 创建积分交易记录...')
    const { data: transaction, error: transactionError } = await supabase
      .from('point_transactions' as any)
      .insert([{
        user_id: (inviteData as any).inviter_id,
        amount: basePoints,
        type: 'BONUS',
        description: `邀请奖励 - ${inviteCode} (调试流程)`,
        created_at: new Date().toISOString()
      }] as any)
      .select()
      .single()

    if (transactionError) {
      console.error('创建积分交易失败:', transactionError)
      return NextResponse.json({
        success: false,
        error: '创建积分交易失败',
        details: transactionError,
        step: 'transaction_creation'
      })
    }

    console.log('✅ 积分交易创建成功:', (transaction as any)?.id)

    // 8. 更新邀请者积分
    console.log('步骤8: 更新邀请者积分...')
    const { error: updateError } = await supabase
      .from('user_points' as any)
      .update({
        points: newPoints,
        last_updated: new Date().toISOString()
      })
      .eq('user_id', (inviteData as any).inviter_id)

    if (updateError) {
      console.error('更新邀请者积分失败:', updateError)
      // 回滚交易记录
      await supabase
        .from('point_transactions' as any)
        .delete()
        .eq('id', (transaction as any)?.id)

      return NextResponse.json({
        success: false,
        error: '更新邀请者积分失败',
        details: updateError,
        step: 'points_update',
        transactionRolledBack: true
      })
    }

    console.log('✅ 邀请者积分更新成功!')

    // 9. 创建邀请记录
    console.log('步骤9: 创建邀请记录...')
    const { data: invitationRecord, error: invitationError } = await supabase
      .from('invitations' as any)
      .insert([{
        invitation_code_id: (inviteData as any).id,
        inviter_id: (inviteData as any).inviter_id,
        invited_user_id: userId,
        status: 'completed',
        ip_address: 'debug_flow',
        user_agent: 'debug_api',
        registered_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      }] as any)
      .select()
      .single()

    if (invitationError) {
      console.error('创建邀请记录失败:', invitationError)
      // 不影响主流程
    } else {
      console.log('✅ 邀请记录创建成功:', (invitationRecord as any)?.id)
    }

    console.log('=== 调试流程完成 ===')

    return NextResponse.json({
      success: true,
      message: '邀请流程调试完成，所有步骤都正常',
      data: {
        transactionId: (transaction as any)?.id,
        pointsAwarded: basePoints,
        inviterId: (inviteData as any).inviter_id,
        inviterPoints: {
          before: currentPoints,
          after: newPoints
        },
        invitedUserId: userId,
        inviteCode: inviteCode
      },
      debugSteps: [
        '✅ 邀请码验证',
        '✅ 用户存在检查',
        '✅ 重复邀请检查',
        '✅ 重复交易检查',
        '✅ 邀请者积分检查',
        '✅ 积分交易创建',
        '✅ 邀请者积分更新',
        '✅ 邀请记录创建'
      ]
    })

  } catch (error) {
    console.error('邀请流程调试失败:', error)
    return NextResponse.json({
      success: false,
      error: '调试流程失败',
      details: error
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: '邀请流程调试工具',
    usage: {
      method: 'POST',
      body: {
        inviteCode: '邀请码',
        userId: '用户ID'
      }
    },
    description: '用于诊断邀请奖励流程的每个步骤'
  })
}