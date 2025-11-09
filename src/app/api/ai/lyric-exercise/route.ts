import { NextRequest, NextResponse } from 'next/server';
import { CloudMistService } from '@/lib/cloudmist-api';
import { SupabasePointsService } from '@/lib/supabase-points-service';

// 听歌写词练习题生成的系统提示词
const LYRIC_EXERCISE_PROMPT = `你是一位专业的英语教学专家，擅长基于歌词创建高质量的填空练习题，帮助学生提高词汇记忆和听力理解能力。

任务要求：
1. 基于提供的歌词，智能选择适合的词汇或语块进行填空练习设计
2. 选择难度适中、教育价值高的内容（优先选择欧标B1-B2水平的核心词汇或常用语块）
3. 每个填空最多考查1个单词或1个语块（语块可以是固定搭配、短语等，但整体作为一个考查单元）
4. 为每道题提供清晰的配套答案
5. 练习题设计要注重实用性和教育价值
6. 保持原歌词的流畅性和节奏感

练习题格式要求：
- 使用"____"表示需要填写的空格位置
- 直接提供空格，不显示答案（答案将在下载的文档中提供）
- 答案可以是单个单词或一个完整的语块（如：固定搭配、短语动词等）
- 每行歌词都要保留押韵格式和原有结构
- 确保填空后的句子语法正确、语义通顺

选择考查内容的原则：
- 优先选择高频词汇、核心词汇或常用语块
- 可以选择有教育价值的固定搭配（如：look forward to, take care of等）
- 可以选择重要的短语动词（如：give up, put on等）
- 避免选择专有名词、数字、时间表达等
- 确保填空位置分布均匀，每行建议1-2个填空，不要过于密集
- 选择对学生学习有实际帮助的词汇或语块
- 考虑词汇/语块的实用性和复用价值

重要注意事项：
- 如果选择语块作为考查内容，确保该语块是一个完整、有意义的语言单位
- 练习题不显示答案，确保学生可以独立完成

请严格按照以上要求，为提供的歌词创建高质量的填空练习题，确保每道题都有明确的考查重点。`;

export async function POST(request: NextRequest) {
  try {
    const { lyrics, userId, difficulty = 'medium' } = await request.json();

    // 参数验证
    if (!lyrics || !lyrics.trim()) {
      return NextResponse.json({
        success: false,
        error: '请提供要生成练习题的歌词'
      }, { status: 400 });
    }

    // 验证用户登录
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: '用户未登录，请先登录'
      }, { status: 401 });
    }

    // 检查用户点数
    const userPoints = await SupabasePointsService.getUserPoints(userId);
    const pointsCost = 1; // 练习题生成消耗1点数

    if (userPoints < pointsCost) {
      return NextResponse.json({
        success: false,
        error: `点数不足，当前: ${userPoints}点，需要: ${pointsCost}点`
      }, { status: 400 });
    }

    console.log('📝 开始生成听歌写词练习题');
    console.log('📝 歌词长度:', lyrics.length);
    console.log('📝 难度级别:', difficulty);
    console.log('📝 处理全文歌词');
    console.log('📝 歌词内容预览:', lyrics.substring(0, 200) + '...');

    // 根据难度级别调整选择策略
    let selectionStrategy = '';
    if (difficulty === 'easy') {
      selectionStrategy = '选择最常见的核心词汇，每个填空位置都要确保学生能够通过上下文推理出答案。优先选择基础动词、常用名词和简单形容词。';
    } else if (difficulty === 'hard') {
      '选择更有挑战性的词汇，包括一些重要的短语动词、副词和连接词。确保练习题有一定的挑战性但仍然可以通过语境解决。';
    } else {
      selectionStrategy = '选择中等难度的核心词汇，既要有教育价值又不能过于困难。平衡常见词汇和重要但不那么常见的词汇。';
    }

    // 构建详细的用户提示词
    const userPrompt = `请基于以下歌词创建听歌写词填空练习题：

歌词内容：
${lyrics}

难度级别：${difficulty}
处理范围：全文歌词

具体要求：
1. ${selectionStrategy}
2. 使用填空格式：____，只留空格不显示答案
3. 每行建议设置1-2个填空，最多不超过2个
4. 保持原歌词的韵律和节奏
5. 优先选择教育价值高的单个词汇或常用语块
6. 确保练习题的实用性和可学习性
7. 如果选择语块，确保是完整的语言单位（如固定搭配、短语动词等）
8. 在练习题最后单独提供答案，格式为：答案：1. xxx, 2. xxx, 3. xxx...

重要提醒：
- 每个填空只考查一个语言单位（1个单词或1个语块）
- 答案单独放在最后，按题号顺序排列
- 练习题要适合学生自主学习使用
- 请确保生成完整的练习题，不要截断

请只返回处理后的练习题和答案，不需要额外解释。`;

    // 使用CloudMist的gemini-2.5-pro模型生成练习题，增加token限制避免截断
    const exerciseText = await CloudMistService.generateText(
      userPrompt,
      'gemini-2.5-pro',
      LYRIC_EXERCISE_PROMPT,
      3000 // 增加到3000 tokens确保完整生成
    );

    if (!exerciseText || exerciseText.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: '练习题生成失败，请稍后重试'
      }, { status: 500 });
    }

    console.log('📝 练习题生成成功，长度:', exerciseText.length);
    console.log('📝 生成内容预览:', exerciseText.substring(0, 200) + '...');

    // 扣除点数
    const deductSuccess = await SupabasePointsService.deductPoints(
      userId,
      pointsCost,
      '听歌写词练习题生成',
      null,
      {
        lyricsLength: lyrics.length,
        difficulty,
        section: 'all',
        exerciseLength: exerciseText.length
      }
    );

    if (!deductSuccess) {
      return NextResponse.json({
        success: false,
        error: '点数扣除失败，请稍后重试'
      }, { status: 500 });
    }

    // 记录生成结果到数据库
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      await supabase.from('ai_generations').insert({
        user_id: userId,
        tool_type: 'lyric_exercise',
        input_data: {
          lyrics: lyrics.substring(0, 500) + '...',
          difficulty,
          section,
          lyricsLength: lyrics.length
        },
        output_data: {
          exercise: exerciseText,
          exerciseLength: exerciseText.length,
          wordCount: exerciseText.split(/\s+/).filter(word => word.includes('____')).length
        },
        points_cost: pointsCost,
        model_used: 'gemini-2.5-pro',
        created_at: new Date().toISOString()
      });
    } catch (dbError) {
      console.error('保存生成记录失败:', dbError);
    }

    // 获取用户剩余点数
    const remainingPoints = await SupabasePointsService.getUserPoints(userId);

    return NextResponse.json({
      success: true,
      exercise: exerciseText.trim(),
      originalLyrics: lyrics.trim(),
      wordCount: exerciseText.split(/\s+/).filter(word => word.includes('____')).length,
      pointsCost: pointsCost,
      remainingPoints: remainingPoints,
      difficulty: difficulty,
      modelUsed: 'gemini-2.5-pro'
    });

  } catch (error) {
    console.error('听歌写词练习题生成API错误:', error);

    return NextResponse.json({
      success: false,
      error: '服务器内部错误，请稍后重试'
    }, { status: 500 });
  }
}