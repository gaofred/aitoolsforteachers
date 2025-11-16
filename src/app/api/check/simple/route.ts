import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();

    console.log('🔍 开始简单表检查...');

    const results = {
      test_results: {},
      summary: {
        existing_tables: 0,
        missing_tables: 0,
        total_checked: 0
      }
    };

    // 需要检查的表列表
    const tables_to_check = [
      'users',
      'user_points',
      'redemption_codes',
      'point_transactions',
      'membership_plans',
      'membership_purchases',
      'membership_redemptions',
      'daily_reset_logs'
    ];

    console.log('📋 逐个测试表的存在...');

    // 直接查询表来测试是否存在
    for (const table_name of tables_to_check) {
      try {
        console.log(`🔍 测试表: ${table_name}`);

        // 尝试查询表的第一行（如果表存在但为空会返回空数组，如果表不存在会报错）
        const { data, error, count } = await supabase
          .from(table_name)
          .select('*', { count: 'exact', head: true });

        if (error) {
          console.log(`❌ 表 ${table_name} 不存在或无权限访问: ${error.message}`);
          results.test_results[table_name] = {
            exists: false,
            error: error.message,
            error_code: error.code
          };
        } else {
          console.log(`✅ 表 ${table_name} 存在，记录数: ${count || 0}`);
          results.test_results[table_name] = {
            exists: true,
            count: count || 0,
            accessible: true
          };
          results.summary.existing_tables++;
        }
      } catch (error) {
        console.log(`❌ 检查表 ${table_name} 时发生异常:`, error);
        results.test_results[table_name] = {
          exists: false,
          error: error instanceof Error ? error.message : '未知错误',
          exception: true
        };
      }

      results.summary.total_checked++;
    }

    // 检查特定的会员相关字段
    console.log('📋 检查 user_points 表的会员字段...');
    try {
      const { data: user_points_sample, error: user_points_error } = await supabase
        .from('user_points')
        .select('*')
        .limit(1);

      if (!user_points_error && user_points_sample && user_points_sample.length > 0) {
        const sample_record = user_points_sample[0];
        const member_fields = ['daily_points', 'last_reset_date', 'is_member', 'membership_expires_at'];
        const field_status = {};

        for (const field of member_fields) {
          field_status[field] = {
            exists: field in sample_record,
            value: sample_record[field]
          };
        }

        results.test_results.user_points_member_fields = field_status;
        console.log('📊 user_points 会员字段状态:', field_status);
      }
    } catch (error) {
      console.log('⚠️ 无法检查 user_points 字段:', error);
    }

    // 检查 redemption_codes 表的会员字段
    console.log('📋 检查 redemption_codes 表的会员字段...');
    try {
      const { data: redemption_codes_sample, error: redemption_codes_error } = await supabase
        .from('redemption_codes')
        .select('*')
        .limit(1);

      if (!redemption_codes_error && redemption_codes_sample && redemption_codes_sample.length > 0) {
        const sample_record = redemption_codes_sample[0];
        const member_fields = ['membership_type', 'membership_days'];
        const field_status = {};

        for (const field of member_fields) {
          field_status[field] = {
            exists: field in sample_record,
            value: sample_record[field]
          };
        }

        results.test_results.redemption_codes_member_fields = field_status;
        console.log('📊 redemption_codes 会员字段状态:', field_status);
      }
    } catch (error) {
      console.log('⚠️ 无法检查 redemption_codes 字段:', error);
    }

    // 测试函数
    console.log('🔧 测试数据库函数...');
    const functions_to_test = [
      { name: 'check_membership_status', params: { p_user_id: '00000000-0000-0000-0000-000000000000' } },
      { name: 'reset_daily_points', params: { p_user_id: '00000000-0000-0000-0000-000000000000' } },
      { name: 'purchase_membership', params: { p_user_id: '00000000-0000-0000-0000-000000000000', p_plan_type: 'PREMIUM', p_points_cost: 100 } },
      { name: 'redeem_membership_code', params: { p_user_id: '00000000-0000-0000-0000-000000000000', p_code: 'TEST' } }
    ];

    const function_results = {};

    for (const func of functions_to_test) {
      try {
        const { data, error } = await supabase.rpc(func.name, func.params);

        if (error) {
          // 某些错误是预期的（如用户不存在），这表示函数存在
          if (error.message.includes('用户不存在') || error.message.includes('invalid') || error.message.includes('null')) {
            console.log(`✅ 函数 ${func.name} 存在（预期错误）`);
            function_results[func.name] = {
              exists: true,
              test_result: 'expected_error',
              error_message: error.message
            };
          } else {
            console.log(`❌ 函数 ${func.name} 可能不存在: ${error.message}`);
            function_results[func.name] = {
              exists: false,
              error: error.message
            };
          }
        } else {
          console.log(`✅ 函数 ${func.name} 存在并正常工作`);
          function_results[func.name] = {
            exists: true,
            test_result: 'success',
            data: data
          };
        }
      } catch (error) {
        console.log(`❌ 测试函数 ${func.name} 时出错:`, error);
        function_results[func.name] = {
          exists: false,
          error: error instanceof Error ? error.message : '未知错误'
        };
      }
    }

    results.test_results.functions = function_results;

    // 生成总结
    results.summary.missing_tables = results.summary.total_checked - results.summary.existing_tables;

    console.log('🎯 简单检查完成！');
    console.log(`  - 现有表: ${results.summary.existing_tables}/${results.summary.total_checked}`);
    console.log(`  - 缺失表: ${results.summary.missing_tables}`);

    // 判断需要执行的SQL
    const missing_critical = tables_to_check.filter(table =>
      !results.test_results[table]?.exists && ['user_points', 'redemption_codes'].includes(table)
    );

    const recommendations = [];
    if (missing_critical.length > 0) {
      recommendations.push('🚨 关键表缺失，需要检查基础数据结构');
    }
    if (!results.test_results.membership_plans?.exists) {
      recommendations.push('❌ 需要执行 membership-system-upgrade.sql');
    }
    if (!results.test_results.membership_redemptions?.exists) {
      recommendations.push('❌ 需要执行 upgrade-redemption-codes.sql');
    }

    return NextResponse.json({
      success: true,
      data: {
        test_results: results.test_results,
        summary: results.summary,
        recommendations,
        critical_issues: missing_critical,
        need_sql_scripts: results.summary.existing_tables < tables_to_check.length
      },
      message: `数据库检查完成：${results.summary.existing_tables === results.summary.total_checked ? '完整' : '不完整'}`
    });

  } catch (error) {
    console.error('❌ 数据库检查失败:', error);
    return NextResponse.json({
      success: false,
      error: `数据库检查失败: ${error instanceof Error ? error.message : '未知错误'}`
    }, { status: 500 });
  }
}