import { NextRequest, NextResponse } from 'next/server';
import { SupabasePointsService } from '@/lib/supabase-points-service';

export async function POST(request: NextRequest) {
  try {
    const { userId, points } = await request.json();

    if (!userId || !points) {
      return NextResponse.json({ error: '参数不完整' }, { status: 400 });
    }

    console.log(`🔄 退回积分请求: 用户=${userId}, 积分=${points}`);

    const result = await SupabasePointsService.addPoints(userId, points, 'BONUS', '阅读理解解析失败退回');

    if (result) {
      console.log('✅ 积分退回成功');
      return NextResponse.json({ success: true });
    } else {
      console.error('❌ 积分退回失败');
      return NextResponse.json({ error: '积分退回失败' }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ 退回积分API错误:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : '服务器错误'
    }, { status: 500 });
  }
}