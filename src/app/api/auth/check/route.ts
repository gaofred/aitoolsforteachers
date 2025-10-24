import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    
    // 获取Supabase认证相关的cookies
    const accessToken = cookieStore.get('sb-access-token')?.value;
    const refreshToken = cookieStore.get('sb-refresh-token')?.value;

    if (!accessToken) {
      return NextResponse.json({
        authenticated: false,
        message: '未登录 - 请先登录',
        cookies: cookieStore.getAll().map(c => ({ name: c.name, hasValue: !!c.value }))
      });
    }

    const supabase = createServerSupabaseClient();

    // 使用access token获取用户信息
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);

    if (authError || !user) {
      return NextResponse.json({
        authenticated: false,
        message: '认证失败 - 请重新登录',
        error: authError?.message
      });
    }

    // 获取用户扩展信息
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select(`
        *,
        user_points (*),
        memberships (*)
      `)
      .eq('id', user.id)
      .single();

    return NextResponse.json({
      authenticated: true,
      message: '认证成功',
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.email?.split('@')[0],
        avatar_url: user.user_metadata?.avatar_url,
        provider: user.app_metadata?.provider || 'email',
        role: 'USER',
        user_points: (userData as any)?.user_points || { points: 25 },
        memberships: (userData as any)?.memberships || { membership_type: 'FREE' }
      }
    });

  } catch (error) {
    console.error('认证检查错误:', error);
    return NextResponse.json(
      { 
        authenticated: false, 
        message: '认证检查失败',
        error: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}




