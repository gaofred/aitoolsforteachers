import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();

    console.log('🔍 开始详细数据库诊断...');

    const results = {
      existing_tables: [],
      missing_tables: [],
      table_details: {},
      errors: []
    };

    // 需要检查的表列表
    const required_tables = [
      'users',
      'user_points',
      'redemption_codes',
      'point_transactions',
      'membership_plans',
      'membership_purchases',
      'membership_redemptions',
      'daily_reset_logs'
    ];

    console.log('📋 检查所有表的存在情况...');

    // 检查每个表
    for (const table_name of required_tables) {
      try {
        const { data: table_data, error: table_error } = await supabase
          .from('information_schema.tables')
          .select('table_name')
          .eq('table_schema', 'public')
          .eq('table_name', table_name)
          .single();

        if (table_error) {
          console.log(`❌ 表 ${table_name} 不存在: ${table_error.message}`);
          results.missing_tables.push(table_name);
          results.errors.push(`表 ${table_name}: ${table_error.message}`);
        } else {
          console.log(`✅ 表 ${table_name} 存在`);
          results.existing_tables.push(table_name);

          // 获取表的详细信息
          try {
            const { data: columns, error: column_error } = await supabase
              .from('information_schema.columns')
              .select('column_name, data_type, is_nullable, column_default')
              .eq('table_schema', 'public')
              .eq('table_name', table_name)
              .order('ordinal_position');

            if (column_error) {
              console.log(`⚠️ 无法获取 ${table_name} 的列信息: ${column_error.message}`);
              results.table_details[table_name] = {
                exists: true,
                columns: [],
                error: column_error.message
              };
            } else {
              results.table_details[table_name] = {
                exists: true,
                columns: columns || [],
                column_count: columns?.length || 0
              };
              console.log(`📊 表 ${table_name} 有 ${columns?.length || 0} 个字段`);
            }
          } catch (error) {
            console.log(`⚠️ 获取 ${table_name} 详情时出错:`, error);
            results.table_details[table_name] = {
              exists: true,
              columns: [],
              error: error instanceof Error ? error.message : '未知错误'
            };
          }
        }
      } catch (error) {
        console.log(`❌ 检查表 ${table_name} 时出错:`, error);
        results.missing_tables.push(table_name);
        results.errors.push(`检查表 ${table_name} 时出错: ${error instanceof Error ? error.message : '未知错误'}`);
      }
    }

    // 检查函数
    console.log('🔧 检查数据库函数...');
    const functions = ['check_membership_status', 'reset_daily_points', 'purchase_membership', 'redeem_membership_code'];
    const function_results = {};

    for (const func_name of functions) {
      try {
        // 尝试获取函数信息
        const { data: func_data, error: func_error } = await supabase
          .from('information_schema.routines')
          .select('routine_name')
          .eq('routine_schema', 'public')
          .eq('routine_name', func_name)
          .single();

        if (func_error) {
          console.log(`❌ 函数 ${func_name} 不存在: ${func_error.message}`);
          function_results[func_name] = { exists: false, error: func_error.message };
        } else {
          console.log(`✅ 函数 ${func_name} 存在`);
          function_results[func_name] = { exists: true };
        }
      } catch (error) {
        console.log(`❌ 检查函数 ${func_name} 时出错:`, error);
        function_results[func_name] = { exists: false, error: error instanceof Error ? error.message : '未知错误' };
      }
    }

    // 生成诊断报告
    console.log('📊 生成诊断报告...');
    const diagnosis = {
      table_count: {
        existing: results.existing_tables.length,
        missing: results.missing_tables.length,
        total: required_tables.length
      },
      critical_missing: results.missing_tables.filter(table =>
        ['user_points', 'redemption_codes', 'membership_plans'].includes(table)
      ),
      function_count: {
        existing: Object.values(function_results).filter((f: any) => f.exists).length,
        total: functions.length
      },
      overall_status: results.missing_tables.length === 0 ? 'complete' : 'incomplete'
    };

    // 生成建议
    const recommendations = [];
    if (results.missing_tables.includes('user_points')) {
      recommendations.push('❌ user_points 表不存在，基础数据结构有问题');
    }
    if (results.missing_tables.includes('redemption_codes')) {
      recommendations.push('❌ redemption_codes 表不存在，兑换码功能无法使用');
    }
    if (results.missing_tables.includes('membership_plans')) {
      recommendations.push('❌ 需要执行 membership-system-upgrade.sql');
    }
    if (results.missing_tables.includes('membership_redemptions')) {
      recommendations.push('❌ 需要执行 upgrade-redemption-codes.sql');
    }
    if (diagnosis.critical_missing.length > 0) {
      recommendations.push('🚨 关键表缺失，系统可能无法正常运行');
    }

    console.log('🎯 诊断完成！');
    console.log(`  - 现有表: ${diagnosis.table_count.existing}/${diagnosis.table_count.total}`);
    console.log(`  - 缺失表: ${diagnosis.table_count.missing}`);
    console.log(`  - 现有函数: ${diagnosis.function_count.existing}/${diagnosis.function_count.total}`);
    console.log(`  - 整体状态: ${diagnosis.overall_status}`);

    return NextResponse.json({
      success: true,
      data: {
        tables: results,
        functions: function_results,
        diagnosis,
        recommendations,
        sql_scripts_needed: results.missing_tables.length > 0
      },
      message: `数据库诊断完成：${diagnosis.overall_status === 'complete' ? '完整' : '不完整'}`
    });

  } catch (error) {
    console.error('❌ 数据库诊断失败:', error);
    return NextResponse.json({
      success: false,
      error: `数据库诊断失败: ${error instanceof Error ? error.message : '未知错误'}`
    }, { status: 500 });
  }
}