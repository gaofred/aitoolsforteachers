import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    console.log('使用全新的随机邮箱测试Supabase注册...')

    // 生成一个完全随机的邮箱
    const timestamp = Date.now()
    const random = Math.floor(Math.random() * 10000)
    const email = `test_user_${timestamp}_${random}@never-exists-domain.com`

    console.log('生成的随机邮箱:', email)

    const supabase = createServerSupabaseClient()

    // 步骤1: 先测试Supabase用户创建
    console.log('步骤1: 测试Supabase用户创建...')
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password: 'test123456789',
      options: {
        data: {
          display_name: '测试用户'
        }
      }
    })

    console.log('Supabase认证结果:', {
      hasError: !!authError,
      hasUser: !!authData?.user,
      hasSession: !!authData?.session,
      error: authError?.message,
      errorCode: authError?.code,
      userId: authData?.user?.id
    })

    if (authError) {
      return NextResponse.json({
        success: false,
        step: 'supabase_auth',
        error: authError.message,
        details: authError
      }, { status: 400 })
    }

    // 步骤2: 如果Supabase认证成功，删除这个测试用户
    if (authData.user?.id) {
      console.log('步骤2: 删除测试用户...')
      try {
        const { error: deleteError } = await supabase.auth.admin.deleteUser(authData.user.id)
        if (deleteError) {
          console.error('删除用户失败:', deleteError)
        } else {
          console.log('测试用户已成功删除')
        }
      } catch (deleteErr) {
        console.error('删除用户时发生异常:', deleteErr)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Supabase用户创建测试成功（用户已删除）',
      user: {
        id: authData.user?.id,
        email: authData.user?.email,
        emailConfirmed: authData.user?.email_confirmed_at != null
      }
    })

  } catch (error) {
    console.error('测试时发生异常:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "未知错误",
      details: error
    }, { status: 500 })
  }
}