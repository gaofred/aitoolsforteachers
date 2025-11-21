import { NextRequest, NextResponse } from 'next/server'
import { CloudMistService } from '@/lib/cloudmist-api'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// 七选五解析的专用提示词
const SEVEN_CHOICE_FIVE_ANALYSIS_PROMPT = `###Instruction###
你的任务是根据给定的文本进行问题解析。然后，按照Output Format Example部分的内容，输出你的结果【要有依据文本对应的中文翻译】

# Output Format Example
本文主要介绍了一位在大学咖啡馆工作的普通员工 Catherine Murphy。尽管工作普通，但她以其勤奋、热情、真诚的微笑和周到的服务，成为了学生们喜爱的"无名英雄"。文章通过描述她的日常工作、敬业精神以及对学生产生的积极影响，展现了平凡岗位上的人性光辉和服务的价值。
【答案与解析】36-40：EDCFG
36. E.解析： 此空位于第一段末尾。上文提到咖啡馆是学生课间休息或提神的好去处（Need a break... or just a quick pick-me-up）。选项E"这家咖啡馆不仅提供饮品，也传递微笑" (Not only does this cafe serve up drinks, it also serves up smiles) 恰当地总结并升华了咖啡馆的功能，不仅提供物质提神（饮品），也提供精神提神（微笑），自然地引出了下文对核心人物 Catherine 微笑服务的介绍。
37. D.解析： 此空位于第二段段中。上文描述 Catherine 在机器间来回穿梭制作饮品 (She goes back and forth between machines to make the drinks)。下文描述她将饮品递给顾客并进行交流 (As the customer grabs the drink from her hand, she smiles and says...)。选项D"完成订单后，她会喊杯子上的名字" (After finishing an order, she calls out the name on the cup) 描述的是制作完成到交付饮品之间的一个合理且常见的动作，符合咖啡馆工作流程，使得动作描述更连贯。
38. C.解析： 此空位于第三段段中。上文提到 Murphy 每天早上 4:45 起床，开车 30 分钟去上班 (Murphy gets up at a quarter to five and drives thirty minutes...)。下文引用 Murphy 的话解释她这么做的原因是因为喜欢为需要咖啡的学生服务 ("I do so because I like to make coffee for the students...")。选项C"有时她会早到，以便更早地为学生服务" (Sometimes she arrives early to serve the students early) 补充说明了她早起上班的具体表现，进一步体现了她的敬业和为学生着想，与上下文描述的早起行为和后面的自述动机紧密相连。
39. F.解析： 此空位于第四段段中。上文介绍一位大四学生 Joanna Wright 每周至少去六天咖啡馆 (...goes to the cafe at least six days a week)。下文引用 Joanna 的话说 Catherine 的微笑让她心情愉悦 ("Catherine always has a huge smile on her face, which always puts me in a cheerful mood," Wright said)。选项F"去咖啡馆让她一天有个好的开始，并为上课做好准备" (Going to the cafe starts her day off good and gets her ready for class) 解释了 Joanna 频繁光顾咖啡馆的原因和这对她的积极意义，即咖啡馆的体验（包括 Catherine 的服务）帮助她开启美好的一天并为学习做准备，自然衔接了下文她对 Catherine 微笑的具体评价。
40. G. 解析： 此空位于最后一段段中。上文引用 Murphy 的话表达她对工作的享受 ("I enjoy working in the cafe," Murphy said)。下文提到她完全打算留下来继续做她喜欢的事情 (She has every intention of staying and continuing doing what she loves)。选项G"她在这里服务了17年，无法想象在别处工作" (She has served here for 17 years and can't imagine working anywhere else) 提供了她享受工作并打算留下来的重要背景信息，即长期的服务经历和对这份工作的深厚感情，这使得她享受工作和打算留下来的说法更加可信和有力。

解析要求：
- 先分析文章主旨和内容概要
- 然后逐一分析每个空格的答案选择
- 每个解析都要说明上下文逻辑关系
- 提供文本依据并包含对应的中文翻译
- 使用【答案与解析】格式输出结果
- 确保解析逻辑清晰，推理过程完整`

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

    // 参数验证
    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: '请提供要分析的七选五题目内容' },
        { status: 400 }
      );
    }

    console.log('Starting seven choice five analysis:', { userId: user.id, textLength: text.length });

    console.log('Starting CloudMist API call for seven choice five analysis...');
    console.log('Using model: gemini-2.5-pro');
    console.log('Input text length:', text.length);

    const result = await CloudMistService.chatCompletions({
      model: 'gemini-2.5-pro',
      messages: [
        {
          role: 'system',
          content: SEVEN_CHOICE_FIVE_ANALYSIS_PROMPT
        },
        {
          role: 'user',
          content: `请分析以下七选五题目：\n\n${text}`
        }
      ],
      max_tokens: 4000,
      temperature: 0.3
    });

    console.log('Seven choice five analysis API call successful');

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
      throw new Error('API返回结果为空');
    }

  } catch (error) {
    console.error('Seven choice five analysis failed:', error);

    // Detailed error logging
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    return NextResponse.json({
      success: false,
      error: `Seven choice five analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: {
        model: 'gemini-2.5-pro',
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}