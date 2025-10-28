import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// 生成随机兑换码
function generateRedemptionCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function GET() {
  try {
    console.log('开始获取兑换码列表...');
    const supabase = createServerSupabaseClient();

    // 获取所有兑换码
    const { data: codes, error } = await supabase
      .from('redemption_codes')
      .select(`
        id,
        code,
        type,
        value,
        membership_type,
        membership_days,
        description,
        created_at,
        used_at,
        used_by,
        is_used,
        expires_at
      `)
      .order('created_at', { ascending: false });

    console.log('Supabase 查询结果:', { codes: codes?.length || 0, error: error?.message });

    if (error) {
      console.error('获取兑换码列表失败:', error);
      return NextResponse.json(
        { error: `获取兑换码列表失败: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      codes: codes || []
    });

  } catch (error) {
    console.error('获取兑换码列表失败:', error);
    return NextResponse.json(
      { error: `获取兑换码列表失败: ${error instanceof Error ? error.message : '未知错误'}` },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('开始创建兑换码...');
    const requestData = await request.json();

    // 支持多种类型的兑换码
    const type = requestData.type || 'POINTS'; // POINTS, MEMBERSHIP_DAYS, MEMBERSHIP
    const value = requestData.value || requestData.points;
    const description = requestData.description;
    const expires_at = requestData.expires_at;
    const count = requestData.count || 1;
    const membership_type = requestData.membership_type; // PREMIUM, PRO
    const membership_days = requestData.membership_days || 30;

    console.log('请求参数:', { type, value, description, expires_at, count, membership_type, membership_days });

    // 参数验证
    if (!description) {
      return NextResponse.json(
        { error: '缺少必要参数: description' },
        { status: 400 }
      );
    }

    if (type === 'POINTS' && !value) {
      return NextResponse.json(
        { error: '点数兑换码需要提供 value 或 points 参数' },
        { status: 400 }
      );
    }

    if ((type === 'MEMBERSHIP_DAYS' || type === 'MEMBERSHIP') && !membership_type) {
      return NextResponse.json(
        { error: '会员兑换码需要提供 membership_type 参数' },
        { status: 400 }
      );
    }

    if (count > 100) {
      return NextResponse.json(
        { error: '一次最多创建100个兑换码' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // 生成兑换码
    const codes = [];
    for (let i = 0; i < count; i++) {
      let code;
      let isUnique = false;

      // 确保兑换码唯一
      while (!isUnique) {
        code = generateRedemptionCode();
        const { data: existingCode, error: checkError } = await supabase
          .from('redemption_codes')
          .select('id')
          .eq('code', code as any)
          .single();

        if (checkError && checkError.code === 'PGRST116') {
          // 没找到记录，说明是唯一的
          isUnique = true;
        } else if (checkError) {
          console.error('检查兑换码唯一性失败:', checkError);
          throw new Error(`检查兑换码唯一性失败: ${checkError.message}`);
        } else {
          // 找到了记录，需要重新生成
          console.log(`兑换码 ${code} 已存在，重新生成...`);
        }
      }

      const codeData: any = {
        code,
        type,
        description,
        expires_at: expires_at || null,
        is_used: false,
        created_at: new Date().toISOString()
      };

      // 根据类型添加特定字段
      if (type === 'POINTS') {
        codeData.value = value;
      } else if (type === 'MEMBERSHIP_DAYS' || type === 'MEMBERSHIP') {
        codeData.membership_type = membership_type;
        codeData.membership_days = membership_days;
        codeData.value = 0; // 会员兑换码value为0
      }

      codes.push(codeData);
    }

    console.log(`准备插入 ${codes.length} 个兑换码`);

    // 批量插入兑换码
    const { data: insertedCodes, error } = await supabase
      .from('redemption_codes')
      .insert(codes as any)
      .select('code');

    console.log('插入结果:', {
      inserted: insertedCodes?.length || 0,
      error: error?.message
    });

    if (error) {
      console.error('创建兑换码失败:', error);
      return NextResponse.json(
        { error: `创建兑换码失败: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      codes: (insertedCodes as any)?.map((item: any) => item.code) || [],
      message: `成功创建 ${insertedCodes?.length || 0} 个兑换码`
    });

  } catch (error) {
    console.error('创建兑换码失败:', error);
    return NextResponse.json(
      { error: `创建兑换码失败: ${error instanceof Error ? error.message : '未知错误'}` },
      { status: 500 }
    );
  }
}
