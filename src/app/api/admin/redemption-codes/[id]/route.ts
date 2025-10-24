import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: '缺少兑换码ID' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // 删除兑换码
    const { error } = await supabase
      .from('redemption_codes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('删除兑换码失败:', error);
      return NextResponse.json(
        { error: '删除兑换码失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '兑换码删除成功'
    });

  } catch (error) {
    console.error('删除兑换码失败:', error);
    return NextResponse.json(
      { error: '删除兑换码失败' },
      { status: 500 }
    );
  }
}
