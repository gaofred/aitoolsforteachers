import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();

    // 获取所有有效的会员套餐
    const { data: plans, error } = await supabase
      .from('membership_plans')
      .select('*')
      .eq('is_active', true)
      .order('points_cost', { ascending: true });

    if (error) {
      console.error('获取会员套餐失败:', error);
      return NextResponse.json({
        success: false,
        error: `获取会员套餐失败: ${error.message}`
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      plans: plans || []
    });

  } catch (error) {
    console.error('获取会员套餐失败:', error);
    return NextResponse.json({
      success: false,
      error: `服务器错误: ${error instanceof Error ? error.message : '未知错误'}`
    }, { status: 500 });
  }
}