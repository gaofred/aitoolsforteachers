import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    console.log('检查注册API所需的所有表...')
    const supabase = createServerSupabaseClient()

    const tables = [
      'ip_registration_logs',
      'users',
      'user_points',
      'memberships',
      'invitation_codes',
      'invitations'
    ]

    const results: Record<string, any> = {}

    for (const table of tables) {
      try {
        console.log(`检查表: ${table}`)
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1)

        results[table] = {
          exists: !error,
          error: error?.message,
          hasData: !!data && data.length > 0
        }

        console.log(`${table}检查结果:`, {
          exists: !error,
          hasData: !!data && data.length > 0,
          error: error?.message
        })
      } catch (err) {
        results[table] = {
          exists: false,
          error: err instanceof Error ? err.message : "未知异常",
          hasData: false
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: '表结构检查完成',
      results
    })

  } catch (error) {
    console.error('检查表时发生异常:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "未知错误"
    }, { status: 500 })
  }
}