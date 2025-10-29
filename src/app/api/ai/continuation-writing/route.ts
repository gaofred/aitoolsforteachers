import { NextRequest, NextResponse } from 'next/server';
import { SupabasePointsService } from '@/lib/supabase-points-service';

// 云雾API配置
const CLOUDMIST_GOOGLE_API_KEY = process.env.CLOUDMIST_GOOGLE_API_KEY;
const CLOUDMIST_API_URL = 'https://yunwu.ai/v1/chat/completions';

export async function POST(request: NextRequest) {
  try {
    // 验证API Key配置
    if (!CLOUDMIST_GOOGLE_API_KEY) {
      console.error('云雾谷歌专用API Key未配置');
      return NextResponse.json(
        { error: '服务配置错误，请联系管理员' },
        { status: 500 }
      );
    }

    // 解析请求数据
    const body = await request.json();
    const { originalText, paragraph1, paragraph2, difficulty = "intermediate", userId } = body;

    // 验证输入参数
    if (!originalText || !paragraph1 || !paragraph2) {
      return NextResponse.json(
        { error: '请提供完整的续写内容：原文、段落1开头、段落2开头' },
        { status: 400 }
      );
    }

    // 验证用户登录
    if (!userId) {
      return NextResponse.json(
        { error: '用户未登录，请先登录' },
        { status: 401 }
      );
    }

    // 检查用户点数
    // 根据难度设置点数消耗
    const getPointsCost = (difficultyLevel: string) => {
      switch (difficultyLevel) {
        case "beginner": return 6;  // A2~B1 基础版
        case "intermediate": return 6;  // B1~B2 标准版
        case "advanced": return 6;  // B2~C1 进阶版
        default: return 6;
      }
    };

    const pointsCost = getPointsCost(difficulty);
    const userPoints = await SupabasePointsService.getUserPoints(userId);

    if (!userPoints || userPoints.points < pointsCost) {
      return NextResponse.json(
        { error: `点数不足，需要${pointsCost}个点数` },
        { status: 400 }
      );
    }

    // 根据难度设置提示词要求
    const getDifficultyRequirements = (difficultyLevel: string) => {
      switch (difficultyLevel) {
        case "beginner":
          return {
            level: "A2~B1 English level",
            vocabDesc: "使用基础词汇和简单语法结构，适合初学者理解",
            sentenceComplexity: "使用简单句和基础复合句",
            vocabRange: "使用常见高频词汇，避免复杂表达"
          };
        case "intermediate":
          return {
            level: "B1~B2 English level",
            vocabDesc: "使用中等难度词汇和复合句结构",
            sentenceComplexity: "使用简单句和复合句结合，适当使用从句",
            vocabRange: "使用日常词汇和部分学术词汇"
          };
        case "advanced":
          return {
            level: "B2~C1 English level",
            vocabDesc: "使用高级词汇和复杂语法结构",
            sentenceComplexity: "使用复杂句式，包括各种从句和高级语法",
            vocabRange: "使用丰富的高级词汇和表达方式"
          };
        default:
          return {
            level: "B1~B2 English level",
            vocabDesc: "使用中等难度词汇和复合句结构",
            sentenceComplexity: "使用简单句和复合句结合，适当使用从句",
            vocabRange: "使用日常词汇和部分学术词汇"
          };
      }
    };

    const difficultyRequirements = getDifficultyRequirements(difficulty);

    // 构建AI提示词
    const prompt = `##Instruction
Continue the story using the given paragraph starters, and provide Chinese translations for each paragraph.

##original text
${originalText}

## Paragraph Starters
Para1: ${paragraph1}
Para2: ${paragraph2}

## Difficulty Level: ${difficulty.toUpperCase()} (${difficultyRequirements.level})

## Requirements
1 Aim for a positive ending, approximately 180 words in total.
2 Approximately 90 words for each paragraph you write.
3 Ensure the end of the first paragraph transitions smoothly into the start of the second paragraph.
4 Try to use words or synonyms from the original text to maintain consistency.
5 Ensure the vocabulary and grammar used in the article are suitable for ${difficultyRequirements.level}.
6 ${difficultyRequirements.vocabDesc}: ${difficultyRequirements.vocabRange}
7 ${difficultyRequirements.sentenceComplexity}.
8 Six sentences for each paragraph
9 Maintain a consistent language style with the previous text.
10 After each English paragraph, provide a clear Chinese translation.

## Format Requirements:
Please present your response in the following format:

**Paragraph 1:**
[Your English continuation text - about 90 words, 6 sentences]

**中文翻译 (Chinese Translation):**
[Chinese translation of Paragraph 1]

**Paragraph 2:**
[Your English continuation text - about 90 words, 6 sentences]

**中文翻译 (Chinese Translation):**
[Chinese translation of Paragraph 2]

## Example
**Paragraph 1:**
A few weeks later, when I almost forgot the contest, there came the news. I had won! My teacher called me into his office with a proud smile. He handed me a certificate and said, "I knew you could do it." It was a moment of triumph that I had never imagined possible. All the hard work and persistence had paid off.

**中文翻译 (Chinese Translation):**
几周后，当我几乎忘记比赛时，传来了消息。我赢了！老师把我叫到他的办公室，脸上带着自豪的微笑。他递给我一张证书说："我就知道你能做到。"这是我从未想象过的胜利时刻。所有的努力和坚持都得到了回报。

**Paragraph 2:**
I went to my teacher's office after the award presentation. He looked at me with a twinkle in his eye and said, "You see, you had it in you all along." I thanked him for believing in me when I didn't believe in myself. From that day forward, I approached challenges with a new sense of confidence and determination. Writing had become not just a task, but a joy.

**中文翻译 (Chinese Translation):**
颁奖典礼后我去了老师的办公室。他眼中闪烁着光芒说："你看，你一直都很有潜力。"我感谢他在我不相信自己时相信我。从那天起，我带着新的信心和决心面对挑战。写作不再只是一项任务，而是一种乐趣。`;

    console.log('🚀 开始调用云雾谷歌API进行读后续写...');
    console.log('📝 原文长度:', originalText.length);
    console.log('📝 段落1开头:', paragraph1);
    console.log('📝 段落2开头:', paragraph2);

    // 调用云雾API
    const response = await fetch(CLOUDMIST_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CLOUDMIST_GOOGLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gemini-2.5-pro',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 8000
      })
    });

    console.log('📡 收到云雾API响应，状态码:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('云雾API调用失败:', {
        status: response.status,
        statusText: response.statusText,
        errorText: errorText
      });

      // API调用失败，退还点数
      try {
        const refundResult = await SupabasePointsService.addPoints(
          userId,
          pointsCost,
          'REFUND',
          `读后续写生成失败 - 云雾API调用失败 (HTTP ${response.status})`
        );

        console.log('点数退还结果:', refundResult);

        return NextResponse.json(
          {
            error: 'AI服务暂时不可用，请稍后重试',
            refunded: refundResult,
            pointsRefunded: refundResult ? pointsCost : 0
          },
          { status: 500 }
        );
      } catch (refundError) {
        console.error('退还点数失败:', refundError);
        return NextResponse.json(
          {
            error: 'AI服务暂时不可用，请稍后重试',
            refunded: false,
            pointsRefunded: 0,
            refundError: '点数退还失败，请联系客服'
          },
          { status: 500 }
        );
      }
    }

    const data = await response.json();
    console.log('✅ 云雾API调用成功！');

    // 提取AI生成的内容
    const generatedContent = data.choices?.[0]?.message?.content;

    if (!generatedContent) {
      console.error('云雾API返回的内容为空:', data);

      // AI返回空内容，退还点数
      try {
        const refundResult = await SupabasePointsService.addPoints(
          userId,
          pointsCost,
          'REFUND',
          '读后续写生成失败 - AI返回空内容'
        );

        console.log('点数退还结果（空内容）:', refundResult);

        return NextResponse.json(
          {
            error: 'AI生成内容为空，请重试',
            refunded: refundResult,
            pointsRefunded: refundResult ? pointsCost : 0
          },
          { status: 500 }
        );
      } catch (refundError) {
        console.error('退还点数失败（空内容）:', refundError);
        return NextResponse.json(
          {
            error: 'AI生成内容为空，请重试',
            refunded: false,
            pointsRefunded: 0,
            refundError: '点数退还失败，请联系客服'
          },
          { status: 500 }
        );
      }
    }

    console.log('📝 生成的内容长度:', generatedContent.length);

    // 扣除用户点数
    const pointsResult = await SupabasePointsService.deductPoints(
      userId,
      pointsCost,
      `读后续写范文生成`,
      'continuation_writing_model_essay'
    );

    if (!pointsResult) {
      console.error('扣除点数失败');
      return NextResponse.json(
        { error: '点数扣除失败，请联系客服' },
        { status: 500 }
      );
    }

    // 保存生成记录到数据库
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const { data: insertData, error: insertError } = await supabase
        .from('ai_generations')
        .insert({
          user_id: userId,
          tool_type: 'writing',
          tool_name: 'continuation_writing_model_essay',
          input_data: {
            originalText,
            paragraph1,
            paragraph2
          },
          output_data: {
            generatedContent,
            wordCount: generatedContent.length
          },
          points_cost: pointsCost,
          created_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('保存生成记录失败:', insertError);
        // 不影响主要功能，只记录错误
      } else {
        console.log('✅ 生成记录保存成功');
      }
    } catch (dbError) {
      console.error('数据库操作异常:', dbError);
    }

    // 重新获取用户最新点数
    const updatedUserPoints = await SupabasePointsService.getUserPoints(userId);

    // 返回成功响应
    const result = {
      success: true,
      result: generatedContent,
      pointsCost,
      remainingPoints: updatedUserPoints,
      metadata: {
        originalTextLength: originalText.length,
        generatedContentLength: generatedContent.length,
        timestamp: new Date().toISOString()
      }
    };

    console.log('🎉 读后续写范文生成完成！');
    console.log('💰 消耗点数:', pointsCost);
    console.log('📊 剩余点数:', result.remainingPoints);

    return NextResponse.json(result);

  } catch (error) {
    console.error('读后续写API处理失败:', error);

    // 尝试退回积分
    try {
      const refundResult = await SupabasePointsService.addPoints(
        userId,
        6, // 使用固定的6点数
        'REFUND',
        '读后续写生成失败 - 系统异常退回'
      );

      console.log('异常处理点数退还结果:', refundResult);

      return NextResponse.json(
        {
          error: '服务器内部错误，请稍后重试',
          refunded: refundResult,
          pointsRefunded: refundResult ? 6 : 0
        },
        { status: 500 }
      );
    } catch (refundError) {
      console.error('异常处理中退还点数失败:', refundError);
      return NextResponse.json(
        {
          error: '服务器内部错误，请稍后重试',
          refunded: false,
          pointsRefunded: 0,
          refundError: '点数退还失败，请联系客服'
        },
        { status: 500 }
      );
    }
  }
}