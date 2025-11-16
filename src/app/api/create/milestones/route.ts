import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    console.log('开始创建里程碑表...')

    // 尝试创建milestones表
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS invitation_milestones (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          threshold INTEGER NOT NULL,
          bonus_points INTEGER NOT NULL,
          description TEXT,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `

    // 由于Supabase不支持直接执行DDL，我们使用另一种方法
    // 先尝试插入数据，如果表不存在会报错，然后我们可以根据错误信息判断
    const milestones = [
      {
        threshold: 10,
        bonus_points: 100,
        description: '成功邀请10位朋友',
        is_active: true
      },
      {
        threshold: 20,
        bonus_points: 300,
        description: '成功邀请20位朋友',
        is_active: true
      }
    ]

    const insertResults = []

    for (const milestone of milestones) {
      try {
        const { data, error } = await supabase
          .from('invitation_milestones' as any)
          .insert(milestone as any)
          .select()

        if (error) {
          if (error.code === 'PGRST116') {
            // 表不存在，返回详细的错误信息
            return NextResponse.json({
              success: false,
              error: 'invitation_milestones表不存在',
              details: error,
              sqlToRun: createTableSQL,
              message: '请在Supabase Dashboard中执行以下SQL创建表：',
              manualFix: true
            })
          } else {
            insertResults.push({
              milestone: milestone.threshold,
              success: false,
              error: error.message
            })
          }
        } else {
          insertResults.push({
            milestone: milestone.threshold,
            success: true,
            data: data
          })
        }
      } catch (err) {
        insertResults.push({
          milestone: milestone.threshold,
          success: false,
          error: `异常: ${err}`
        })
      }
    }

    // 验证结果
    try {
      const { data: finalMilestones, error: finalError } = await supabase
        .from('invitation_milestones' as any)
        .select('*')
        .order('threshold')

      return NextResponse.json({
        success: !finalError,
        message: finalError ? '表可能需要手动创建' : '里程碑创建成功',
        insertResults: insertResults,
        milestones: finalMilestones,
        error: finalError?.message,
        sqlToRun: createTableSQL
      })

    } catch (err) {
      return NextResponse.json({
        success: false,
        error: '验证失败',
        details: err,
        message: '请手动执行SQL创建表'
      })
    }

  } catch (error) {
    console.error('创建里程碑表失败:', error)
    return NextResponse.json({
      success: false,
      error: '创建失败',
      details: error
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = createServerSupabaseClient()

    // 检查milestones表是否存在
    try {
      const { data, error } = await supabase
        .from('invitation_milestones' as any)
        .select('*')
        .order('threshold')

      return NextResponse.json({
        success: true,
        tableExists: !error,
        milestones: data,
        error: error?.message
      })
    } catch (err) {
      return NextResponse.json({
        success: false,
        tableExists: false,
        error: err,
        message: '表不存在或无法访问'
      })
    }

  } catch (error) {
    console.error('检查里程碑表失败:', error)
    return NextResponse.json({
      success: false,
      error: '检查失败',
      details: error
    }, { status: 500 })
  }
}