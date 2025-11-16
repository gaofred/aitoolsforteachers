import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    console.log('创建测试邀请码...')

    // 创建测试邀请码
    const { data: inviteData, error: inviteError } = await supabase
      .from('invitation_codes' as any)
      .insert([{
        inviter_id: '830a6f1f-bcc1-45c4-9a00-6746eee4421a', // 测试用户ID
        code: 'TEST_INVITE_' + Date.now().toString().slice(-6),
        invite_url: 'https://aitoolsforteachers.net/invite/redirect?invite_code=TEST',
        total_invitations: 0,
        successful_invitations: 0,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }] as any)
      .select()
      .single()

    if (inviteError) {
      console.error('创建邀请码失败:', inviteError)
      return NextResponse.json({
        success: false,
        error: '创建邀请码失败',
        details: inviteError
      })
    }

    console.log('邀请码创建成功:', inviteData)

    // 立即测试这个邀请码
    if (!inviteData) {
      return NextResponse.json({
        success: false,
        error: '邀请码创建失败，数据为空'
      })
    }

    console.log('测试邀请奖励发放...')
    const testResult = await testInviteReward((inviteData as any).code, '830a6f1f-bcc1-45c4-9a00-6746eee4421a')

    return NextResponse.json({
      success: true,
      message: '测试邀请码创建并测试完成',
      inviteCode: inviteData,
      testResult: testResult
    })

  } catch (error) {
    console.error('创建测试邀请码失败:', error)
    return NextResponse.json({
      success: false,
      error: '创建失败',
      details: error
    }, { status: 500 })
  }
}

async function testInviteReward(inviteCode: string, userId: string) {
  const supabase = createServerSupabaseClient()

  try {
    // 测试邀请奖励
    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/invite/claim-direct`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inviteCode: inviteCode,
        userId: userId
      })
    })

    const data = await response.json()
    return {
      status: response.status,
      success: data.success,
      error: data.error,
      data: data.data
    }
  } catch (error) {
    return {
      success: false,
      error: `测试请求失败: ${error}`
    }
  }
}

export async function GET() {
  try {
    const supabase = createServerSupabaseClient()

    // 检查现有邀请码
    const { data: codes, error } = await supabase
      .from('invitation_codes' as any)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)

    return NextResponse.json({
      success: true,
      codes: codes,
      error: error?.message
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: '检查失败',
      details: error
    }, { status: 500 })
  }
}