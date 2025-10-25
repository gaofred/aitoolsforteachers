import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    
    // 检查 point_transactions 表是否存在
    const { data, error } = await supabase
      .from('point_transactions')
      .select('count(*)')
      .limit(1);
    
    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        tableExists: false
      });
    }
    
    return NextResponse.json({
      success: true,
      tableExists: true,
      message: 'point_transactions 表存在'
    });
    
  } catch (error) {
    console.error('检查数据库表失败:', error);
    return NextResponse.json({
      success: false,
      error: '检查数据库表失败',
      tableExists: false
    }, { status: 500 });
  }
}







