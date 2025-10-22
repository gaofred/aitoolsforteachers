import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { z } from 'zod'

const registerSchema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
  password: z.string().min(6, "密码至少需要6个字符"),
  name: z.string().min(1, "请输入姓名").optional()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = registerSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: "输入数据无效", details: validation.error.issues.map(e => e.message).join(", ") },
        { status: 400 }
      )
    }

    const { email, password, name } = validation.data

    const supabase = createServerSupabaseClient()

    // 最基础的注册测试 - 不做任何额外操作
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: name || email.split("@")[0]
        }
      }
    })

    if (error) {
      console.error('Supabase基础注册失败:', error)

      // 提供更详细的错误信息
      const errorMessage = `Supabase注册失败: ${error.message || error}`

      return NextResponse.json(
        {
          error: errorMessage,
          details: error,
          suggestion: "请检查 Supabase 项目的 Authentication 设置。可能需要在 Supabase Dashboard 中检查邮箱验证配置。"
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: "注册成功！请检查邮箱确认链接。",
      user: {
        id: data.user?.id,
        email: data.user?.email,
        emailConfirmed: data.user?.email_confirmed_at != null
      }
    })

  } catch (error) {
    console.error('注册错误:', error)
    return NextResponse.json(
      { error: "注册失败: " + (error instanceof Error ? error.message : "未知错误") },
      { status: 500 }
    )
  }
}