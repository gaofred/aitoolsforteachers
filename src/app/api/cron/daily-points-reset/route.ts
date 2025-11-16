import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();

    // 验证是否为合法的定时任务调用（可以添加API密钥验证）
    const authHeader = request.headers.get('authorization');
    const cronKey = process.env.CRON_SECRET_KEY;

    if (!cronKey || authHeader !== `Bearer ${cronKey}`) {
      return NextResponse.json({
        success: false,
        error: "未授权访问"
      }, { status: 401 });
    }

    console.log('🕐 开始执行每日点数重置任务');

    // 调用批量重置函数
    const { data, error } = await supabase
      .rpc('reset_all_daily_points');

    if (error) {
      console.error('❌ 每日点数重置失败:', error);
      return NextResponse.json({
        success: false,
        error: `重置失败: ${error.message}`
      }, { status: 500 });
    }

    // 统计重置结果
    const results = Array.isArray(data) ? data : [];
    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;

    console.log(`✅ 每日点数重置完成: 成功 ${successCount} 个用户，失败 ${failCount} 个用户`);

    // 记录重置日志到系统日志
    const { error: logError } = await supabase
      .from('system_logs')
      .insert({
        log_type: 'DAILY_POINTS_RESET',
        message: `每日点数重置完成`,
        metadata: {
          success_count: successCount,
          fail_count: failCount,
          total_users: results.length,
          reset_date: new Date().toISOString()
        }
      });

    if (logError) {
      console.error('记录系统日志失败:', logError);
    }

    return NextResponse.json({
      success: true,
      data: {
        totalUsers: results.length,
        successCount,
        failCount,
        resetDate: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ 每日点数重置任务执行失败:', error);
    return NextResponse.json({
      success: false,
      error: `任务执行失败: ${error instanceof Error ? error.message : '未知错误'}`
    }, { status: 500 });
  }
}

// 为了兼容不同触发方式，也支持GET请求
export async function GET(request: NextRequest) {
  return POST(request);
}