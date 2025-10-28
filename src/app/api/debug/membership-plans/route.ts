import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();

    console.log('🔍 检查 membership_plans 表结构...');

    // 获取membership_plans表的所有数据
    const { data: plans, error: plansError } = await supabase
      .from('membership_plans')
      .select('*')
      .order('created_at', { ascending: false });

    if (plansError) {
      console.error('❌ 获取membership_plans失败:', plansError);
      return NextResponse.json({
        success: false,
        error: `获取membership_plans失败: ${plansError.message}`
      }, { status: 500 });
    }

    console.log(`📊 找到 ${plans?.length || 0} 个会员套餐`);

    // 尝试直接查询表结构（使用一个简单的方法）
    const { data: samplePlan, error: sampleError } = await supabase
      .from('membership_plans')
      .select('*')
      .limit(1)
      .single();

    let fieldInfo = {};
    if (samplePlan) {
      fieldInfo = {
        available_fields: Object.keys(samplePlan),
        sample_data: samplePlan
      };
    }

    // 检查是否有daily_points字段
    const hasDailyPoints = samplePlan && 'daily_points' in samplePlan;

    return NextResponse.json({
      success: true,
      data: {
        total_plans: plans?.length || 0,
        plans: plans || [],
        field_info: fieldInfo,
        has_daily_points_field: hasDailyPoints,
        daily_points_value: hasDailyPoints ? samplePlan.daily_points : 'N/A'
      }
    });

  } catch (error) {
    console.error('❌ 调试失败:', error);
    return NextResponse.json({
      success: false,
      error: `调试失败: ${error instanceof Error ? error.message : '未知错误'}`
    }, { status: 500 });
  }
}