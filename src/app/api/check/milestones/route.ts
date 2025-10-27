import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET() {
  try {
    const supabase = createServerSupabaseClient()

    // 查询里程碑配置
    const { data: milestones, error: milestonesError } = await supabase
      .from('invitation_milestones' as any)
      .select('*')
      .eq('is_active', true)
      .order('threshold', { ascending: true })

    if (milestonesError) {
      console.error('查询里程碑配置失败:', milestonesError)
      return NextResponse.json({
        success: false,
        error: milestonesError.message
      })
    }

    // 查询邀请统计
    const { data: stats, error: statsError } = await supabase
      .from('invitation_stats' as any)
      .select('*')
      .order('successful_invitations', { ascending: false })
      .limit(5)

    if (statsError) {
      console.error('查询邀请统计失败:', statsError)
    }

    return NextResponse.json({
      success: true,
      milestones: milestones,
      stats: stats || [],
      message: milestones.length > 0 ? '找到里程碑配置' : '没有活跃的里程碑配置'
    })

  } catch (error) {
    console.error('查询里程碑失败:', error)
    return NextResponse.json({
      success: false,
      error: '服务器错误',
      details: error
    }, { status: 500 })
  }
}