import { NextResponse } from "next/server";

// 诊断API：检查用户认证状态和菜单可见性
export async function GET(request: Request) {
  try {
    console.log('🔍 用户菜单诊断API被调用');

    // 检查请求头中的认证信息
    const authHeader = request.headers.get('authorization');
    const cookieHeader = request.headers.get('cookie');

    console.log('📋 请求头信息:');
    console.log('- Authorization:', authHeader ? '存在' : '不存在');
    console.log('- Cookie:', cookieHeader ? '存在' : '不存在');

    // 尝试从cookie获取访问令牌
    let accessToken = null;
    if (cookieHeader) {
      const cookies = cookieHeader.split(';').map(c => c.trim());
      for (const cookie of cookies) {
        if (cookie.startsWith('access_token=')) {
          accessToken = cookie.substring('access_token='.length);
          break;
        }
      }
    }

    console.log('🔑 访问令牌:', accessToken ? '存在' : '不存在');

    if (!accessToken) {
      return NextResponse.json({
        success: false,
        error: "未找到访问令牌",
        diagnostics: {
          authHeader: !!authHeader,
          cookieHeader: !!cookieHeader,
          accessToken: !!accessToken
        }
      }, { status: 401 });
    }

    // 验证用户身份
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);

    if (authError || !user) {
      console.log('❌ 用户认证失败:', authError);
      return NextResponse.json({
        success: false,
        error: "用户认证失败: " + (authError?.message || '未知错误'),
        diagnostics: {
          authHeader: !!authHeader,
          cookieHeader: !!cookieHeader,
          accessToken: !!accessToken,
          authError: authError?.message
        }
      }, { status: 401 });
    }

    console.log('✅ 用户认证成功:', user.id);

    // 获取用户详细信息
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select(`
        *,
        user_points(id, points, last_updated),
        memberships(id, membership_type)
      `)
      .eq('id', user.id)
      .single();

    if (userError) {
      console.error('获取用户详细信息失败:', userError);
    }

    console.log('👤 用户详细信息:', userData);

    // 检查用户菜单组件应该显示的内容
    const menuShouldShow = !!userData;
    const menuItems = {
      userProfile: !!userData,
      inviteRewards: !!userData, // 邀请有礼菜单项
      adminPanel: userData?.role === 'ADMIN',
      signOut: !!userData
    };

    console.log('📱 菜单诊断结果:', {
      menuShouldShow,
      menuItems,
      userRole: userData?.role,
      userName: userData?.name,
      userEmail: userData?.email
    });

    return NextResponse.json({
      success: true,
      data: {
        authenticated: true,
        user: userData,
        menuShouldShow,
        menuItems,
        diagnostics: {
          authHeader: !!authHeader,
          cookieHeader: !!cookieHeader,
          accessToken: !!accessToken,
          supabaseUserId: user.id
        }
      }
    });

  } catch (error) {
    console.error('❌ 用户菜单诊断API错误:', error);
    return NextResponse.json({
      success: false,
      error: "服务器内部错误: " + (error instanceof Error ? error.message : '未知错误'),
      diagnostics: {
        errorMessage: error instanceof Error ? error.message : '未知错误'
      }
    }, { status: 500 });
  }
}