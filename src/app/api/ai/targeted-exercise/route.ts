import { NextRequest, NextResponse } from 'next/server'
import { CloudMistService } from '@/lib/cloudmist-api'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// 针对性练习的专用提示词
const TARGETED_EXERCISE_PROMPT = `你是一位专业的英语词汇教学专家，擅长根据词汇梳理结果设计针对性的练习题。请根据用户提供的词汇梳理结果，创作高质量的针对性练习，帮助学生在具体语境中掌握词汇运用。

## 核心任务
1. **分析词汇梳理结果**：从词汇梳理结果中提取所有核心词汇和子主题
2. **设计针对性练习**：创作功能例句填空练习，每句一个空格
3. **中文提示词汇**：每个空格都有中文提示，帮助学生理解所需词汇
4. **贴合学习场景**：练习内容要贴近学生的实际学习生活

## 练习要求
1. **练习类型**：功能例句填空题
2. **提示方式**：中文提示词汇，每句1词
3. **场景设计**：贴合高中生的学习场景和日常生活
4. **难度适中**：适合高中生理解和完成
5. **覆盖全面**：尽可能覆盖梳理结果中的核心词汇

## 输出格式

### 🎯 【针对性练习】

**练习 1：功能例句填空（中文提示词汇）**

请根据中文提示，在括号中填入正确的词汇：

1. [15-25词的英文句子，包含一个空格] (中文提示词汇)

2. [15-25词的英文句子，包含一个空格] (中文提示词汇)

3. [15-25词的英文句子，包含一个空格] (中文提示词汇)

4. [15-25词的英文句子，包含一个空格] (中文提示词汇)

5. [15-25词的英文句子，包含一个空格] (中文提示词汇)

6. [15-25词的英文句子，包含一个空格] (中文提示词汇)

7. [15-25词的英文句子，包含一个空格] (中文提示词汇)

8. [15-25词的英文句子，包含一个空格] (中文提示词汇)

**答案解析：**
1. [正确答案] - [简短的用法解释]
2. [正确答案] - [简短的用法解释]
3. [正确答案] - [简短的用法解释]
4. [正确答案] - [简短的用法解释]
5. [正确答案] - [简短的用法解释]
6. [正确答案] - [简短的用法解释]
7. [正确答案] - [简短的用法解释]
8. [正确答案] - [简短的用法解释]

**练习特点：**
- 练习内容与词汇梳理的子主题保持一致
- 句子场景贴近学生学习和生活实际
- 中文提示准确对应目标词汇
- 答案解析简洁明了，帮助学生理解用法

【极其重要的输出要求】
- 必须严格按照上述格式输出，不得遗漏任何部分
- 每个练习句子都要包含一个空格，格式为：(空格位置)
- 中文提示要准确对应目标词汇的含义
- 必须提供完整的答案解析
- 确保输出完整，不要在中途停止
- 句子长度控制在15-25词之间
- 练习内容要有教育意义和实用价值

请直接生成完整的针对性练习内容，确保质量优秀且具有实用性。`

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();

    // 使用Supabase标准认证方式
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('认证错误:', authError);
      return NextResponse.json(
        { error: '未认证 - 请先登录' },
        { status: 401 }
      );
    }

    console.log('用户认证成功:', user.id);

    const { topic, vocabularyOrganiseResult } = await request.json();

    // 验证输入
    if (!vocabularyOrganiseResult || !vocabularyOrganiseResult.trim()) {
      return NextResponse.json({
        error: '请先完成词汇梳理再生成针对性练习'
      }, { status: 400 });
    }

    // 检查用户点数是否足够
    const { data: userPoints, error: pointsError } = await supabase
      .from('user_points')
      .select('points')
      .eq('user_id', user.id as any)
      .single();

    if (pointsError || !userPoints) {
      return NextResponse.json(
        { error: '获取用户点数失败' },
        { status: 500 }
      );
    }

    const requiredPoints = 4
    if ((userPoints as any)?.points < requiredPoints) {
      return NextResponse.json(
        { error: `积分不足，需要${requiredPoints}点，当前${(userPoints as any)?.points}点` },
        { status: 400 }
      );
    }

    // 使用云雾API调用Gemini-2.5-Pro模型
    try {
      console.log('开始调用云雾API进行针对性练习生成...')
      console.log('使用模型: gemini-2.5-pro')
      console.log('输入主题:', topic || '未提供')
      console.log('词汇梳理结果长度:', vocabularyOrganiseResult.length)

      const result = await CloudMistService.chatCompletions({
        model: 'gemini-2.5-pro',
        messages: [
          {
            role: 'system',
            content: TARGETED_EXERCISE_PROMPT
          },
          {
            role: 'user',
            content: `请根据以下词汇梳理结果创作针对性练习：\n\n大单元主题：${topic || '未提供'}\n\n词汇梳理结果：\n${vocabularyOrganiseResult}\n\n【重要提醒：请创作高质量的针对性练习，确保中文提示准确，句子内容贴近学习场景！】`
          }
        ],
        max_tokens: 6000, // 设置足够的tokens确保完整输出
        temperature: 0.4, // 适中的创造性
        stream: false
      })

      const exerciseResult = result.choices[0]?.message?.content || '';
      console.log('针对性练习生成完成，结果长度:', exerciseResult.length)

      // 检查结果是否完整
      if (exerciseResult.length < 800) {
        console.warn('⚠️ 警告：针对性练习结果可能被截断，长度过短！')
      }

      // 检查是否包含完整的格式
      const hasCompleteStructure = exerciseResult.includes('### 🎯 【针对性练习】') &&
                                  exerciseResult.includes('练习 1：功能例句填空') &&
                                  exerciseResult.includes('答案解析：')

      if (!hasCompleteStructure) {
        console.warn('⚠️ 警告：针对性练习结果格式不完整，缺少必要的部分！')
      }

      // 扣除用户点数
      const { error: deductError } = await supabase.rpc('add_user_points', {
        p_user_id: user.id,
        p_amount: -requiredPoints,
        p_type: 'GENERATE',
        p_description: '针对性练习',
        p_related_id: null
      } as any);

      if (deductError) {
        console.error('扣除点数失败:', deductError);
        return NextResponse.json(
          { error: '点数扣除失败，请稍后重试' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        result: exerciseResult,
        pointsCost: requiredPoints,
        remainingPoints: ((userPoints as any)?.points || 0) - requiredPoints
      });

    } catch (apiError) {
      console.error('云雾API调用失败:', apiError)

      // 退回积分
      await supabase.rpc('add_user_points', {
        p_user_id: user.id,
        p_amount: requiredPoints,
        p_type: 'REFUND',
        p_description: '针对性练习失败退费',
        p_related_id: null
      } as any);

      return NextResponse.json({
        error: 'AI分析服务暂时不可用，请稍后重试',
        refunded: true,
        pointsRefunded: requiredPoints
      }, { status: 500 });
    }

} catch (error) {
    console.error('❌ 针对性练习生成失败:', error);

    // 尝试退回积分
    try {
      const supabase = createServerSupabaseClient();
      await supabase.rpc('add_user_points', {
        p_user_id: user.id,
        p_amount: 4,
        p_type: 'REFUND',
        p_description: '针对性练习系统错误退费',
        p_related_id: null
      } as any);
    } catch (refundError) {
      console.error('退回积分失败:', refundError);
    }

    return NextResponse.json({
      error: error instanceof Error ? error.message : '服务器错误'
    }, { status: 500 });
  }
}