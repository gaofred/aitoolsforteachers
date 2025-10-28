import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();

    console.log('🔍 检查 redeem_membership_code 函数状态...');

    // 测试不同类型的兑换码
    const testCodes = [
      { code: 'YJ44BB3I', type: 'POINTS', description: '点数兑换码' },
      { code: 'L0FYH7UY', type: 'MEMBERSHIP_DAYS', description: '会员天数兑换码' },
      { code: 'RBWTQDA1', type: 'MEMBERSHIP', description: '会员套餐兑换码' }
    ];

    const results = [];
    const testUserId = '830a6f1f-bcc1-45c4-9a00-6746eee4421a';

    for (const testCode of testCodes) {
      console.log(`🧪 测试 ${testCode.description}: ${testCode.code}`);

      const { data, error } = await supabase.rpc('redeem_membership_code', {
        p_user_id: testUserId,
        p_code: testCode.code
      });

      const result = {
        code: testCode.code,
        type: testCode.type,
        description: testCode.description,
        success: !error,
        error: error?.message,
        data: data
      };

      results.push(result);

      if (error) {
        console.log(`❌ ${testCode.description} 失败:`, error.message);
      } else {
        console.log(`✅ ${testCode.description} 成功:`, data);
      }
    }

    // 检查函数是否支持会员兑换码类型
    const membershipCodeTest = results.find(r => r.type === 'MEMBERSHIP_DAYS' || r.type === 'MEMBERSHIP');
    const supportsMembership = membershipCodeTest && (
      !membershipCodeTest.error ||
      !membershipCodeTest.error.includes('不支持的兑换码类型')
    );

    return NextResponse.json({
      success: true,
      data: {
        test_results: results,
        supports_membership_types: supportsMembership,
        summary: {
          total_tests: results.length,
          successful_tests: results.filter(r => r.success).length,
          failed_tests: results.filter(r => !r.success).length,
          membership_support: supportsMembership ? '✅ 支持' : '❌ 不支持'
        }
      }
    });

  } catch (error) {
    console.error('❌ 函数检查失败:', error);
    return NextResponse.json({
      success: false,
      error: `检查失败: ${error instanceof Error ? error.message : '未知错误'}`
    }, { status: 500 });
  }
}