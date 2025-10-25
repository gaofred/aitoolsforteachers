import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();

    // 获取总用户数
    const { count: totalUsers, error: usersError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (usersError) {
      console.error('获取用户统计失败:', usersError);
    }

    // 获取总交易数
    const { count: totalTransactions, error: transactionsError } = await supabase
      .from('point_transactions')
      .select('*', { count: 'exact', head: true });

    if (transactionsError) {
      console.error('获取交易统计失败:', transactionsError);
    }

    // 获取总点数
    const { data: pointsData, error: pointsError } = await supabase
      .from('user_points')
      .select('points');

    let totalPoints = 0;
    if (!pointsError && pointsData) {
      totalPoints = (pointsData as any)?.reduce((sum: number, item: any) => sum + (item.points || 0), 0) || 0;
    }

    // 获取活跃用户数（最近7天有交易的用户）
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: activeUsersData, error: activeUsersError } = await supabase
      .from('point_transactions')
      .select('user_id')
      .gte('created_at', sevenDaysAgo.toISOString());

    let activeUsers = 0;
    if (!activeUsersError && activeUsersData) {
      const uniqueUsers = new Set((activeUsersData as any)?.map((item: any) => item.user_id));
      activeUsers = uniqueUsers.size;
    }

    return NextResponse.json({
      totalUsers: totalUsers || 0,
      totalTransactions: totalTransactions || 0,
      totalPoints: totalPoints,
      activeUsers: activeUsers
    });

  } catch (error) {
    console.error('获取统计数据失败:', error);
    return NextResponse.json(
      { error: '获取统计数据失败' },
      { status: 500 }
    );
  }
}








