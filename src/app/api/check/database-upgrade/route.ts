import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();

    console.log('🔍 开始检查数据库表和字段状态...');

    const results = {
      tables: {},
      columns: {},
      functions: {},
      summary: {}
    };

    // 1. 检查 membership_redemptions 表是否存在
    console.log('📋 检查 membership_redemptions 表...');
    const { data: tables, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'membership_redemptions')
      .single();

    if (tableError) {
      console.log('❌ membership_redemptions 表不存在:', tableError.message);
      results.tables.membership_redemptions = false;
    } else {
      console.log('✅ membership_redemptions 表存在');
      results.tables.membership_redemptions = true;
    }

    // 2. 检查 redemption_codes 表的新字段
    console.log('📋 检查 redemption_codes 表的新字段...');
    const { data: columns, error: columnError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_schema', 'public')
      .eq('table_name', 'redemption_codes')
      .in('column_name', ['membership_type', 'membership_days']);

    if (columnError) {
      console.log('❌ 检查字段失败:', columnError.message);
      results.columns.redemption_codes = false;
    } else {
      const hasMembershipType = columns?.some(col => col.column_name === 'membership_type');
      const hasMembershipDays = columns?.some(col => col.column_name === 'membership_days');

      console.log('📊 redemption_codes 字段检查结果:');
      console.log(`  - membership_type: ${hasMembershipType ? '✅ 存在' : '❌ 不存在'}`);
      console.log(`  - membership_days: ${hasMembershipDays ? '✅ 存在' : '❌ 不存在'}`);

      results.columns.redemption_codes = {
        membership_type: hasMembershipType,
        membership_days: hasMembershipDays
      };
    }

    // 3. 检查 membership_plans 表是否存在
    console.log('📋 检查 membership_plans 表...');
    const { data: membershipPlansTable, error: membershipPlansError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'membership_plans')
      .single();

    if (membershipPlansError) {
      console.log('❌ membership_plans 表不存在:', membershipPlansError.message);
      results.tables.membership_plans = false;
    } else {
      console.log('✅ membership_plans 表存在');
      results.tables.membership_plans = true;
    }

    // 4. 检查 membership_purchases 表是否存在
    console.log('📋 检查 membership_purchases 表...');
    const { data: membershipPurchasesTable, error: membershipPurchasesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'membership_purchases')
      .single();

    if (membershipPurchasesError) {
      console.log('❌ membership_purchases 表不存在:', membershipPurchasesError.message);
      results.tables.membership_purchases = false;
    } else {
      console.log('✅ membership_purchases 表存在');
      results.tables.membership_purchases = true;
    }

    // 5. 尝试调用 redeem_membership_code 函数
    console.log('📋 检查 redeem_membership_code 函数...');
    try {
      const { data: functionTest, error: functionError } = await supabase.rpc('redeem_membership_code', {
        p_user_id: '00000000-0000-0000-0000-000000000000', // 无效UUID用于测试
        p_code: 'TEST_CODE'
      });

      if (functionError) {
        // 预期会报错（因为用户不存在），但这证明函数存在
        if (functionError.message.includes('用户不存在') || functionError.message.includes('invalid')) {
          console.log('✅ redeem_membership_code 函数存在');
          results.functions.redeem_membership_code = true;
        } else {
          console.log('❌ redeem_membership_code 函数可能不存在:', functionError.message);
          results.functions.redeem_membership_code = false;
        }
      }
    } catch (error) {
      console.log('❌ 检查函数时出错:', error);
      results.functions.redeem_membership_code = false;
    }

    // 6. 检查 user_points 表的新字段
    console.log('📋 检查 user_points 表的新字段...');
    const { data: userPointsColumns, error: userPointsColumnError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_schema', 'public')
      .eq('table_name', 'user_points')
      .in('column_name', ['daily_points', 'last_reset_date', 'is_member', 'membership_expires_at']);

    if (userPointsColumnError) {
      console.log('❌ 检查 user_points 字段失败:', userPointsColumnError.message);
      results.columns.user_points = false;
    } else {
      const userPointsFields = {
        daily_points: userPointsColumns?.some(col => col.column_name === 'daily_points'),
        last_reset_date: userPointsColumns?.some(col => col.column_name === 'last_reset_date'),
        is_member: userPointsColumns?.some(col => col.column_name === 'is_member'),
        membership_expires_at: userPointsColumns?.some(col => col.column_name === 'membership_expires_at')
      };

      console.log('📊 user_points 字段检查结果:');
      Object.entries(userPointsFields).forEach(([field, exists]) => {
        console.log(`  - ${field}: ${exists ? '✅ 存在' : '❌ 不存在'}`);
      });

      results.columns.user_points = userPointsFields;
    }

    // 7. 生成总结
    console.log('📊 生成检查总结...');
    const allTablesExist = Object.values(results.tables).every(Boolean);
    const allColumnsExist = Object.values(results.columns).every(col => {
      if (typeof col === 'boolean') return col;
      if (typeof col === 'object') return Object.values(col).every(Boolean);
      return false;
    });
    const allFunctionsExist = Object.values(results.functions).every(Boolean);

    results.summary = {
      all_tables_exist: allTablesExist,
      all_columns_exist: allColumnsExist,
      all_functions_exist: allFunctionsExist,
      need_rerun_sql: !allTablesExist || !allColumnsExist || !allFunctionsExist
    };

    console.log('🎯 检查完成！结果总结:');
    console.log(`  - 所有表存在: ${allTablesExist ? '✅' : '❌'}`);
    console.log(`  - 所有字段存在: ${allColumnsExist ? '✅' : '❌'}`);
    console.log(`  - 所有函数存在: ${allFunctionsExist ? '✅' : '❌'}`);
    console.log(`  - 需要重新运行SQL: ${results.summary.need_rerun_sql ? '❌ 是' : '✅ 否'}`);

    return NextResponse.json({
      success: true,
      data: results,
      message: results.summary.need_rerun_sql
        ? '数据库升级不完整，需要重新运行SQL脚本'
        : '数据库升级完整，无需重新运行SQL脚本'
    });

  } catch (error) {
    console.error('❌ 数据库检查失败:', error);
    return NextResponse.json({
      success: false,
      error: `数据库检查失败: ${error instanceof Error ? error.message : '未知错误'}`
    }, { status: 500 });
  }
}