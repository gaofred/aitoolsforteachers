import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();

    // 验证管理员权限
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: "用户未登录"
      }, { status: 401 });
    }

    // 检查用户是否为管理员
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userData || (userData as any).role !== 'ADMIN') {
      return NextResponse.json({
        success: false,
        error: "权限不足，需要管理员权限"
      }, { status: 403 });
    }

    const { userId, resetAll } = await request.json();

    let resetResult;

    if (resetAll) {
      // 批量重置所有用户
      console.log('🔧 管理员执行批量重置所有用户点数');
      const { data, error } = await supabase.rpc('reset_all_daily_points');

      if (error) {
        console.error('批量重置失败:', error);
        return NextResponse.json({
          success: false,
          error: `批量重置失败: ${error.message}`
        }, { status: 500 });
      }

      const results = Array.isArray(data) ? data : [];
      const successCount = results.filter(r => r.success).length;
      const failCount = results.length - successCount;

      resetResult = {
        type: 'batch',
        totalUsers: results.length,
        successCount,
        failCount,
        results
      };

    } else if (userId) {
      // 重置指定用户
      console.log(`🔧 管理员重置用户 ${userId} 的点数`);
      const { data, error } = await supabase.rpc('reset_daily_points', {
        p_user_id: userId,
        p_manual_reset: true
      } as any);

      if (error) {
        console.error('用户重置失败:', error);
        return NextResponse.json({
          success: false,
          error: `用户重置失败: ${error.message}`
        }, { status: 500 });
      }

      if (!data || !(data as any).success) {
        return NextResponse.json({
          success: false,
          error: (data as any)?.error || '重置失败'
        }, { status: 400 });
      }

      resetResult = {
        type: 'single',
        userId,
        success: true,
        newPoints: (data as any).new_points,
        planType: (data as any).plan_type,
        isMember: (data as any).is_member
      };

    } else {
      return NextResponse.json({
        success: false,
        error: "请提供 userId 或设置 resetAll 为 true"
      }, { status: 400 });
    }

    // 记录管理员操作日志
    await supabase
      .from('admin_logs')
      .insert({
        admin_id: user.id,
        action: 'MANUAL_POINTS_RESET',
        details: resetResult,
        created_at: new Date().toISOString()
      } as any);

    return NextResponse.json({
      success: true,
      data: resetResult,
      message: resetResult.type === 'batch'
        ? `批量重置完成：成功 ${resetResult.successCount} 个，失败 ${resetResult.failCount} 个`
        : `用户 ${userId} 重置完成，新点数：${resetResult.newPoints}`
    });

  } catch (error) {
    console.error('管理员重置点数失败:', error);
    return NextResponse.json({
      success: false,
      error: `操作失败: ${error instanceof Error ? error.message : '未知错误'}`
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();

    // 验证管理员权限
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: "用户未登录"
      }, { status: 401 });
    }

    // 检查用户是否为管理员
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userData || (userData as any).role !== 'ADMIN') {
      return NextResponse.json({
        success: false,
        error: "权限不足，需要管理员权限"
      }, { status: 403 });
    }

    // 获取最近的每日重置日志
    const { data: logs, error } = await supabase
      .from('daily_reset_logs')
      .select(`
        *,
        user:users(name, email)
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('获取重置日志失败:', error);
      return NextResponse.json({
        success: false,
        error: `获取重置日志失败: ${error.message}`
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        logs: logs || [],
        totalLogs: logs?.length || 0
      }
    });

  } catch (error) {
    console.error('获取重置日志失败:', error);
    return NextResponse.json({
      success: false,
      error: `获取失败: ${error instanceof Error ? error.message : '未知错误'}`
    }, { status: 500 });
  }
}