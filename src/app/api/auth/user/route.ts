import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    // 获取重试次数
    const retryCount = request.headers.get('X-Retry-Count') || '0'
    console.log(`👤 用户API请求开始 (重试: ${retryCount})`);

    const supabase = createServerSupabaseClient()

    // 使用Supabase自动处理token
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError) {
      console.error('❌ 认证错误:', {
        error: authError.message,
        code: authError.status,
        retryCount
      });

      return NextResponse.json(
        {
          error: '无效的认证令牌',
          details: authError.message,
          retryCount
        },
        { status: 401 }
      )
    }

    if (!user) {
      console.warn('⚠️ 用户未认证');
      return NextResponse.json(
        {
          error: '用户未认证',
          retryCount
        },
        { status: 401 }
      )
    }

    // 获取用户扩展信息
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select(`
        *,
        user_points (*),
        memberships (*)
      `)
      .eq('id', user.id as any)
      .single()

    if (userError) {
      console.warn('⚠️ 获取用户数据错误，使用基本用户信息:', {
        error: userError.message,
        code: userError.code,
        userId: user.id
      });

      // 如果用户数据不存在，返回基本用户信息
      const basicUserData = {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.email?.split('@')[0],
        avatar_url: user.user_metadata?.avatar_url,
        provider: user.app_metadata?.provider || 'email',
        role: 'USER',
        user_points: { points: 25 }, // 默认积分
        memberships: { membership_type: 'FREE', is_active: true }
      }

      console.log('✅ 返回基本用户数据:', basicUserData.name);
      return NextResponse.json({
        ...basicUserData,
        processingTime: Date.now() - startTime,
        retryCount
      });
    }

    const responseData = {
      ...userData,
      processingTime: Date.now() - startTime,
      retryCount
    };

    console.log('✅ 用户API成功返回:', {
      name: userData.name,
      points: userData.user_points?.points,
      processingTime: responseData.processingTime,
      retryCount
    });

    return NextResponse.json(responseData)

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('❌ 获取用户信息发生未预期的错误:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      processingTime
    });

    return NextResponse.json(
      {
        error: '服务器内部错误',
        details: error instanceof Error ? error.message : 'Unknown error',
        processingTime
      },
      { status: 500 }
    )
  }
}