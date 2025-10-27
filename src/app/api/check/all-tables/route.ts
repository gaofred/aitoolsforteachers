import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET() {
  try {
    const supabase = createServerSupabaseClient()
    const results: any = {}

    // 检查所有可能存在的邀请相关表
    const tables = [
      'invitation_codes',
      'invitations',
      'invitation_rewards',
      'invitation_reward_payouts',
      'invitation_milestones',
      'invitation_stats', // 可能是视图
      'user_points',
      'point_transactions'
    ]

    for (const tableName of tables) {
      try {
        console.log(`检查表: ${tableName}`)

        // 尝试简单的查询
        const { data, error, count } = await supabase
          .from(tableName as any)
          .select('*', { count: 'exact', head: true })

        if (error) {
          results[tableName] = {
            exists: false,
            error: error.message,
            code: error.code,
            details: error.details
          }
        } else {
          results[tableName] = {
            exists: true,
            count: count || 0,
            error: null
          }
        }
      } catch (err) {
        results[tableName] = {
          exists: false,
          error: `查询异常: ${err}`,
          details: err
        }
      }
    }

    // 如果表存在，尝试获取一些数据
    if (results.invitation_codes?.exists) {
      try {
        const { data: codes, error: codesError } = await supabase
          .from('invitation_codes' as any)
          .select('*')
          .limit(3)

        results.invitation_codes_sample = {
          data: codes,
          error: codesError?.message
        }
      } catch (err) {
        results.invitation_codes_sample = {
          error: `获取样本失败: ${err}`
        }
      }
    }

    if (results.invitations?.exists) {
      try {
        const { data: invites, error: invitesError } = await supabase
          .from('invitations' as any)
          .select('*')
          .limit(3)

        results.invitations_sample = {
          data: invites,
          error: invitesError?.message
        }
      } catch (err) {
        results.invitations_sample = {
          error: `获取样本失败: ${err}`
        }
      }
    }

    return NextResponse.json({
      success: true,
      tables: results,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('检查所有表失败:', error)
    return NextResponse.json({
      success: false,
      error: '检查失败',
      details: error
    }, { status: 500 })
  }
}