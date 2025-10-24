import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const { userId, points, description } = await request.json();

    if (!userId || !points || !description) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // 添加点数到用户账户
    const { error: addPointsError } = await supabase.rpc('add_user_points', {
      p_user_id: userId,
      p_amount: points,
      p_type: 'BONUS',
      p_description: description,
      p_related_id: null,
      p_metadata: {
        source: 'admin',
        admin_action: true,
        description: description
      }
    } as any);

    if (addPointsError) {
      console.error('添加点数失败:', addPointsError);
      return NextResponse.json(
        { error: '添加点数失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '点数添加成功'
    });

  } catch (error) {
    console.error('添加点数失败:', error);
    return NextResponse.json(
      { error: '添加点数失败' },
      { status: 500 }
    );
  }
}
