import { NextRequest, NextResponse } from 'next/server'
import { CloudMistService } from '@/lib/cloudmist-api'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// 语法填空解析的专用提示词
const GAP_FILLING_ANALYSIS_PROMPT = `你是一位专业的英语语法教师，擅长解析语法填空题。请对用户输入的语法填空题的每一道题做详细解析，结果应该包含以下内容：

1. 题目编号和空格位置
2. 正确答案
3. 语法考点分析（具体考查的语法知识点）
4. 解题思路（如何通过上下文和语法规则确定答案）
5. 相关知识点扩展（相关的语法规则、常用搭配等）
6. 易错点提醒（学生容易犯的错误和注意事项）

请按照以下格式输出：

## 第1题
**空格位置：** [原文中的空格位置描述]
**正确答案：** [正确答案]
**语法考点：** [具体的语法知识点]
**解题思路：** [详细的解题分析过程]
**知识点扩展：** [相关的语法知识补充]
**易错点提醒：** [学生容易出错的地方]

## 第2题
...（以此类推，直到所有题目都解析完毕）

【极其重要的输出要求】
- 必须为输入文本中的每一个空格都提供完整的解析，不得遗漏任何题目
- 每题解析都必须包含上述全部6个部分
- 绝对不要在中途停止输出，即使内容较长也要完整生成
- 解析完成后可以输出简单的结束语，但要确保所有题目都已解析完毕
- 如果遇到技术问题，宁可重新开始也要保证输出完整性

解析质量要求：
- 解析要详细、专业、易于理解
- 重点培养学生的语法思维和解题能力
- 语言要适合中国高中生理解
- 每题解析要包含足够的语法知识讲解
- 提供实用的解题技巧和方法`

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

    const { text } = await request.json();

    // 验证输入
    if (!text || !text.trim()) {
      return NextResponse.json({
        error: '请输入要分析的语法填空题内容'
      }, { status: 400 })
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
      console.log('开始调用云雾API进行语法填空解析...')
      console.log('使用模型: gemini-2.5-pro')
      console.log('输入文本长度:', text.length)

      const result = await CloudMistService.chatCompletions({
        model: 'gemini-2.5-pro',
        messages: [
          {
            role: 'system',
            content: GAP_FILLING_ANALYSIS_PROMPT
          },
          {
            role: 'user',
            content: `请分析以下语法填空题：\n\n${text}\n\n【重要提醒：请确保为每一道题目都生成完整的解析，包括所有6个部分，不要在中途停止输出！】`
          }
        ],
        max_tokens: 16000, // 再次增加到16000 tokens，确保绝对够用
        temperature: 0.2, // 进一步降低温度，确保更稳定的输出
        stream: false
      })

      const analysisResult = result.choices[0]?.message?.content || '';
      console.log('语法填空解析完成，结果长度:', analysisResult.length)

      // 检查结果是否完整
      if (analysisResult.length < 500) {
        console.warn('⚠️ 警告：解析结果可能被截断，长度过短！')
      }

      // 检查是否包含完整的题目解析格式
      const hasCompleteAnalysis = analysisResult.includes('## 第') &&
                                  analysisResult.includes('**空格位置：**') &&
                                  analysisResult.includes('**正确答案：**') &&
                                  analysisResult.includes('**语法考点：**') &&
                                  analysisResult.includes('**解题思路：**') &&
                                  analysisResult.includes('**知识点扩展：**') &&
                                  analysisResult.includes('**易错点提醒：**')

      if (!hasCompleteAnalysis) {
        console.warn('⚠️ 警告：解析结果格式不完整，缺少必要的分析部分！')
      }

      // 检查是否在中途停止（比如以不完整的句子结尾）
      const endsAbruptly = analysisResult.endsWith('...') ||
                          analysisResult.match(/[,:;]\s*$/) ||
                          analysisResult.length < 1000

      if (endsAbruptly) {
        console.warn('⚠️ 警告：解析结果看起来被突然截断！')
      }

      // 扣除用户点数
    const { error: deductError } = await supabase.rpc('add_user_points', {
      p_user_id: user.id,
      p_amount: -requiredPoints,
      p_type: 'GENERATE',
      p_description: '语法填空解析',
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
      result: analysisResult,
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
        p_description: '语法填空解析失败退费',
        p_related_id: null
      } as any);

      return NextResponse.json({
        error: 'AI分析服务暂时不可用，请稍后重试',
        refunded: true,
        pointsRefunded: requiredPoints
      }, { status: 500 });
    }

} catch (error) {
    console.error('❌ 语法填空解析失败:', error);

    // 尝试退回积分
    try {
      await supabase.rpc('add_user_points', {
        p_user_id: user.id,
        p_amount: 4,
        p_type: 'REFUND',
        p_description: '语法填空解析系统错误退费',
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