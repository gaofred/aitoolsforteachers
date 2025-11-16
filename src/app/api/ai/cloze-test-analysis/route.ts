import { NextRequest, NextResponse } from 'next/server';
import { SupabasePointsService } from '@/lib/supabase-points-service';

// 智谱清言API配置
const ZHIPU_API_KEY = process.env.ZhipuOfficial;
const ZHIPU_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

// 完形填空解析系统提示词
const SYSTEM_PROMPT = `###Instruction###
你的任务是根据给定的文本进行问题解析。按照Output Format Example部分的内容，输出你的结果【要有依据文本对应的中文翻译】。
注意，不能就题讲题，需要联系上下文，找到可以作为依据的文本的上下文句子(要引用对应的英文句子，并翻译成汉语），不能是本句话直接翻译得出结论。
仿照Output Format Example部分的内容，输出你的结果【要有依据文本对应的中文翻译】,要有"根据"Taking one last look at the ______12______ room"（注意：不能是含有这个选项的句子本身）可知，作者最后吹灭了蜡烛。"这样类似的结构。
##Answers:
41-45 CADBA                        46-50 BCCDA                  51-55 BADDB

###Input###

Sargassum is the smelly seaweed piling up on beaches across the Caribbean. It isn't something most people   41   kindly. But for Omar de Vazquez, a gardener, it was something like a(an)   42   .
Years ago, as part of his gardening business, Omar launched a beach cleanup service to   43   the leafy seaweed. But, as its   44   intensified, he started considering how to turn it into something useful, and in 2018 he   45   a way to use it in building blocks. He started his company----SargaBlock to market the bricks which are being   46   by the United Nations Development Program (UNDP) as a sustainable solution to a current environmental problem.
"When I look at SargaBlock, it's like looking in a   47   ," he says, comparing his company to overcoming his personal   48   , including drug and alcohol addiction. "That was a time when I felt unwanted and   49   , like the sargassum people complained about."
Luckily, Omar grew up in nature and poverty, which   50   his character and turned him into someone who takes action. He wanted to make something good out of something everyone saw as bad. Omar then put his idea into   51   , mixing 40% sargassum with other organic materials, like clay, which he then puts into a block-forming machine. The process was   52   .
The UNDP selected Omar's work for their Accelerator Lab, which   53   and recognizes innovative solutions to environmental challenges globally. The idea is that some of the most timely and creative   54   come from locals suffering from environmental dilemmas   55   .

###Questions###
41. A. look upon        B. bring in        C. give up            D. come across
42. A. game            B. gift            C. race                D. trouble
43. A. access            B. harvest        C. remove            D. process
44. A. heat            B. image            C. presence            D. movement
45. A. worked out        B. called for        C. showed off            D. turned down
46. A. highlighted        B. undervalued    C. overemphasized    D. withdrawn
47. A. window        B. mirror            C. dictionary            D. puzzle
48. A. struggles        B. fears            C. desires            D. opinions
49. A. appreciated        B. infected        C. interrupted            D. rejected
50. A. fitted            B. shaped        C. revealed            D. described
51. A. operation        B. words            C. bills                D. profit
52. A. straightforward    B. transforming    C. natural            D. consuming
53. A. combines        B. provides        C. identifies            D. drafts
54. A. responses        B. reminder        C. appeal                D. issues
55. A. alongside        B. offshore        C. underneath            D. firsthand

###Output Format Example###
【导语】这是一篇记叙文。文章讲述了作者在魁北克入住Ice Hotel时的经历和感受。
【33题详解】
考查动词短语辨析。句意：最后看了一眼这个独特的房间，我吹灭了蜡烛。A. blew up爆炸；B. blew out吹灭；C. blew down被风吹到；D. blew away吹走。根据"Taking one last look at the ______12______ room"可知，作者最后吹灭了蜡烛。故选B。
【34题详解】
考查名词词义辨析。句意：我可以透过头顶上的洞看到星星。A. door门；B. window窗户；C. wall墙；D. hole洞。呼应上文"I watched as snowflakes gently ______2______ through a hole in the ceiling."此处是指作者透过天花板上的洞看星星。故选D。
【35题详解】
考查动词词义辨析。句意：我感到非常温暖，祈祷自己不要在夜里醒来。A. defined下定义；B. predicted预测；C. prayed祈祷；D. controlled控制。结合作者住在魁北克Ice Hotel的事实以及"I was absolutely warm"推知，作者祈祷自己不要半夜醒来，否者有可能因为寒冷而无法再次入睡。故选C。`;

export async function POST(request: NextRequest) {
  try {
    const { text, userId } = await request.json();

    if (!text) {
      return NextResponse.json({ error: '请提供要分析的完形填空内容' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: '用户未登录' }, { status: 401 });
    }

    // 检查积分
    const userPoints = await SupabasePointsService.getUserPoints(userId);

    const requiredPoints = 3;
    if (userPoints < requiredPoints) {
      return NextResponse.json({
        error: `积分不足，需要${requiredPoints}点，当前${userPoints}点`
      }, { status: 400 });
    }

    // 扣除积分
    const deductSuccess = await SupabasePointsService.deductPoints(userId, requiredPoints, '完形填空解析');
    if (!deductSuccess) {
      return NextResponse.json({ error: '积分扣除失败' }, { status: 500 });
    }

    // 调用智谱清言API
    console.log('🎯 开始调用智谱清言API进行完形填空解析');
    console.log('📝 输入文本长度:', text.length);

    const requestBody = {
      model: 'glm-4.6',
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: `###Input###

${text}`
        }
      ],
      temperature: 0.3,
      max_tokens: 8000,
      stream: false
    };

    console.log('📤 发送请求到智谱清言API:', {
      model: requestBody.model,
      max_tokens: requestBody.max_tokens,
      temperature: requestBody.temperature
    });

    const apiResponse = await fetch(ZHIPU_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ZHIPU_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error('❌ 智谱清言API错误:', {
        status: apiResponse.status,
        statusText: apiResponse.statusText,
        errorText: errorText
      });

      // 退回积分
      await SupabasePointsService.addPoints(userId, requiredPoints, 'BONUS', '完形填空解析失败退回');

      return NextResponse.json({
        error: `智谱清言API调用失败: ${apiResponse.statusText}`
      }, { status: 500 });
    }

    const apiData = await apiResponse.json();
    console.log('✅ 智谱清言API响应成功:', {
      choices: apiData.choices?.length || 0,
      usage: apiData.usage
    });

    if (!apiData.choices || apiData.choices.length === 0) {
      console.error('❌ 智谱清言API返回的choices为空');

      // 退回积分
      await SupabasePointsService.addPoints(userId, requiredPoints, 'BONUS', '完形填空解析失败退回');

      return NextResponse.json({
        error: '智谱清言API返回结果为空'
      }, { status: 500 });
    }

    const analysisResult = apiData.choices[0].message.content;
    console.log('🎉 完形填空解析完成，结果长度:', analysisResult.length);

    return NextResponse.json({
      success: true,
      result: analysisResult,
      usage: apiData.usage
    });

  } catch (error) {
    console.error('❌ 完形填空解析失败:', error);

    // 尝试退回积分
    try {
      const { userId } = await request.json();
      if (userId) {
        await SupabasePointsService.addPoints(userId, 3, 'BONUS', '完形填空解析失败退回');
      }
    } catch (refundError) {
      console.error('退回积分失败:', refundError);
    }

    return NextResponse.json({
      error: error instanceof Error ? error.message : '服务器错误'
    }, { status: 500 });
  }
}