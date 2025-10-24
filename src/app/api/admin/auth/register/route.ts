import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// 管理员账号存储（在生产环境中应该存储在数据库中）
const ADMIN_ACCOUNTS = [
  {
    username: 'fredgao_dhsl',
    password: 'Seu10286',
    role: 'admin'
  }
];

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: '用户名和密码不能为空' },
        { status: 400 }
      );
    }

    // 验证管理员账号
    const adminAccount = ADMIN_ACCOUNTS.find(
      account => account.username === username && account.password === password
    );

    if (!adminAccount) {
      return NextResponse.json(
        { error: '用户名或密码错误' },
        { status: 401 }
      );
    }

    // 设置管理员会话
    const response = NextResponse.json({
      success: true,
      message: '管理员身份验证成功',
      user: {
        username: adminAccount.username,
        role: adminAccount.role
      }
    });

    // 设置管理员会话cookie（24小时过期）
    response.cookies.set('admin-session', JSON.stringify({
      username: adminAccount.username,
      role: adminAccount.role,
      authenticated: true
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 // 24小时
    });

    return response;

  } catch (error) {
    console.error('管理员身份验证失败:', error);
    return NextResponse.json(
      { error: '身份验证失败' },
      { status: 500 }
    );
  }
}
