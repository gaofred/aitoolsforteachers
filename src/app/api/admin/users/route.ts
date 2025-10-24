import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();

    // 获取所有用户及其点数信息
    const { data: users, error } = await supabase
      .from('users')
      .select(`
        id,
        email,
        name,
        created_at,
        user_points (
          points
        ),
        memberships (
          type
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('获取用户列表失败:', error);
      return NextResponse.json(
        { error: '获取用户列表失败' },
        { status: 500 }
      );
    }

    // 格式化用户数据
    const formattedUsers = (users as any)?.map((user: any) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      created_at: user.created_at,
      points: user.user_points?.[0]?.points || 0,
      membership_type: user.memberships?.[0]?.type || 'free'
    })) || [];

    return NextResponse.json({
      users: formattedUsers
    });

  } catch (error) {
    console.error('获取用户列表失败:', error);
    return NextResponse.json(
      { error: '获取用户列表失败' },
      { status: 500 }
    );
  }
}




