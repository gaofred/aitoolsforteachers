import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 开始获取用户AI生成历史记录');
    const supabase = createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('❌ 用户认证失败:', authError);
      return NextResponse.json(
        { error: '用户认证失败，请重新登录' },
        { status: 401 }
      );
    }

    console.log('✅ 用户认证成功:', user.id);

    const { data: generations, error: fetchError } = await supabase
      .from('ai_generations')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (fetchError) {
      console.error('❌ 获取历史记录失败:', fetchError);
      return NextResponse.json(
        { error: '获取历史记录失败', details: fetchError.message },
        { status: 500 }
      );
    }

    console.log('✅ 成功获取历史记录，数量:', generations?.length || 0);
    return NextResponse.json({
      generations: generations || [],
      success: true
    });
  } catch (error) {
    console.error('❌ 获取历史记录过程中发生错误:', error);
    return NextResponse.json(
      { error: '服务器内部错误', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    console.log('🗑️ 开始删除用户AI生成历史记录');
    const supabase = createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '用户认证失败，请重新登录' },
        { status: 401 }
      );
    }

    const { generationId, deleteAll } = request.json();

    let deleteResult;

    if (deleteAll) {
      // 删除用户的所有历史记录
      const { data, error } = await supabase
        .from('ai_generations')
        .delete()
        .eq('user_id', user.id);

      deleteResult = { data, error };
    } else if (generationId) {
      // 删除指定的历史记录
      const { data, error } = await supabase
        .from('ai_generations')
        .delete()
        .eq('id', generationId)
        .eq('user_id', user.id);

      deleteResult = { data, error };
    } else {
      return NextResponse.json(
        { error: '请提供要删除的记录ID或设置deleteAll为true' },
        { status: 400 }
      );
    }

    if (deleteResult.error) {
      console.error('❌ 删除历史记录失败:', deleteResult.error);
      return NextResponse.json(
        { error: '删除历史记录失败', details: deleteResult.error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: deleteAll ? '所有历史记录已删除' : '指定记录已删除'
    });
  } catch (error) {
    console.error('❌ 删除历史记录过程中发生错误:', error);
    return NextResponse.json(
      { error: '服务器内部错误', details: error.message },
      { status: 500 }
    );
  }
}