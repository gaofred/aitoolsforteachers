import { NextRequest, NextResponse } from 'next/server';

// 管理员账号存储（在生产环境中应该存储在数据库中）
const ADMIN_ACCOUNTS = [
  {
    username: 'fredgao_dhsl',
    password: 'Seu10286',
    email: '17687027169@163.com',
    role: 'admin'
  },
  {
    username: 'admin',
    password: 'admin-7654',
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

export async function GET(request: NextRequest) {
  try {
    const adminSession = request.cookies.get('admin-session');

    if (adminSession && adminSession.value) {
      try {
        const sessionData = JSON.parse(adminSession.value);
        if (sessionData.authenticated) {
          return NextResponse.json({
            authenticated: true,
            message: '管理员已登录',
            user: {
              username: sessionData.username,
              role: sessionData.role
            }
          });
        }
      } catch (parseError) {
        console.error('解析会话数据失败:', parseError);
      }
    }

    return NextResponse.json({
      authenticated: false,
      message: '管理员未登录'
    });

  } catch (error) {
    console.error('检查管理员身份失败:', error);
    return NextResponse.json(
      { error: '检查身份失败' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const response = NextResponse.json({
      success: true,
      message: '管理员已退出登录'
    });

    // 清除管理员会话cookie
    response.cookies.set('admin-session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0 // 立即过期
    });

    return response;

  } catch (error) {
    console.error('退出登录失败:', error);
    return NextResponse.json(
      { error: '退出登录失败' },
      { status: 500 }
    );
  }
}
