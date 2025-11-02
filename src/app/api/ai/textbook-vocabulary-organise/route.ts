import { NextRequest, NextResponse } from 'next/server'
import { CloudMistService } from '@/lib/cloudmist-api'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// 单元词汇梳理的专用提示词
const TEXTBOOK_VOCABULARY_ORGANISE_PROMPT = `你是一位专业的英语词汇教学专家，擅长单元词汇的梳理和配套练习设计。请根据用户输入的单元大主题和词汇列表，按照以下要求进行词汇梳理和练习生成：

## 核心任务
1. **子主题拆分**：根据大主题（如"校园生活"）拆分出3-5个相关子主题
2. **词汇分类**：将原乱序词汇按"子主题+功能"重新分类建立关联
3. **例句生成**：为每个分类词汇创建功能例句和配套译文
4. **美观排版**：采用清晰易读、层次分明的文本展示方式

## 输出格式规范（严格遵循）

### 📘 【子主题一：子主题名称】

**📝 核心词汇：**
• 词汇1 • 词汇2 • 词汇3 • 词汇4
• 词汇5 • 词汇6 • 词汇7 • 词汇8

**💡 功能例句：**

1. [英文例句，15-25词，突出核心词汇的运用]
   📌 中文翻译：[准确流畅的中文译文]

2. [英文例句，15-25词，展示不同语境的词汇用法]
   📌 中文翻译：[准确流畅的中文译文]

3. [英文例句，15-25词，体现词汇的实际功能]
   📌 中文翻译：[准确流畅的中文译文]

---

### 📘 【子主题二：子主题名称】

**📝 核心词汇：**
• 词汇1 • 词汇2 • 词汇3 • 词汇4
• 词汇5 • 词汇6 • 词汇7 • 词汇8

**💡 功能例句：**

1. [英文例句，15-25词，突出核心词汇的运用]
   📌 中文翻译：[准确流畅的中文译文]

2. [英文例句，15-25词，展示不同语境的词汇用法]
   📌 中文翻译：[准确流畅的中文译文]

3. [英文例句，15-25词，体现词汇的实际功能]
   📌 中文翻译：[准确流畅的中文译文]

---

## 排版设计原则
- **视觉层次**：使用表情符号和空行创建清晰的视觉层次
- **词汇展示**：使用圆点符号分隔词汇，每行4-6个词汇
- **例句编号**：使用数字编号，便于引用和讲解
- **中英文对照**：英文例句和中文翻译明确区分
- **段落分隔**：子主题之间使用分隔线区分

## 内容质量要求
- 每个子主题包含6-8个相关词汇
- 每个子主题提供3个功能例句
- 例句长度控制在15-25词之间
- 译文准确流畅，符合中文表达习惯
- 突出词汇在实际语境中的运用
- 适合高中生理解和学习使用

【极其重要的输出要求】
- 必须严格按照上述格式输出，不得遗漏任何格式元素
- 每个子主题都要包含完整的"核心词汇"和"功能例句"两部分
- 例句数量必须达到每个子主题3个的要求
- 不要使用Markdown表格格式，使用规定的文本展示方式
- 确保输出完整，不要在中途停止
- 表情符号和格式标记必须正确使用

请直接生成完整的词汇梳理结果，严格遵循上述格式规范。`

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

    const { topic, vocabularyList } = await request.json();

    // 验证输入
    if (!topic || !topic.trim()) {
      return NextResponse.json({
        error: '请输入单元大主题'
      }, { status: 400 });
    }

    if (!vocabularyList || !vocabularyList.trim()) {
      return NextResponse.json({
        error: '请输入词汇列表'
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
      console.log('开始调用云雾API进行单元词汇梳理...')
      console.log('使用模型: gemini-2.5-pro')
      console.log('输入主题:', topic)
      console.log('词汇数量:', vocabularyList.split(/[\s,]+/).filter(word => word.length > 0).length)

      const result = await CloudMistService.chatCompletions({
        model: 'gemini-2.5-pro',
        messages: [
          {
            role: 'system',
            content: TEXTBOOK_VOCABULARY_ORGANISE_PROMPT
          },
          {
            role: 'user',
            content: `请对以下单元主题和词汇列表进行梳理：\n\n单元大主题：${topic}\n\n词汇列表：\n${vocabularyList}\n\n【重要提醒：请确保为每个子主题都生成完整的梳理内容，包括核心词汇和功能例句两部分，不要在中途停止输出！】`
          }
        ],
        max_tokens: 8000, // 设置足够的tokens确保完整输出
        temperature: 0.3, // 降低温度，确保更稳定的输出
        stream: false
      })

      const organiseResult = result.choices[0]?.message?.content || '';
      console.log('单元词汇梳理完成，结果长度:', organiseResult.length)

      // 检查结果是否完整
      if (organiseResult.length < 500) {
        console.warn('⚠️ 警告：词汇梳理结果可能被截断，长度过短！')
      }

      // 检查是否包含完整的格式
      const hasCompleteStructure = organiseResult.includes('【子主题一：') &&
                                  organiseResult.includes('核心词汇：') &&
                                  organiseResult.includes('功能例句：')

      if (!hasCompleteStructure) {
        console.warn('⚠️ 警告：词汇梳理结果格式不完整，缺少必要的结构部分！')
      }

      // 检查是否在中途停止
      const endsAbruptly = organiseResult.endsWith('...') ||
                          organiseResult.match(/[,:;]\s*$/) ||
                          organiseResult.length < 1000

      if (endsAbruptly) {
        console.warn('⚠️ 警告：词汇梳理结果看起来被突然截断！')
      }

      // 扣除用户点数
      const { error: deductError } = await supabase.rpc('add_user_points', {
        p_user_id: user.id,
        p_amount: -requiredPoints,
        p_type: 'GENERATE',
        p_description: '单元词汇梳理',
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
        result: organiseResult,
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
        p_description: '单元词汇梳理失败退费',
        p_related_id: null
      } as any);

      return NextResponse.json({
        error: 'AI梳理服务暂时不可用，请稍后重试',
        refunded: true,
        pointsRefunded: requiredPoints
      }, { status: 500 });
    }

} catch (error) {
    console.error('❌ 单元词汇梳理失败:', error);

    // 尝试退回积分
    try {
      await supabase.rpc('add_user_points', {
        p_user_id: user.id,
        p_amount: 4,
        p_type: 'REFUND',
        p_description: '单元词汇梳理系统错误退费',
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