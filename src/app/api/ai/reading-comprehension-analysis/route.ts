import { NextRequest, NextResponse } from 'next/server';
import { SupabasePointsService } from '@/lib/supabase-points-service';

// 阿里云通义千问API配置
const QWEN_API_KEY = process.env.AliYun_APIKEY;
const QWEN_API_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';

// 系统提示词
const SYSTEM_PROMPT = `###Instruction###
你的任务是根据给定的文本进行问题解析。根据问题类型，将问题分类为"推理判断"，"细节理解"，"词义猜测"，"主旨大意"或"段落大意"。
然后，按照Output Format Example部分的内容，输出你的结果【要有依据文本对应的中文翻译】

###Output Format Example###
1. 推理判断
推理判断。从第四段"But this new study supports a more recent theory that language ultimately gets more efficient and easier to understand. Still, as the study notes, 'the English language is not baby talk.' One researcher explains: 'Yes, we shift toward simple language, but then we also grab complex language that we need.' New words that address the complexity of modern life may somewhat balance out this shift."（但这项新研究支持了一个较新的理论，即语言最终会变得更高效、更易理解。然而，研究指出，"英语并不是简化版的'幼儿语'。" 一位研究者解释道："我们确实倾向于使用简单的语言，但我们也保留着我们需要的复杂语言。" 为应对现代生活的复杂性而创造的新词，或许在某种程度上平衡了这种趋势。） 可知，英语总体变得越来越有效率和愈来愈简单，并非新词汇变得越来越短，也并没有完全失去复杂性。故选 D。
2. 细节理解
细节理解。根据第三段"Malakai's mom was worried as he was about to perform and said, 'It scares me because, on his first show, somebody heckled him. It was sad to see someone boo a child on stage because it might destroy his confidence completely.'"（马拉凯的妈妈非常担心，因为他即将上台表演。她说："我很害怕，因为在他的第一次演出时，有人对他发出嘘声。看到有人在台上嘲笑一个孩子，这真的让人心碎，因为这可能会彻底摧毁他的自信。"）可知，Malakai 的妈妈在他即将表演时感到担心，因为他之前曾在表演时被嘘，这可能会影响他的自信心。故选 C。
3. 词义猜测
词义猜测。根据后文"the entire crowd was impressed by his amazing voice. As he ended his song, the audience and the judges gave him a big round of applause."（他那惊人的歌声令全场观众印象深刻。当他结束演唱时，观众和评委都给予了他热烈的掌声。）可知，他的表演感动了观众，并赢得了热烈的掌声。因此，"set the stage on fire" 是一个比喻，表示他的表演非常出色，点燃了全场的激情。故选 B。
4. 主旨大意
主旨大意。通过阅读全文可知，文章主要讲述了音乐天才 Malakai Bayoh 在《英国达人秀》上的惊艳表现，展示了他完美的高音演唱。因此，文章的主旨在于强调这位天才的发现和他出色的表演。故选 A。
5. 段落大意
段落大意。根据第二段"Language gradually shifts over time. Much research examines how social and environmental factors influence language change, but very little wrestles with the forces of human cognitive selection that fix certain words into the vocabulary." （"语言随着时间的推移不断演变。许多研究关注社会和环境因素如何影响语言变化，但很少有研究探讨人类认知选择如何使某些词汇固定在语言中。"）可知，本段主要讨论了语言随着时间的推移而逐渐变化，并提到了很少研究人类认知选择对词汇固定的影响。故本段大意为：语言的逐渐变化及认知选择的影响。`;

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

    const requiredPoints = 8;
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

    // 调用阿里云通义千问API
    console.log('🎯 开始调用阿里云通义千问Qwen3-Max进行阅读理解解析');
    console.log('📝 输入文本长度:', text.length);

    const requestBody = {
      model: 'qwen-max',
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

    console.log('📤 发送请求到阿里云通义千问API:', {
      model: requestBody.model,
      max_tokens: requestBody.max_tokens,
      temperature: requestBody.temperature
    });

    const apiResponse = await fetch(QWEN_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${QWEN_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error('❌ 阿里云通义千问API错误:', {
        status: apiResponse.status,
        statusText: apiResponse.statusText,
        errorText: errorText
      });

      // 退回积分
      await SupabasePointsService.addPoints(userId, requiredPoints, 'BONUS', '阅读理解解析失败退回');

      return NextResponse.json({
        error: `阿里云通义千问API调用失败: ${apiResponse.statusText}`
      }, { status: 500 });
    }

    const apiData = await apiResponse.json();
    console.log('✅ 阿里云通义千问API响应成功:', {
      choices: apiData.choices?.length || 0,
      usage: apiData.usage
    });

    if (!apiData.choices || apiData.choices.length === 0) {
      console.error('❌ 阿里云通义千问API返回的choices为空');

      // 退回积分
      await SupabasePointsService.addPoints(userId, requiredPoints, 'BONUS', '阅读理解解析失败退回');

      return NextResponse.json({
        error: '阿里云通义千问API返回结果为空'
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

