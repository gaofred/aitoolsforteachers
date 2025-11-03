import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

// 诊断API：检查用户认证状态和菜单可见性
export async function GET(request: Request) {
  try {
    console.log('🔍 用户菜单诊断API被调用');

    // 使用Supabase标准认证方式
    const supabase = createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log('❌ 用户认证失败:', authError);
      return NextResponse.json({
        success: false,
        error: "用户认证失败: " + (authError?.message || '未知错误'),
        diagnostics: {
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
          supabaseUserId: user.id,
          usingStandardAuth: true
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