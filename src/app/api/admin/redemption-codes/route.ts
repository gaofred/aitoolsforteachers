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

    // 兼容前端发送的字段名
    const points = requestData.points || requestData.value;
    const description = requestData.description;
    const expires_at = requestData.expires_at;
    const count = requestData.count || 1;

    console.log('请求参数:', { points, description, expires_at, count });

    if (!points || !description) {
      return NextResponse.json(
        { error: '缺少必要参数: points/value 和 description' },
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

      codes.push({
        code,
        type: 'POINTS', // 兑换码类型：POINTS 或 MEMBERSHIP_DAYS
        value: points, // 注意：数据库字段是 value，不是 points
        description,
        expires_at: expires_at || null,
        is_used: false,
        created_at: new Date().toISOString()
      });
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
