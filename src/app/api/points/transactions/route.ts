import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();

    // 使用Supabase标准认证方式
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('认证错误:', authError);
      return NextResponse.json(
        { error: '未认证' },
        { status: 401 }
      );
    }

    // 获取URL参数
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    console.log('获取交易记录:', { userId: user.id, page, limit, offset });

    // 获取交易记录
    const { data: transactions, error: transactionsError } = await supabase
      .from('point_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (transactionsError) {
      console.error('获取交易记录失败:', transactionsError);
      return NextResponse.json(
        { error: '获取交易记录失败', details: transactionsError.message },
        { status: 500 }
      );
    }

    // 获取总数
    const { count, error: countError } = await supabase
      .from('point_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (countError) {
      console.error('获取交易记录总数失败:', countError);
      return NextResponse.json(
        { transactions: transactions || [], total: 0 },
        { status: 200 }
      );
    }

    // 转换字段名：created_at -> createdAt
    const transformedTransactions = (transactions || []).map((t: any) => ({
      ...t,
      createdAt: t.created_at
    }));

    return NextResponse.json({
      transactions: transformedTransactions,
      total: count || 0
    });

  } catch (error) {
    console.error('获取交易记录异常:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}

