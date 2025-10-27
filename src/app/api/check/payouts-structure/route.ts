import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET() {
  try {
    const supabase = createServerSupabaseClient()

    // 尝试查询奖励发放表的结构
    const { data: payouts, error: payoutsError } = await supabase
      .from('invitation_reward_payouts' as any)
      .select('*')
      .limit(1)

    let columns = []
    if (!payoutsError && payouts && payouts.length > 0) {
      columns = Object.keys(payouts[0])
    }

    // 同时查询invitations表结构作为参考
    const { data: invitations, error: invitationsError } = await supabase
      .from('invitations' as any)
      .select('*')
      .limit(1)

    let invitationColumns = []
    if (!invitationsError && invitations && invitations.length > 0) {
      invitationColumns = Object.keys(invitations[0])
    }

    return NextResponse.json({
      success: true,
      payoutsTable: {
        exists: !payoutsError,
        columns: columns,
        sampleData: payouts?.[0] || null,
        error: payoutsError?.message
      },
      invitationsTable: {
        exists: !invitationsError,
        columns: invitationColumns,
        sampleData: invitations?.[0] || null,
        error: invitationsError?.message
      }
    })

  } catch (error) {
    console.error('检查表结构失败:', error)
    return NextResponse.json({
      success: false,
      error: '服务器错误',
      details: error
    }, { status: 500 })
  }
}