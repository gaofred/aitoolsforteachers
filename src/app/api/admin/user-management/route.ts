import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: '邮箱地址不能为空' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // 检查用户是否已存在
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id, email, role, created_at')
      .eq('email', email)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('查询用户失败:', checkError);
      return NextResponse.json(
        { error: '查询用户失败' },
        { status: 500 }
      );
    }

    if (existingUser) {
      return NextResponse.json({
        success: true,
        exists: true,
        user: existingUser,
        message: '用户已存在'
      });
    }

    return NextResponse.json({
      success: true,
      exists: false,
      message: '用户不存在'
    });

  } catch (error) {
    console.error('检查用户失败:', error);
    return NextResponse.json(
      { error: '检查用户失败' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { email, password, name = '管理员' } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: '邮箱和密码不能为空' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // 先创建Supabase认证用户
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: name,
        role: 'ADMIN'
      }
    });

    if (authError) {
      console.error('创建Supabase用户失败:', authError);
      return NextResponse.json(
        { error: `创建用户失败: ${authError.message}` },
        { status: 500 }
      );
    }

    // 然后创建用户扩展信息
    const { data: profileData, error: profileError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        name,
        role: 'ADMIN'
      } as any)
      .select('id, email, role, created_at')
      .single();

    if (profileError) {
      console.error('创建用户资料失败:', profileError);
      // 回滚Supabase用户创建
      await supabase.auth.admin.deleteUser(authData.user.id);

      return NextResponse.json(
        { error: `创建用户资料失败: ${profileError.message}` },
        { status: 500 }
      );
    }

    // 创建初始积分和会员记录
    const { error: pointsError } = await supabase
      .from('user_points')
      .insert({
        user_id: authData.user.id,
        points: 1000 // 管理员初始积分
      } as any);

    if (pointsError) {
      console.error('创建用户积分失败:', pointsError);
    }

    const { error: membershipError } = await supabase
      .from('memberships')
      .insert({
        user_id: authData.user.id,
        membership_type: 'PRO'
      } as any);

    if (membershipError) {
      console.error('创建用户会员失败:', membershipError);
    }

    return NextResponse.json({
      success: true,
      user: profileData,
      message: '管理员用户创建成功'
    });

  } catch (error) {
    console.error('创建用户失败:', error);
    return NextResponse.json(
      { error: `创建用户失败: ${error instanceof Error ? error.message : '未知错误'}` },
      { status: 500 }
    );
  }
}