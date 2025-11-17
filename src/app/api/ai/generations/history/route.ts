import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 开始获取用户AI生成历史记录');

    // 创建服务器端Supabase客户端
    const supabase = createServerSupabaseClient();

    // 获取用户信息
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('❌ 用户认证失败:', authError);
      return NextResponse.json(
        { error: '用户认证失败，请重新登录' },
        { status: 401 }
      );
    }

    console.log('✅ 用户认证成功:', user.id);

    // 获取用户的AI生成历史记录
    const { data: generations, error: fetchError } = await supabase
      .from('ai_generations')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100); // 限制返回最近100条记录

    if (fetchError) {
      console.error('❌ 获取历史记录失败:', fetchError);
      return NextResponse.json(
        { error: '获取历史记录失败', details: fetchError.message },
        { status: 500 }
      );
    }

    console.log('✅ 成功获取历史记录，数量:', generations?.length || 0);

    // 处理数据，确保敏感信息不会泄露
    const processedGenerations = (generations || []).map(gen => ({
      id: gen.id,
      tool_type: gen.tool_type,
      input_data: gen.input_data,
      output_data: gen.output_data,
      final_output: gen.final_output,
      tokens_used: gen.tokens_used || 0,
      points_cost: gen.points_cost || 0,
      status: gen.status,
      created_at: gen.created_at,
      updated_at: gen.updated_at
    }));

    return NextResponse.json({
      success: true,
      generations: processedGenerations,
      total: processedGenerations.length,
      user_id: user.id
    });

  } catch (error) {
    console.error('❌ 获取历史记录过程中发生错误:', error);

    const errorMessage = error instanceof Error ? error.message : '未知错误';

    return NextResponse.json(
      {
        success: false,
        error: '服务器内部错误',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}

// 可选：添加删除历史记录的功能
export async function DELETE(request: NextRequest) {
  try {
    console.log('🗑️ 开始删除用户AI生成历史记录');

    // 创建服务器端Supabase客户端
    const supabase = createServerSupabaseClient();

    // 获取用户信息
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('❌ 用户认证失败:', authError);
      return NextResponse.json(
        { error: '用户认证失败，请重新登录' },
        { status: 401 }
      );
    }

    // 获取请求体
    const { generationId, deleteAll } = await request.json();

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

    console.log('✅ 成功删除历史记录');

    return NextResponse.json({
      success: true,
      message: deleteAll ? '所有历史记录已删除' : '指定记录已删除'
    });

  } catch (error) {
    console.error('❌ 删除历史记录过程中发生错误:', error);

    const errorMessage = error instanceof Error ? error.message : '未知错误';

    return NextResponse.json(
      {
        success: false,
        error: '服务器内部错误',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}