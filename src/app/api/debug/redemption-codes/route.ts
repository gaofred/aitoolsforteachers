import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();

    console.log('🔍 检查兑换码表数据...');

    // 获取所有兑换码数据
    const { data: redemptionCodes, error: codesError } = await supabase
      .from('redemption_codes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (codesError) {
      console.error('❌ 获取兑换码数据失败:', codesError);
      return NextResponse.json({
        success: false,
        error: `获取兑换码失败: ${codesError.message}`
      }, { status: 500 });
    }

    console.log(`📊 找到 ${redemptionCodes?.length || 0} 个兑换码`);

    // 分析兑换码类型分布
    const typeDistribution = {};
    const membershipTypeDistribution = {};

    redemptionCodes?.forEach(code => {
      // 统计类型分布
      typeDistribution[code.type] = (typeDistribution[code.type] || 0) + 1;

      // 统计会员类型分布
      if (code.membership_type) {
        membershipTypeDistribution[code.membership_type] = (membershipTypeDistribution[code.membership_type] || 0) + 1;
      }
    });

    // 找一个会员兑换码来测试
    const testMembershipCode = redemptionCodes?.find(code => code.type === 'MEMBERSHIP');
    const testMembershipDaysCode = redemptionCodes?.find(code => code.type === 'MEMBERSHIP_DAYS');
    const testPointsCode = redemptionCodes?.find(code => code.type === 'POINTS');

    console.log('🎯 兑换码样本:', {
      points: testPointsCode?.code,
      membership: testMembershipCode?.code,
      membership_days: testMembershipDaysCode?.code
    });

    // 测试兑换码函数调用
    const testResults = {};

    if (testMembershipCode) {
      console.log(`🧪 测试会员兑换码: ${testMembershipCode.code}`);
      const { data: testResult, error: testError } = await supabase.rpc('redeem_membership_code', {
        p_user_id: '00000000-0000-0000-0000-000000000000', // 无效用户ID
        p_code: testMembershipCode.code
      });

      testResults.membership_test = {
        code: testMembershipCode.code,
        success: !testError,
        error: testError?.message,
        result: testResult
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        total_codes: redemptionCodes?.length || 0,
        type_distribution: typeDistribution,
        membership_type_distribution: membershipTypeDistribution,
        sample_codes: {
          points: testPointsCode,
          membership: testMembershipCode,
          membership_days: testMembershipDaysCode
        },
        recent_codes: redemptionCodes?.slice(0, 5).map(code => ({
          code: code.code,
          type: code.type,
          membership_type: code.membership_type,
          membership_days: code.membership_days,
          value: code.value,
          description: code.description,
          is_used: code.is_used,
          created_at: code.created_at
        })),
        test_results: testResults
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