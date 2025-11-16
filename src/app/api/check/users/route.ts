import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET() {
  try {
    const supabase = createServerSupabaseClient()

    // 获取前5个用户
    const { data: users, error } = await supabase
      .from('users' as any)
      .select('id, name, email, created_at')
      .order('created_at', { ascending: false })
      .limit(5)

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        users: []
      })
    }

    return NextResponse.json({
      success: true,
      users: users,
      count: users?.length || 0
    })

  } catch (error) {
    console.error('获取用户失败:', error)
    return NextResponse.json({
      success: false,
      error: '获取用户失败',
      details: error
    }, { status: 500 })
  }
}