import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// 测试数据库连接
export async function GET() {
  try {
    console.log('开始测试数据库连接...');

    // 创建Supabase客户端
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 测试基本连接
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    console.log('基本连接测试:', { testData, testError });

    if (testError) {
      return NextResponse.json({
        success: false,
        error: "数据库连接失败: " + testError.message
      });
    }

    // 测试邀请系统表是否存在
    const { data: tableData, error: tableError } = await supabase
      .from('invitation_codes')
      .select('count')
      .limit(1);

    console.log('邀请表测试:', { tableData, tableError });

    if (tableError) {
      return NextResponse.json({
        success: false,
        error: "邀请系统表不存在: " + tableError.message
      });
    }

    // 测试数据库函数是否存在
    const { data: funcData, error: funcError } = await supabase
      .rpc('create_invitation_code', { p_inviter_id: '00000000-0000-0000-0000-000000000000' });

    console.log('函数测试:', { funcData, funcError });

    return NextResponse.json({
      success: true,
      data: {
        basicConnection: !!testData,
        invitationTable: !!tableData,
        functionExists: funcError ? false : true,
        functionError: funcError?.message
      }
    });

  } catch (error) {
    console.error('数据库测试失败:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
}