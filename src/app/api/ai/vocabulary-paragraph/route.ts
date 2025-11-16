import { NextRequest, NextResponse } from 'next/server'
import { CloudMistService } from '@/lib/cloudmist-api'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// 词汇成篇的专用提示词
const VOCABULARY_PARAGRAPH_PROMPT = `你是一位专业的英语写作教学专家，擅长创作示范段落来展示词汇的实际运用。请根据用户提供的词汇梳理结果，创作一个高质量的示范段落，让词汇在语篇中"连线"，推动被动词汇转化为主动表达。

## 核心任务
1. **提取核心词汇**：从词汇梳理结果中提取所有核心词汇
2. **创作示范段落**：写一个100-150词的高质量英语段落
3. **自然融入词汇**：将词汇自然地融入段落语境中
4. **推动词汇转化**：让被动词汇转化为主动表达

## 写作要求
1. **主题一致性**：段落内容与大单元主题保持一致
2. **词汇覆盖**：尽可能多地使用梳理出的核心词汇
3. **语境自然**：词汇的使用要自然流畅，不生硬
4. **逻辑清晰**：段落要有清晰的逻辑结构
5. **语言地道**：使用地道的英语表达方式

## 段落结构
1. **主题引入**：明确点出段落主题
2. **词汇展示**：通过具体的描述和例证展示词汇用法
3. **语境连接**：通过逻辑连接词将词汇串联成篇
4. **总结提升**：对段落内容进行简要总结

## 输出格式
请按照以下格式输出：

### 📝 【示范段落】

**段落内容：**
[写一个100-150词的高质量英语段落，自然融入核心词汇]

**词汇运用分析：**
**核心词汇使用情况：**
- [词汇1]: 在段落中的具体用法和语境
- [词汇2]: 在段落中的具体用法和语境
- [词汇3]: 在段落中的具体用法和语境
...

**写作技巧点拨：**
- 段落中使用的连接技巧
- 词汇搭配的运用方法
- 语境构建的策略

【质量要求】
- 段落长度：200-300词
- 词汇覆盖率：至少使用梳理结果中60%以上的核心词汇
- 语言难度：适合高中生理解和模仿
- 内容质量：段落要有教育意义和实用价值

请直接生成完整的示范段落和分析结果，确保内容丰富且具有实用性。`

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
        error: '请先完成词汇梳理再生成示范段落'
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

    const requiredPoints = 3
    if ((userPoints as any)?.points < requiredPoints) {
      return NextResponse.json(
        { error: `积分不足，需要${requiredPoints}点，当前${(userPoints as any)?.points}点` },
        { status: 400 }
      );
    }

    // 使用云雾API调用Gemini-2.5-Pro模型
    try {
      console.log('开始调用云雾API进行词汇成篇...')
      console.log('使用模型: gemini-2.5-pro')
      console.log('输入主题:', topic || '未提供')
      console.log('词汇梳理结果长度:', vocabularyOrganiseResult.length)

      const result = await CloudMistService.chatCompletions({
        model: 'gemini-2.5-pro',
        messages: [
          {
            role: 'system',
            content: VOCABULARY_PARAGRAPH_PROMPT
          },
          {
            role: 'user',
            content: `请根据以下词汇梳理结果创作示范段落：\n\n大单元主题：${topic || '未提供'}\n\n词汇梳理结果：\n${vocabularyOrganiseResult}\n\n【重要提醒：请创作一个高质量的示范段落，让词汇在语篇中自然融合，推动被动词汇转化为主动表达！】`
          }
        ],
        max_tokens: 6000, // 设置足够的tokens确保完整输出
        temperature: 0.4, // 适中的创造性
        stream: false
      })

      const paragraphResult = result.choices[0]?.message?.content || '';
      console.log('词汇成篇完成，结果长度:', paragraphResult.length)

      // 检查结果是否完整
      if (paragraphResult.length < 500) {
        console.warn('⚠️ 警告：词汇成篇结果可能被截断，长度过短！')
      }

      // 检查是否包含完整的格式
      const hasCompleteStructure = paragraphResult.includes('### 📝 【示范段落】') &&
                                  paragraphResult.includes('段落内容：') &&
                                  paragraphResult.includes('词汇运用分析：')

      if (!hasCompleteStructure) {
        console.warn('⚠️ 警告：词汇成篇结果格式不完整，缺少必要的分析部分！')
      }

      // 扣除用户点数
      const { error: deductError } = await supabase.rpc('add_user_points', {
        p_user_id: user.id,
        p_amount: -requiredPoints,
        p_type: 'GENERATE',
        p_description: '词汇成篇',
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
        result: paragraphResult,
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
        p_description: '词汇成篇失败退费',
        p_related_id: null
      } as any);

      return NextResponse.json({
        error: 'AI分析服务暂时不可用，请稍后重试',
        refunded: true,
        pointsRefunded: requiredPoints
      }, { status: 500 });
    }

} catch (error) {
    console.error('❌ 词汇成篇失败:', error);

    // 尝试退回积分
    try {
      const supabase = createServerSupabaseClient();
      await supabase.rpc('add_user_points', {
        p_user_id: user.id,
        p_amount: 3,
        p_type: 'REFUND',
        p_description: '词汇成篇系统错误退费',
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