import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: '缺少用户ID'
      })
    }

    const supabase = createServerSupabaseClient()

    const { data: userPoints, error: pointsError } = await supabase
      .from('user_points')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (pointsError) {
      console.error('获取用户积分失败:', pointsError)
      return NextResponse.json({
        success: false,
        error: '获取用户积分失败'
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        userId: userId,
        points: (userPoints as any)?.points,
        lastUpdated: (userPoints as any)?.last_updated
      }
    })

  } catch (error) {
    console.error('获取用户积分API错误:', error)
    return NextResponse.json({
      success: false,
      error: '服务器错误'
    })
  }
}