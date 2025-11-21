import { NextRequest, NextResponse } from 'next/server'
import { CloudMistService } from '@/lib/cloudmist-api'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// 语法填空解析的专用提示词
const GAP_FILLING_ANALYSIS_PROMPT = `你是一位专业的高中英语语法教师，专门教授英语语法填空题。请严格按照以下格式对用户输入的语法填空题目进行详细解析。

输出格式要求：
- 使用【】符号标记各个部分，如【解析】、【导语】、【XX题详解】
- 每道题目使用【XX题详解】格式，如【56题详解】
- 不要使用任何Markdown格式化（无#、**、*、\`符号）
- 使用纯文本格式输出

必须包含的解析部分：
1. 【解析】开头，包含【导语】分析文章类型和主题
2. 对每个空格进行【XX题详解】，包括：
   - 考查的具体语法点
   - 句意翻译
   - 详细的语法分析
   - 解题思路和推理过程
   - 正确答案及理由

参考格式示例：
【解析】
【导语】这是一篇说明文。文章介绍了中国的独库公路，包括其地理位置、修建历史、壮丽景色、旅游价值以及经济文化意义。

【56题详解】
考查非谓语动词。句意：独库公路，被视为中国新疆一条非凡的公路，全长561公里，连接北部的独山子和南部的库车。此处"view"与其逻辑主语"Duku Highway"之间是被动关系，即公路被视为，且该部分作定语修饰Duku Highway，相当于非限制性定语从句 "which is viewed..." 的省略。因此，应用过去分词作后置定语。故填viewed。

【57题详解】
考查动词时态和主谓一致。句意：这条公路蜿蜒穿过奇妙的天山山脉，呈现出各种令人惊叹的景色。此处描述的是公路的一个客观事实特征，应用一般现在时。主语"This highway"是第三人称单数，谓语动词需用单三形式。故填winds。

解析要求：
- 准确识别每个空格的语法考点
- 提供详细的句意和语法分析
- 清晰说明选择答案的理由和排除其他选项的原因
- 使用专业但易懂的中文表达
- 确保每道题都有完整的【XX题详解】格式

请严格按照上述格式解析所有题目。`

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();

    // Standard Supabase authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Authentication error:', authError);
      return NextResponse.json(
        { error: 'Unauthorized - Please login first' },
        { status: 401 }
      );
    }

    console.log('User authenticated successfully:', user.id);

    const { text } = await request.json();

    // Parameter validation
    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Please provide gap-filling exercise content to analyze' },
        { status: 400 }
      );
    }

    console.log('Starting gap filling analysis:', { userId: user.id, textLength: text.length });

    console.log('Starting CloudMist API call for gap filling analysis...');
    console.log('Using model: gemini-2.5-pro');
    console.log('Input text length:', text.length);

    const result = await CloudMistService.chatCompletions({
      model: 'gemini-2.5-pro',
      messages: [
        {
          role: 'system',
          content: GAP_FILLING_ANALYSIS_PROMPT
        },
        {
          role: 'user',
          content: `请分析以下语法填空题目：\n\n${text}`
        }
      ],
      max_tokens: 4000,
      temperature: 0.3
    });

    console.log('Gap filling analysis API call successful');

    if (result && result.choices && result.choices[0] && result.choices[0].message) {
      const analysisResult = result.choices[0].message.content;

      console.log('Analysis result length:', analysisResult?.length);

      return NextResponse.json({
        success: true,
        result: analysisResult,
        model: 'gemini-2.5-pro',
        usage: result.usage
      });
    } else {
      throw new Error('API returned empty result');
    }

  } catch (error) {
    console.error('Gap filling analysis failed:', error);

    // Detailed error logging
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    return NextResponse.json({
      success: false,
      error: `Gap filling analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: {
        model: 'gemini-2.5-pro',
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}