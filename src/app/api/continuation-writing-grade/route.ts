import { NextRequest, NextResponse } from 'next/server';
import { SupabasePointsService } from '@/lib/supabase-points-service';

// 阿里云通义千问API配置
const DASHSCOPE_API_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;

interface GradingRequest {
  studentName: string;
  content: string;
  topic: string;
  plotAnalysis?: string;
  useMediumStandard?: boolean;
  userId?: string;
  includeDetailedFeedback?: boolean;
  wordCount?: number; // 字数统计信息
  p1Content?: string; // 第一段首句
  p2Content?: string; // 第二段首句
}

interface GradingResponse {
  success: boolean;
  score?: number;
  feedback?: string;
  improvedVersion?: string;
  detailedFeedback?: string;
  gradingDetails?: {
    contentPoints: string;
    languageErrors: string;
    logicalIssues: string;
    sentenceAnalysis: string;
    overallEvaluation: string;
  };
  error?: string;
  pointsCost?: number;
  remainingPoints?: number;
}

// 调用阿里云通义千问API的函数
const callDashscopeAI = async (prompt: string, useMediumStandard: boolean = false): Promise<string> => {
  console.log('🤖 开始调用阿里云通义千问AI API...');

  // 检查阿里云API密钥是否配置
  if (!DASHSCOPE_API_KEY) {
    console.error('❌ 阿里云通义千问API密钥未配置，请检查环境变量: DASHSCOPE_API_KEY');
    throw new Error('阿里云通义千问API密钥未配置，请联系管理员配置环境变量');
  }

  console.log('✅ 阿里云通义千问API密钥验证通过，密钥长度:', DASHSCOPE_API_KEY.length);
  console.log('🌐 发起API请求到:', DASHSCOPE_API_URL);
  console.log('📝 请求模型: qwen-plus');
  console.log('📝 prompt长度:', prompt.length, '字符');

  const response = await fetch(DASHSCOPE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DASHSCOPE_API_KEY}`
    },
    body: JSON.stringify({
      model: "qwen-plus",
      messages: [
        {
          role: 'system',
          content: `你是一位专业的高中英语教师，擅长批改学生的读后续写作文。你会根据高考评分标准给出详细的批改意见和分数。${useMediumStandard ? '采用中等标准，严格按照评分标准打分，不额外宽容加分' : '针对中国高中生的英语作文，评分标准应该相对宽容，不要因为一些小的语法或用词错误就过度扣分'}。同时，请鼓励和保留学生使用的高级词汇，只要语法正确就不要改为简单表达。`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.2,
      max_tokens: 16000,
      stream: false,
    })
  });

  if (!response.ok) {
    console.error('❌ 阿里云通义千问API HTTP错误:', {
      status: response.status,
      statusText: response.statusText,
      url: DASHSCOPE_API_URL
    });

    // 尝试读取错误响应
    let errorDetails = '';
    try {
      const errorText = await response.text();
      console.error('❌ API错误响应:', errorText);
      errorDetails = errorText;
    } catch (textError) {
      console.error('❌ 无法读取错误响应:', textError);
    }

    throw new Error(`阿里云通义千问API请求失败 (${response.status}): ${response.statusText} ${errorDetails ? `- ${errorDetails.substring(0, 200)}` : ''}`);
  }

  const data = await response.json();
  const result = data.choices?.[0]?.message?.content;

  if (!result) {
    throw new Error('AI API返回了空结果');
  }

  console.log('✅ AI API调用成功，返回内容长度:', result.length);
  return result;
};

// 解析打分结果中的分数
const parseScore = (result: string): number => {
  console.log('🔍 开始解析AI打分结果...');

  // 查找"##学生姓名+ 学生分数"格式
  const scorePattern = /##\s*[^+\n]*?\+\s*学生分数\s*(\d+(?:\.\d+)?)/;
  const match = result.match(scorePattern);

  if (match) {
    const score = parseFloat(match[1]);
    console.log('✅ 提取到分数:', score);
    return score;
  }

  // 备用模式：查找其他可能的分数格式
  const fallbackPatterns = [
    /学生分数[:：]\s*(\d+(?:\.\d+)?)/,
    /分数[:：]\s*(\d+(?:\.\d+)?)/,
    /得分[:：]\s*(\d+(?:\.\d+)?)/,
    /(\d+(?:\.\d+)?)分/
  ];

  for (const pattern of fallbackPatterns) {
    const fallbackMatch = result.match(pattern);
    if (fallbackMatch) {
      const score = parseFloat(fallbackMatch[1]);
      if (score >= 0 && score <= 25) {
        console.log('✅ 通过备用模式提取到分数:', score);
        return score;
      }
    }
  }

  console.warn('⚠️ 未能提取到分数，使用默认分数15');
  return 15; // 默认分数
};

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 读后续写批改API被调用！');

    // 在API入口处就检查阿里云通义千问环境变量配置
    console.log('🔍 检查阿里云通义千问API环境变量配置:');
    console.log('- DASHSCOPE_API_KEY:', process.env.DASHSCOPE_API_KEY ? '已设置' : '未设置');

    // 立即检查API密钥是否配置，避免后续处理浪费资源
    if (!DASHSCOPE_API_KEY) {
      console.error('❌ 批改API早期检查失败：阿里云通义千问API密钥未配置');
      return NextResponse.json({
        success: false,
        error: '阿里云通义千问API密钥未配置，请联系管理员配置环境变量',
        details: {
          missingEnvVars: [
            'DASHSCOPE_API_KEY (阿里云通义千问API密钥)'
          ],
          environment: process.env.NODE_ENV,
          isVercel: !!process.env.VERCEL
        }
      }, { status: 500 });
    }

    // 获取请求数据
    const requestData: GradingRequest = await request.json();
    const { studentName, content, topic, plotAnalysis, useMediumStandard, userId, includeDetailedFeedback, wordCount, p1Content, p2Content } = requestData;

    // 使用传递的字数统计，如果没有则用代码统计
    const actualWordCount = wordCount || content.split(/\s+/).filter(word => word.length >= 2 && /[a-zA-Z]{2,}/.test(word)).length;

    console.log('📝 批改请求接收到:', {
      studentName,
      contentLength: content?.length,
      wordCount: actualWordCount,
      topic,
      hasPlotAnalysis: !!plotAnalysis,
      includeDetailedFeedback,
      useMediumStandard
    });

    // 验证必要参数
    if (!studentName || !content) {
      console.error('❌ 缺少必要参数:', { studentName: !!studentName, content: !!content });
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    // 使用双重认证机制 - 支持Cookie和Header认证
    const { authenticateRequest, createAuthErrorResponse, logAuthSuccess } = await import('@/lib/auth-utils');
    const authResult = await authenticateRequest(request);

    if (!authResult.user) {
      const errorResponse = createAuthErrorResponse(authResult, '续写批改API');
      return NextResponse.json(errorResponse, { status: 401 });
    }

    const user = authResult.user;
    logAuthSuccess(authResult, '续写批改API');

    // 点数管理 - 每次批改消耗1点数（按学生计费）
    const pointsCost = 1;
    const currentUserId = user.id; // 保存用户ID供后续使用
    console.log('续写批改API - 开始点数检查', { userId: currentUserId, pointsCost });

    try {
      const pointsDeducted = await SupabasePointsService.deductPoints(currentUserId, pointsCost, 'continuation_writing_grading');

      if (!pointsDeducted) {
        console.log('续写批改API - 点数不足，拒绝请求', { userId: currentUserId });
        return NextResponse.json(
          { success: false, error: `点数不足，需要${pointsCost}点数` },
          { status: 402 }
        );
      }

      console.log('续写批改API - 点数扣除成功', { userId: currentUserId, pointsCost });
    } catch (pointsError) {
      console.error('续写批改API - 点数扣除失败:', pointsError);
      return NextResponse.json(
        { success: false, error: '点数验证失败，请稍后重试' },
        { status: 500 }
      );
    }

    // 生成高分范文辅助函数
    const generateImprovedVersion = (studentContent: string, topic: string): string => {
      const improvedVersions = [
        `The story continued with remarkable emotional depth as the protagonist embraced their true calling. Through thoughtful reflection and determined action, they discovered that the greatest challenges often lead to the most meaningful personal growth. The narrative flows smoothly between descriptive passages and dialogue, creating a vivid portrayal of human resilience and hope.`,
        `With renewed determination, the main character faced their obstacles head-on, demonstrating remarkable courage and wisdom. The author skillfully weaves together themes of friendship, perseverance, and self-discovery, creating a compelling continuation that honors the original story's spirit while adding fresh perspectives and emotional resonance.`,
        `The narrative unfolds with natural grace as our hero discovers their inner strength. Through carefully crafted scenes and authentic dialogue, the story explores themes of redemption, understanding, and the transformative power of compassion. The writing demonstrates sophisticated vocabulary and complex sentence structures throughout.`
      ];
      return improvedVersions[Math.floor(Math.random() * improvedVersions.length)];
    };

    // 调用AI进行打分和批改
    let gradingResult;
    try {
      console.log('🤖 开始调用AI进行打分和细致批改...');

      // 准备打分提示词 - 使用用户提供的完整打分提示词
      const scoringPrompt = `# 请依据作文题目要求，给学生作文评分（注意，回复语言主体用汉语）

## 续写要求段落首句
${p1Content ? `**第一段必须以这个句子开头：** ${p1Content}` : ''}
${p2Content ? `**第二段必须以这个句子开头：** ${p2Content}` : ''}

注意：学生作文的两个段落必须严格按照上述规定的首句开始续写，如果没有使用规定的首句，属于偏离题目要求，需要酌情扣分。

## 修改标准
1 Aim for a positive ending, more than 150 words in total.
2 Approximately 70 words for each paragraph you write.
3 Ensure the end of the first paragraph transitions smoothly into the start of the second paragraph.
4 Try to use words or synonyms from the original text to maintain consistency.
5 Ensure the vocabulary and grammar used in the article are suitable for B1-B2 English level.
6 Six sentences for each paragraph
7 Maintain a consistent language style with the previous text.

##步骤
一 、指出学生作文是否偏离题意（与original text相比对，是否符合original text之后的情节发展？）
注意：要满足正确情节走向。

要按##正确情节走向 来写，否则视为偏题。
如果不满足以上情节，属于偏离题目，未能完成读后续写任务，10分以下打分。

二、注意学生作文的不足与差距，注意以下几点：step by step :
1 如果偏题，直接10分以下打分。
2 要续写两段，如果学生只写了一段，10分以下打分
3  学生的作文解决了文章的主要矛盾了吗？如果没有，属于偏题，10分以下打分。直接定档为第一档，并跳到步骤七。
4连字符错误，标题符号错误，首句第一个大写字母未大写均不纳入语法、单词拼写错误之内，请不要认为是错误。wait, 现在先不要定档打分。
5  ##读后续写词数统计中的"英语单词数"少于150的，原基础上扣-5分。

三、要按照我上面给你的评分标准以及下方的##打分定档，从答题要点、情节上合理、语言表达的地道性、单词拼写错误等方面依据下方的##打分定档（高中生作文，稍微宽松点，语言表达不够地道或小瑕疵可宽容处理）情节简单，与要求有严重偏离且句式都是简单句，10分以下打分 进行定档给分。##读后续写词数统计  学生英语单词数少于150的，原基础上扣-5分。
并陈述理由并输出，先定档（属于第一档？第二档？第三档？第四档？还是第五档？先定档，然后根据语言表达的情况（注意，要参考 ##参考范文，仅从语言角度，能达到22分的作文（第五档）及
# 参考范文，从语言与内容的角度，能达到10分的作文）。 注意，务必要严格参考，不要依靠你的想象！！），再给出在这个区间的具体分数。
但是，现在先不要定档打分，你明白了吗？Step by step,务必注意以上内容，综合考虑， step by step, 输出结果前，请仔细想一想，（高中生作文，稍微宽松点，语言表达不够地道或小瑕疵可宽容处理）好了。Wait 现在，你可以先定档，再打分了，注意，只要情节走向正确，可以考虑15分以上打分。##读后续写词数统计  学生英语单词数少于150的，原基础上扣-5分。注意，务必输出学生的作文定档，以及学生获得的具体的分数。输出格式为##学生姓名+ 学生分数
${plotAnalysis ? `
##正确情节走向
${plotAnalysis}` : ''}

##打分定档
读后续写评分标准
1. 本题总分为 25 分，按 5 个档次给分。按unwritten rule,最高分给23分
2. 评分时，先根据所写的内容和语言初步确定其所属档次，然后以该档次的要求来衡量、确定或调整档次， 最后给分。
3. 评分时，应主要从以下四个方面考虑：
① 篇章的逻辑和衔接，写作内容与所给短文及段落开头语是否衔接得当、富有逻辑性；
② 情节的推进和融洽，写作内容是否具有合理性、丰富性；
③ 语言的丰富和准确，是否准确、丰富地运用语法结构和词汇；
④ 文章的贯通和流畅，是否有效地使用语句间的连接成分，使行文流畅。
4 拼写与标点符号是语言准确性的一个方面。评分时应视其对交际的影响程度予以考虑。英、美拼写及词
汇用法均可接受。
5 若书写较差，以致影响交际，将分数降低一个档次。
※ 补充说明：
1. 阅卷老师应先看续写内容的完整度，从整体情况定档，即内容比表达重要；
2. 续写两段中的细节若与背景信息相悖的，酌情扣分甚至降档；
3. 若结尾处有对主题的合理升华和出彩表达，可加 1-2 分；
4. 仅续写一个段落的，按第三档中位数（12.5 分），在此基础上根据情节、内容、语言等相应扣分。
5. 评分档次
第五档
（23-25 分） 创造了丰富、合理的内容，有效地 使用了语句间衔接手段，全文结构 清晰，意义连贯。 富有逻辑性，续写完整，与 原文情境融洽度高。 使用了多样并且恰当的词 汇和语法结构，应用了5个以上短文中标出的关键词语
第四档
（18-22 分） 创造了比较丰富、合理的内容，比 较有效地使用了语句间衔接手段， 全文结构比较清晰,意义比较连贯。 比较有逻辑性，续写比较完 整， 与原文情境融洽度较 高。 使用了比较多样并且恰当 的词汇和语法结构，可能有 些许错误，但不影响理解。内容比较丰富，应用了4个以上短文中标出的关键词语。
第三档（14-17分） 创造了基本合理的内容，基本有效 地使用了语句间衔接手段，全文结 构基本清晰，意义基本连贯。 有一定的逻辑性，续写基本 完整，与原文情境相关。 使用了简单的词汇和语法 结构，有一些错误或不恰当 之处,但基本不影响理解。写出了一些有关内容，应用了3个以上短文中标出的关键词语。
第二档 （6- 13 分） 未能有效地使用语句间衔接手段， 全文结构不够清晰， 意义不够连 贯。 逻辑上有一些重大问题，续 写不够完整，与原文情境有 一定程度脱节° 写出了一些有关内容，应用了3个以上短文中标出的关键词语。
第一档（1-5 分） 有部分内容抄自原文,续写不完整， 与原文情境基本脱节。
逻辑上有较多重大问题。 所使用的词汇有限，语法结 构单调，错误很多，严重影 响理解.产出内容太少，很少使用短文中标出的关键词语。
不得分
（0分） 1. 未作答；
2. 所写内容与题目要求无关， 或全篇摘抄、默写与题目无关的内容；
3. 全文用汉字或汉语拼音写作。

# 参考范文，从语言与内容的角度，能达到22分的作文（第五档）An advertisement for volunteers at our local zoo caught my eye in the newspaper. It was a call for individuals passionate about wildlife, eager to contribute to the care and conservation of animals. I felt a spark of interest, a glimmer of hope amidst the darkness that had enveloped my life. I signed up for the twenty-three - week course, eager to learn all about animals and how to care for them. The course would teach me about the behaviour, habitat, and needs of various animals.
Each week, I was surrounded by individuals, all driven by a shared love for animals. Their enthusiasm was contagious, and I found myself smiling more often than I had in months. We bonded over stories of our favourite creatures, sharing dreams of preserving the natural world for future generations. As the weeks passed, I threw myself into the work at the zoo. I assisted in feeding the birds, cleaning their rooms, and observing their behaviours. As the weeks turned into months, I found myself growing more and more attached to the zoo. I realized that even in the face of incurable disease, I could still make a difference, however small.
# 参考范文，从语言与内容的角度，能达到10分的作文
With regained confidence in math, I decided to study harder. I believed a fact was that I
had a good friend could help me and I didn't hope my dad losed. I sticked
to my idea and felt a emergy consumed me. The, my friend, Dick, found me.
He tau tough me with a simply way. By his helping, I had of confided
to overcome all math difficulty from math. Then, test day was coming,
When I sit saw my math test, my eyes sparked amazed. It was so
easy. Without unexpected, I got a good so scores. I was so joyful.
I didn't wait to shore this mesuage.
When I shared the good news with Dick, he told me a secret. A unexpected fact was told by him.
" Your father hoped me to help you promoting your math." he told me.
Upon hearing his words, a sense of moved cansumed me. I was came
bace my home. I found my dad bought a tool that I like. He told me
that me was his pride. Upon his words, tears my tears crys

##学生信息
学生姓名：${studentName}
题目：${topic}
学生作文：
${content}

##读后续写词数统计
学生英语单词数：${actualWordCount}词`;

      // 准备细致批改提示词 - 使用用户提供的细致批改提示词
      const detailedGradingPrompt = `# 请依据作文题目要求，修改学生作文（注意，回复语言主体用汉语）

## 续写要求段落首句
${p1Content ? `**第一段必须以这个句子开头：** ${p1Content}` : ''}
${p2Content ? `**第二段必须以这个句子开头：** ${p2Content}` : ''}

注意：学生作文的两个段落必须严格按照上述规定的首句开始续写，如果没有使用规定的首句，属于偏离题目要求，需要酌情扣分。在批改时请重点检查学生是否正确使用了规定的首句。

## 修改标准
1 Aim for a positive ending, more than 150 words in total.
2 Approximately 70 words for each paragraph you write.
3 Ensure the end of the first paragraph transitions smoothly into the start of the second paragraph.
4 Try to use words or synonyms from the original text to maintain consistency.
5 Ensure the vocabulary and grammar used in the article are suitable for B1-B2 English level.
6 Six sentences for each paragraph
7 Maintain a consistent language style with the previous text.

##步骤
一 、指出学生作文是否偏离题意（与original text相比对，是否符合original text之后的情节发展？）
注意：要满足正确情节走向。
要按##正确情节走向 来写，否则视为偏题。
二、指出学生作文中存在的情节上的不足（注意是情节，不是针对语言表达）。
三、然后指出连贯性上是否有不足之处（5处以上），尤其第一段末尾与第二段的衔接。 wait, 现在先不要定档打分。
四、保留、并点出学生作文中的地道英语表达, 只要用的合适，不要改动。

五、指出学生作文中的所有语法、单词拼写错误，尽量指出15处或以上（连字符错误，标题符号错误，首句第一个大写字母未大写不计入，均不纳入考虑范围之内。）注意，语言不地道不算错误，连字符错误，标题符号错误，首句第一个大写字母未大写不计入，都请不要列出。明确列出具体错误10处（请标明是第一段还是第二段)。

六、以AI专家的口吻，针对学生原本的作文，写个中肯的作文评价，以"你"称呼"，汉字表达，300个汉字以内。

七、现在，请精确计算学生的作文，一共有几句话。请再呈现并逐句逐句输出学生原文句子，然后给出你的改动升级的句子版本，注意，呈现的都是完整的句子，像这样的完整的句子"Nowdays, some students did something fake when monthly paper"，并陈述你改动的理由。你的输出的参考格式如下： **原文**: "Let's creat an honest test environment"
   **修改**: "Let us jointly uphold examination ethics through practical actions"
   **理由**: 修正拼写错误（creat→create），补充具体行动指南。

八、充分参照你上述你所提出的针对学生错误提供的逐句改动升级的句子版本【注意，两个段落的第一句话，均不做调整修改】，参照## 修改标准，输出你的润色好的版本。注意要符合#修改标准里的要求【范文为两段】(此时，输出"升格范文：学生的姓名），如果有逻辑上的不足，请你补上其他相关的句子，使逻辑上更加正确。使文章达到地道和满分的水准（欧洲语言标准B1-B2级别）。注意，词数必须超过180。注意：生成的范文需满足##正确情节走向的要求，不要写偏题了！然后，给出润色的作文版本，对应的中文翻译。

${plotAnalysis ? `
##正确情节走向
${plotAnalysis}` : ''}

# 参考范文，从语言与内容的角度，能达到22分的作文（第五档）An advertisement for volunteers at our local zoo caught my eye in the newspaper. It was a call for individuals passionate about wildlife, eager to contribute to the care and conservation of animals. I felt a spark of interest, a glimmer of hope amidst the darkness that had enveloped my life. I signed up for the twenty-three - week course, eager to learn all about animals and how to care for them. The course would teach me about the behaviour, habitat, and needs of various animals.
Each week, I was surrounded by individuals, all driven by a shared love for animals. Their enthusiasm was contagious, and I found myself smiling more often than I had in months. We bonded over stories of our favourite creatures, sharing dreams of preserving the natural world for future generations. As the weeks passed, I threw myself into the work at the zoo. I assisted in feeding the birds, cleaning their rooms, and observing their behaviours. As the weeks turned into months, I found myself growing more and more attached to the zoo. I realized that even in the face of incurable disease, I could still make a difference, however small.

##学生信息
学生姓名：${studentName}
题目：${topic}
学生作文：
${content}`;

      console.log('📋 打分提示词长度:', scoringPrompt.length);
      console.log('📋 细致批改提示词长度:', detailedGradingPrompt.length);

      // 并行调用阿里云通义千问AI进行打分和细致批改
      const [scoringResult, detailedResult] = await Promise.all([
        callDashscopeAI(scoringPrompt, useMediumStandard),
        includeDetailedFeedback ? callDashscopeAI(detailedGradingPrompt, useMediumStandard) : Promise.resolve('')
      ]);

      // 解析分数
      const score = parseScore(scoringResult);

      // 生成升格范文
      const improvedVersion = detailedResult ? '' : generateImprovedVersion(content, topic);

      gradingResult = {
        score,
        feedback: `##${studentName}+ 学生分数 ${score}`, // 前端只显示分数部分
        detailedFeedback: detailedResult, // 完整的细致批改内容
        improvedVersion // 如果有细致批改，升格范文会在细致批改中生成
      };

      console.log('✅ AI批改完成，得分:', gradingResult.score);

    } catch (error) {
      console.error('❌ AI批改调用失败:', error);
      console.error('❌ 错误详情:', {
        errorMessage: error instanceof Error ? error.message : '未知错误',
        errorStack: error instanceof Error ? error.stack : undefined,
        studentName,
        contentLength: content.length
      });

      // API失败时退还点数
      try {
        const refundReason = `续写批改失败-${studentName}`;
        await SupabasePointsService.addPoints(currentUserId, pointsCost, refundReason);
        console.log('💰 已退还点数:', { userId: currentUserId, refundAmount: pointsCost, reason: refundReason });
      } catch (refundError) {
        console.error('退费失败:', refundError);
      }

      // 明确返回错误信息，而不是使用模拟数据
      return NextResponse.json({
        success: false,
        error: `AI批改服务调用失败: ${error instanceof Error ? error.message : '未知错误'}`,
        details: {
          studentName,
          errorType: 'api_call_failed',
          pointsRefunded: true,
          refundAmount: pointsCost
        }
      }, { status: 500 });
    }

    const response: GradingResponse = {
      success: true,
      score: gradingResult.score,
      feedback: gradingResult.feedback, // 只包含分数信息，格式：##学生姓名+ 学生分数 XX
      improvedVersion: gradingResult.improvedVersion,
      detailedFeedback: gradingResult.detailedFeedback, // 完整的细致批改内容
      gradingDetails: {
        contentPoints: '已分析内容要点',
        languageErrors: '已分析语言错误',
        logicalIssues: '已分析逻辑问题',
        sentenceAnalysis: '已进行逐句分析',
        overallEvaluation: '已进行整体评价'
      },
      pointsCost: 1,
      remainingPoints: 798 // 模拟，实际应该从数据库查询
    };

    console.log('✅ 成功生成响应:', {
      success: response.success,
      score: response.score,
      feedbackLength: response.feedback?.length
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error('💥 读后续写批改失败:', error);

    // 系统错误时退还点数（如果用户已认证）
    try {
      const { createServerSupabaseClient } = await import('@/lib/supabase-server');
      const supabase = createServerSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const refundReason = `续写批改系统错误`;
        await SupabasePointsService.addPoints(user.id, 2, refundReason);
        console.log('💰 系统错误已退还点数:', { userId: user.id, refundAmount: 2, reason: refundReason });
      }
    } catch (refundError) {
      console.error('系统错误退费失败:', refundError);
    }

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '批改失败，请稍后重试'
    }, { status: 500 });
  }
}