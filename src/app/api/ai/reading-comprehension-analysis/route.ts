import { NextRequest, NextResponse } from 'next/server';
import { SupabasePointsService } from '@/lib/supabase-points-service';

// 智谱清言API配置
const ZHIPU_API_KEY = process.env.ZhipuOfficial;
const ZHIPU_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

// 系统提示词
const SYSTEM_PROMPT = `###Instruction###
你的任务是根据给定的文本进行问题解析。根据问题类型，将问题分类为：理解具体信息,判断观点态度.推理判断，判断指代关系，词义推断，理解文章主旨要义。

注意，词义猜测题要根据上下文中的其他句子来推测，而不是仅仅依赖于含有该词的句子本身。确保我们通过整体语境来推测词义，而不只是看含有该词的那一句话。必须完全依据上下文进行全面分析。
然后，按照Output Format Example部分的内容，输出你的结果【要有依据文本对应的中文翻译】

###Output Format Example###
A
语篇类型：说明文 主题语境： 人与社会---社会文化---儿童杂志介绍与订阅。
【文章大意】本文是一篇应用文，主要介绍了一本面向8-14岁儿童的获奖时事杂志The Week Junior，包括其内容特色、儿童喜欢的原因、订阅类型及优惠等。
【答案与解析】21-23 CDB
21.C【命题意图】考查细节理解题。根据第一段第一句"The Week Junior is a multi-award-winning current affairs magazine for children aged 8-14…"可知，The Week Junior是一本多次获奖的儿童时事杂志，故选C。
22.D【命题意图】考查细节理解题。根据"Children love the magazine because"部分中的"It sparks(触发)their thinking: We explain world events clearly and carefully and help children to think critically and develop their own point of view."以及"It gets them reading for pleasure…"可知，这本杂志能激发孩子们的思考，让他们享受阅读的乐趣，即其内容能激励孩子们，故选D。
23.B【命题意图】考查细节理解题。根据"Subscription Types"部分中"Print & Digital"和"Print"下的"*Free Big Book of Knowledge"可知，订阅印刷版或印刷版与电子版结合的读者可以获得一本免费的书，故选B。
【重点词汇】
multi-award-winning adj. 多次获奖的
例句：The Week Junior is a multi-award-winning current affairs magazine.
    《The Week Junior》是一本多次获奖的时事杂志。
engage v. 吸引；使参与
例句：It engages and excites curious young minds.
    它吸引并激发了好奇的年轻心灵。
critical adj. 批判性的；关键的
    例句：We help children to think critically and develop their own point of view.
          .我们帮助孩子们批判性地思考并发展自己的观点。
subscription n. 订阅；订阅费
    例句：Our early bird Christmas sale includes an amazing FREE book with each subscription.
          我们的早鸟圣诞促销包括每份订阅都赠送一本精彩的免费书籍。
【难句翻译】
    It gets them reading for pleasure: Each page is created to catch and hold their attention, encouraging a reading habit and a love of learning that will stay with them for life.
    这句话让他们为了乐趣而阅读：每一页都是为了吸引并抓住他们的注意力而设计的，鼓励他们养成阅读习惯和对学习的热爱，这将伴随他们一生。

注意，词义猜测题要根据上下文中的其他句子来推测，而不是仅仅依赖于含有该词的句子本身。确保我们通过整体语境来推测词义，而不只是看含有该词的那一句话。必须完全依据上下文进行全面分析。`;

export async function POST(request: NextRequest) {
  try {
    const { text, userId } = await request.json();

    if (!text) {
      return NextResponse.json({ error: '请提供要分析的文本内容' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: '用户未登录' }, { status: 401 });
    }

    // 检查积分
    const userPoints = await SupabasePointsService.getUserPoints(userId);

    const requiredPoints = 2;
    if (userPoints < requiredPoints) {
      return NextResponse.json({
        error: `积分不足，需要${requiredPoints}点，当前${userPoints}点`
      }, { status: 400 });
    }

    // 扣除积分
    const deductSuccess = await SupabasePointsService.deductPoints(userId, requiredPoints, '阅读理解解析');
    if (!deductSuccess) {
      return NextResponse.json({ error: '积分扣除失败' }, { status: 500 });
    }

    // 调用智谱清言API
    console.log('🎯 开始调用智谱清言API进行阅读理解解析');
    console.log('📝 输入文本长度:', text.length);

    const requestBody = {
      model: 'glm-4.5-x',
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: text
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
      await SupabasePointsService.addPoints(userId, requiredPoints, 'BONUS', '阅读理解解析失败退回');

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
      await SupabasePointsService.addPoints(userId, requiredPoints, 'BONUS', '阅读理解解析失败退回');

      return NextResponse.json({
        error: '智谱清言API返回结果为空'
      }, { status: 500 });
    }

    const analysisResult = apiData.choices[0].message.content;
    console.log('🎉 阅读理解解析完成，结果长度:', analysisResult.length);

    return NextResponse.json({
      success: true,
      result: analysisResult,
      usage: apiData.usage
    });

  } catch (error) {
    console.error('❌ 阅读理解解析失败:', error);

    // 尝试退回积分
    try {
      const { userId } = await request.json();
      if (userId) {
        await SupabasePointsService.addPoints(userId, 2, 'BONUS', '阅读理解解析失败退回');
      }
    } catch (refundError) {
      console.error('退回积分失败:', refundError);
    }

    return NextResponse.json({
      error: error instanceof Error ? error.message : '服务器错误'
    }, { status: 500 });
  }
}

