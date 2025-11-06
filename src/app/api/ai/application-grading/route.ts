import { NextRequest, NextResponse } from 'next/server';
import { SupabasePointsService } from '@/lib/supabase-points-service';

// 极客智坊API配置
const GEEKAI_API_URL = 'https://geekai.co/api/v1/chat/completions';
const GEEKAI_API_KEY = process.env.GEEKAI_API_KEY;

export async function POST(request: NextRequest) {
  console.log('应用文批改API - 开始处理请求');

  try {
    // 尝试解析请求体
    let body;
    try {
      body = await request.json();
      console.log('应用文批改API - 请求体解析成功:', {
        studentName: body.studentName,
        hasStudentName: !!body.studentName,
        hasTopic: !!body.topic,
        hasContent: !!body.content,
        gradingType: body.gradingType,
        userId: body.userId
      });
    } catch (parseError) {
      console.error('应用文批改API - 请求体解析失败:', parseError);
      return NextResponse.json(
        { success: false, error: '请求格式错误' },
        { status: 400 }
      );
    }

    const { studentName, topic, content, gradingType = 'both', userId } = body;

    if (!studentName || !topic || !content) {
      console.log('应用文批改API - 参数验证失败', {
        hasStudentName: !!studentName,
        hasTopic: !!topic,
        hasContent: !!content
      });
      return NextResponse.json(
        { success: false, error: '缺少必要参数：学生姓名、题目或作文内容' },
        { status: 400 }
      );
    }

    console.log('应用文批改API - 参数验证通过');

    // 使用Supabase自动处理token（与/api/auth/user相同的方式）
    const { createServerSupabaseClient } = await import('@/lib/supabase-server');
    const supabase = createServerSupabaseClient();

    const { data: { user }, error } = await supabase.auth.getUser();

    if (!user || error) {
      console.log('应用文批改API - 用户认证失败', { error: error?.message });
      return NextResponse.json(
        { success: false, error: '用户认证失败' },
        { status: 401 }
      );
    }

    console.log('应用文批改API - 用户验证成功', { userId: user.id, email: user.email });

    // 恢复点数检查功能
    const pointsCost = 1; // 每个学生1点数（批量批改优惠）
    console.log('应用文批改API - 开始点数检查', { userId: user.id, pointsCost });

    try {
      const pointsDeducted = await SupabasePointsService.deductPoints(user.id, pointsCost, 'application_grading');

      if (!pointsDeducted) {
        console.log('应用文批改API - 点数不足，拒绝请求', { userId: user.id });
        return NextResponse.json(
          { success: false, error: `点数不足，需要${pointsCost}点数` },
          { status: 402 }
        );
      }

      console.log('应用文批改API - 点数扣除成功', { userId: user.id, pointsCost });
    } catch (pointsError) {
      console.error('应用文批改API - 点数扣除失败:', pointsError);
      return NextResponse.json(
        { success: false, error: '点数验证失败，请稍后重试' },
        { status: 500 }
      );
    }

    console.log('应用文批改API - 认证通过，开始批改:', {
      studentName,
      topicLength: topic.length,
      contentLength: content.length,
      gradingType
    });

    // 构建批改提示词
    const buildGradingPrompt = (studentName: string, topic: string, content: string, type: 'scoring' | 'revision' | 'both') => {
      const basePrompt = `# 请依据##题目要求，修改上述学生作文（注意，回复语言主体用汉语）

## 题目要求
${topic}

## 学生姓名
${studentName}

## 学生作文
${content}

## 评分标准| 你的提供范文的标准
Content: Must cover all main points and may include minor points.
Language Use: Should use a variety of grammatical structures and vocabulary. Errors are acceptable if they result from attempting more complex structures.
Coherence: Should use linking words to ensure the text is coherent and well-structured.
Spelling and Punctuation: Errors will be considered based on their impact on communication.
Paragraphs:3 paragraphs in total,
The second paragraph should serve as the core of the essay, elaborating with examples, evidence, or logical reasoning.
Word count : 80 - 130 words`;

      if (type === 'scoring') {
        return basePrompt + `

##给你的要求
1  指出学生作文中的所有语法、单词拼写错误，尽量指出10处或以上（（连字符错误，标题符号错误，首句第一个大写字母未大写不计入，语言表达不够地道，以上均不纳入考虑范围之内。）。注意，先不要打分，wait, step by step.
2  指出学生作文里面存在的所有的逻辑上的不足（如连贯性等），尽量指出5处或以上逻辑不足.注意是高中生作文，所以要考虑高中生的认知水平和知识水平,你的评价不能过于严苛。注意，先不要打分，wait, step by step.
3 现在，请精确计算学生的作文，一共有几句话。请再呈现并逐句逐句输出学生原文句子，然后给出你的改动升级的句子版本，注意，呈现的都是完整的句子。你的输出格式必须严格按照以下模板，逐句分析：

**原文**: "Having learned that you have a deep insight into poem, I am writing to ask for your help."
**修改**: "Knowing your deep understanding of American poetry, I'm reaching out to seek your guidance."
**理由**: "Having learned"结构生硬；"deep insight into poem"语法错误；改写后更自然流畅，语义准确。

---

**原文**: "The activity will began next week, including three parts which are sharing our favorites, giving a speech and conducting discussion."
**修改**: "The event will take place next week and consist of three parts: sharing favorite poems, delivering short speeches, and engaging in group discussions."
**理由**: 修正"began"错误；"including... which are"结构混乱；使用冒号列举更清晰；动名词结构统一，表达更地道。

每个句子分析都必须包含：原文、修改版本、详细理由。理由要具体指出语法错误、词汇选择、结构优化等问题。
4 附上学生的##学生姓名， 按## 题目要求 和## 评分标准| 你的提供范文的标准，生成高分范文，要充分参考及使用你上面所给的升级的句子版本。注意，升级版的作文，词数至少130个英语单词。
9 以AI专家的口吻，写个作文评价，明确的指出学生的优缺点，分点陈述。以"你"称呼"，汉字表达，200个汉字以内。`;
      } else if (type === 'revision') {
        return basePrompt + `

##给你的要求
1     依据打分标准：给学生打分。
注意，非常重要！！：必须要同时满足对应档的全部要求，才能在这个档打分。比如覆盖所有内容要点，单词错误太多，就不能打第五档。虽漏掉 1、2个次重点，但覆盖所有主要内容。，单词及语法错误过多，就不能打第四档，要降档处理。
第五档(13-15分
1.完全完成了试题规定的任务。
2.覆盖所有内容要点。
3.应用了较多的语法结构和词汇。
4.语法结构或词汇方面有些许错误，但为尽力使用较复杂结构或较高级词汇所致，具备较强的语言运用能力。
5.有效地使用了语句间的连接成分，使全文结构紧凑。
6.完全达到了预期的写作目的。
第四档(10-12分)
1.完全完成了试题规定的任务。
2.虽漏掉 1、2个次重点，但覆盖所有主要内容。
3.应用的语法结构和词汇能满足任务的要求。
4.语法结构或词汇方面应用基本准确，些许错误主要是因尝试较复杂语法结构或词汇所致。
5.应用简单的语句间的连接成分，使全文结构紧凑。
6.达到了预期的写作目的。
第三档(7-9分)
1.基本完成了试题规定的任务。
2.虽漏掉一些内容，但覆盖所有主要内容。
3.应用的语法结构和词汇能满足任务的要求。
4.有一些语法结构或词汇方面的错误，但不影响理解，
5.应用简单的语句间连接成分，使全文内容连贯。
6.整体而言，基本达到了预期的写作目的。
第二档(4-6分)
1.未恰当完成试题规定的任务。
2.漏掉或未描述清楚一些主要内容，写了一些无关内容。
3.语法结构单调、词汇项目有限。
4.有一些语法结构或词汇方面的错误，影响了对写作内容的理解。
5.较少使用语句间的连接成分，内容缺少连贯性。
6.信息未能清楚地传达给读者。
第一档(1-3分)
1.未完成试题规定的任务。
2.明显遗漏主要内容，写了一些无关内容，原因可能是未理解试题要求。
3.语法结构单调、词汇项目有限。
4.较多语法结构或词汇方面的错误，影响对写作内容的理解。
5.缺乏语句间的连接成分，内容不连贯。
6.信息未能传达给读者。

#步骤
1 换行，指出学生作文是否偏离题意（与用户输入的"作文题目"相比对，是否符合"作文题目"的要点要求？）如果完全偏离题意，6分以下打分。##应用文词数 中的"英语单词数"少于60的，直接3分以下打分。直接跳到步骤
2.注意以下几点：**特别提醒：针对中国高中生，评分标准应该相对宽容**。注意，单词错误多（比如多于10处才算多），语法错误多影响表达（但不影响理解的前提下可宽容），句式都是简单句（句式过于简单的），或字数不足（如少于80个单词），满足以上条件之一的，9分以下打分。##应用文词数 中的"英语单词数"少于60的，视为字数严重不足，按最高第一档（1-3分）打分。注意，先不要打分，wait, step by step.
3 现在，请给学生打分！按照我上面给你的打分标准，从答题要点、逻辑性、语言表达的地道性、单词拼写错误等方面给出合理的分数（1-15分）。**注意：针对中国高中生，请适当宽容2分**。注意：
   - 必须根据学生作文的具体表现来打分，不要随意给分
   - 语言表达方向的打分要充分参照我给你的#学生范文（13分版本）
   - 英语单词数少于80的，要扣3分
   - 必须输出具体的分数值
   - 最后的分数输出格式必须是：##${studentName}  打分：XX分（XX必须是具体数字）
4 按照## 评分标准| 你的提供范文的标准生成高分范文。
#学生范文（13分版本）
Should Music Classes Be Offered to Senior 3 Students?
As Senior 3 students approach the critical period of their final exams, the question arises whether music classes should still be offered. I believe that incorporating music into the senior high school curriculum is beneficial for students.
Firstly, music education offers a valuable mental break from the intense pressure of academic studies. It helps reduce stress and anxiety, fostering emotional well-being. Moreover, music stimulates creativity and enhances cognitive abilities, such as memory and concentration, which are vital during exam preparation. In addition, exposure to music can encourage teamwork and improve social skills, as students often engage in group performances or music-related activities.
In conclusion, offering music classes would not only contribute to the holistic development of Senior 3 students but also provide them with essential emotional and intellectual benefits.`;
      } else {
        // both - 使用打分提示词
        return basePrompt + `

##给你的要求
1     依据打分标准：给学生打分。
注意，非常重要！！：必须要同时满足对应档的全部要求，才能在这个档打分。比如覆盖所有内容要点，单词错误太多，就不能打第五档。虽漏掉 1、2个次重点，但覆盖所有主要内容。，单词及语法错误过多，就不能打第四档，要降档处理。
第五档(13-15分
1.完全完成了试题规定的任务。
2.覆盖所有内容要点。
3.应用了较多的语法结构和词汇。
4.语法结构或词汇方面有些许错误，但为尽力使用较复杂结构或较高级词汇所致，具备较强的语言运用能力。
5.有效地使用了语句间的连接成分，使全文结构紧凑。
6.完全达到了预期的写作目的。
第四档(10-12分)
1.完全完成了试题规定的任务。
2.虽漏掉 1、2个次重点，但覆盖所有主要内容。
3.应用的语法结构和词汇能满足任务的要求。
4.语法结构或词汇方面应用基本准确，些许错误主要是因尝试较复杂语法结构或词汇所致。
5.应用简单的语句间的连接成分，使全文结构紧凑。
6.达到了预期的写作目的。
第三档(7-9分)
1.基本完成了试题规定的任务。
2.虽漏掉一些内容，但覆盖所有主要内容。
3.应用的语法结构和词汇能满足任务的要求。
4.有一些语法结构或词汇方面的错误，但不影响理解，
5.应用简单的语句间连接成分，使全文内容连贯。
6.整体而言，基本达到了预期的写作目的。
第二档(4-6分)
1.未恰当完成试题规定的任务。
2.漏掉或未描述清楚一些主要内容，写了一些无关内容。
3.语法结构单调、词汇项目有限。
4.有一些语法结构或词汇方面的错误，影响了对写作内容的理解。
5.较少使用语句间的连接成分，内容缺少连贯性。
6.信息未能清楚地传达给读者。
第一档(1-3分)
1.未完成试题规定的任务。
2.明显遗漏主要内容，写了一些无关内容，原因可能是未理解试题要求。
3.语法结构单调、词汇项目有限。
2语法和拼写错误分析：我会指出学生作文中的语法、拼写和用词错误，帮助学生了解需要改进的地方。
4.较多语法结构或词汇方面的错误，影响对写作内容的理解。
5.缺乏语句间的连接成分，内容不连贯。
6.信息未能传达给读者。

#步骤
1 换行，指出学生作文是否偏离题意（与用户输入的"作文题目"相比对，是否符合"作文题目"的要点要求？）如果完全偏离题意，6分以下打分。##应用文词数 中的"英语单词数"少于60的，直接3分以下打分。直接跳到步骤
2.注意以下几点：注意，单词错误多（比如多于5处），语法错误多影响表达，句式都是简单句（句式过于简单的），或字数不足（如少于80个单词），满足以上条件之一的，9分以下打分。##应用文词数 中的"英语单词数"少于60的，视为字数严重不足，按最高第一档（1-3分）打分。注意，先不要打分，wait, step by step.
3 现在，请精确计算学生的作文，一共有几句话。请再呈现并逐句逐句输出学生原文句子，然后给出你的改动升级的句子版本。你的输出格式必须严格按照以下模板，逐句分析：

**原文**: "Having learned that you have a deep insight into poem, I am writing to ask for your help."
**修改**: "Knowing your deep understanding of American poetry, I'm reaching out to seek your guidance."
**理由**: "Having learned"结构生硬；"deep insight into poem"语法错误；改写后更自然流畅，语义准确。

---

**原文**: "The activity will began next week, including three parts which are sharing our favorites, giving a speech and conducting discussion."
**修改**: "The event will take place next week and consist of three parts: sharing favorite poems, delivering short speeches, and engaging in group discussions."
**理由**: 修正"began"错误；"including... which are"结构混乱；使用冒号列举更清晰；动名词结构统一，表达更地道。

每个句子分析都必须包含：原文、修改版本、详细理由。理由要具体指出语法错误、词汇选择、结构优化等问题。

4 现在，请给学生打分要按照我上面给你的打分标准，从  答题要点、逻辑性、语言表达的地道性、单词拼写错误等方面给出合理的分数，注意，语言表达方向的打分要充分参照我给你的#学生范文（13分版本）##应用文词数中的"英语单词数"少于80的，要扣3分。**重要提醒：针对中国高中生，请适当宽容2分，不要因为一些小的语法或用词错误就过度扣分**。最后，输出姓名，输出你的修改后的分数。最后的分数输出格式为：##学生姓名+  打分：XX分。
5 按照## 评分标准| 你的提供范文的标准生成高分范文。
#学生范文（13分版本）
Should Music Classes Be Offered to Senior 3 Students?
As Senior 3 students approach the critical period of their final exams, the question arises whether music classes should still be offered. I believe that incorporating music into the senior high school curriculum is beneficial for students.
Firstly, music education offers a valuable mental break from the intense pressure of academic studies. It helps reduce stress and anxiety, fostering emotional well-being. Moreover, music stimulates creativity and enhances cognitive abilities, such as memory and concentration, which are vital during exam preparation. In addition, exposure to music can encourage teamwork and improve social skills, as students often engage in group performances or music-related activities.
In conclusion, offering music classes would not only contribute to the holistic development of Senior 3 students but also provide them with essential emotional and intellectual benefits.`;
      }
    };

    const prompt = buildGradingPrompt(studentName, topic, content, gradingType as 'scoring' | 'revision' | 'both');

    // 检查极客智坊API Key配置
    if (!GEEKAI_API_KEY) {
      return NextResponse.json({
        success: false,
        error: '极客智坊API Key未配置，请检查环境变量 GEEKAI_API_KEY'
      }, { status: 500 });
    }

    // 调用极客智坊AI API
    const response = await fetch(GEEKAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GEEKAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "qwen-plus",
        messages: [
          {
            role: 'system',
            content: '你是一位专业的英语教师，擅长批改学生的英语应用文作文。你会根据评分标准给出详细的批改意见和分数。请记住：针对中国高中生的英语作文，评分标准应该相对宽容，不要因为一些小的语法或用词错误就过度扣分，适当放宽2分是合理的。'
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
      throw new Error(`AI API请求失败: ${response.status}`);
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content;

    if (!result) {
      throw new Error('AI返回结果为空');
    }

    console.log('应用文批改API - AI模型返回结果，长度:', result.length);
    console.log('应用文批改API - 结果预览:', result.substring(0, 500) + '...');

    // 解析结果（智能提取分数）
    const parseGradingResult = (result: string) => {
      console.log('开始解析AI批改结果，原始结果长度:', result.length);

      // 智能分数提取算法
      const extractScore = (text: string): number => {
        // 1. 专门查找"##学生姓名+  打分：XX分"格式
        const specificPattern = /##\s*[^+\n]*?\+\s*打分[：:]?\s*(\d+)分/;
        const match = text.match(specificPattern);
        if (match) {
          const score = parseInt(match[1]);
          if (score >= 1 && score <= 15) {
            console.log('通过指定格式提取分数:', score, '格式:', match[0]);
            return score;
          }
        }

        // 2. 查找"##学生姓名  打分：XX分"格式
        const namePattern = /##\s*[^\n#]*?\s+打分[：:]?\s*(\d+)分/;
        const nameMatch = text.match(namePattern);
        if (nameMatch) {
          const score = parseInt(nameMatch[1]);
          if (score >= 1 && score <= 15) {
            console.log('通过姓名格式提取分数:', score, '格式:', nameMatch[0]);
            return score;
          }
        }

        // 3. 查找其他明确的分数模式
        const explicitPatterns = [
          /打分[：:]\s*(\d+)分/,           // "打分：XX分"
          /得分[：:]\s*(\d+)分/,           // "得分：XX分"
          /分数[：:]\s*(\d+)分/,           // "分数：XX分"
          /score[：:]\s*(\d+)分?/i,        // "score: XX分"
          /##\s*[^\n#]*?打分[：:]\s*(\d+)分/, // "##学生姓名 打分：XX分"
        ];

        for (const pattern of explicitPatterns) {
          const match = text.match(pattern);
          if (match) {
            const score = parseInt(match[1]);
            if (score >= 1 && score <= 15) {
              console.log('通过明确模式提取分数:', score, '使用模式:', pattern);
              return score;
            }
          }
        }

        // 2. 查找通用分数模式 "XX分"
        const generalPattern = /(^|\D)(\d{1,2})分(?!\d)/g;
        const generalMatches = [...text.matchAll(generalPattern)];

        for (const match of generalMatches) {
          const score = parseInt(match[2]);
          if (score >= 1 && score <= 15) {
            console.log('通过通用模式提取分数:', score);
            return score;
          }
        }

        // 3. 基于内容质量估算分数
        return estimateScoreFromContent(text);
      };

      // 基于内容质量估算分数
      const estimateScoreFromContent = (text: string): number => {
        let score = 8; // 基础分数

        // 根据批改内容质量调整分数
        const qualityIndicators = [
          { pattern: /优秀|很好|非常好|excellent|very good/i, weight: 3 },
          { pattern: /良好|good/i, weight: 2 },
          { pattern: /一般|一般般|average/i, weight: 0 },
          { pattern: /较差|poor|不好|bad/i, weight: -2 },
          { pattern: /很多错误|多处错误|numerous errors/i, weight: -3 },
          { pattern: /逻辑清晰|coherent|逻辑性强/i, weight: 2 },
          { pattern: /语言流畅|fluent|表达清楚/i, weight: 2 },
          { pattern: /词汇丰富|rich vocabulary/i, weight: 2 },
          { pattern: /语法正确|correct grammar/i, weight: 2 }
        ];

        qualityIndicators.forEach(indicator => {
          if (indicator.pattern.test(text)) {
            score += indicator.weight;
          }
        });

        // 根据错误数量调整分数
        const errorPatterns = [
          /错误|error|mistake/i,
          /拼写错误|spelling error/i,
          /语法错误|grammar error/i,
          /表达不当|inappropriate expression/i
        ];

        let errorCount = 0;
        errorPatterns.forEach(pattern => {
          const matches = text.match(pattern);
          if (matches) errorCount += matches.length;
        });

        score -= Math.min(errorCount * 0.5, 5); // 最多扣5分

        // 确保分数在合理范围内
        score = Math.max(1, Math.min(15, Math.round(score)));

        console.log('基于内容质量估算分数:', score, '错误数量:', errorCount);
        return score;
      };

      let score = extractScore(result);

      // 限制分数范围在1-15分之间
      if (score > 15) {
        console.warn('分数超出范围，调整为15分:', score);
        score = 15;
      } else if (score < 1) {
        console.warn('分数过低，调整为1分:', score);
        score = 1;
      }

      console.log('最终提取分数:', score);

      // 提取改进版本
      const improvedVersion = extractImprovedVersion(result);

      // 提取详细评分信息
      const gradingDetails = {
        contentPoints: extractSection(result, '内容要点|答题要点'),
        languageErrors: extractSection(result, '语法错误|语言错误'),
        logicalIssues: extractSection(result, '逻辑问题|连贯性'),
        sentenceAnalysis: extractSection(result, '逐句分析|句子分析'),
        overallEvaluation: extractSection(result, '整体评价|AI专家评价')
      };

      console.log('解析完成:', { score, hasImprovedVersion: !!improvedVersion, detailsCount: Object.values(gradingDetails).filter(Boolean).length });

      return {
        score,
        feedback: result,
        improvedVersion,
        gradingDetails
      };
    };

    const extractImprovedVersion = (text: string): string => {
      // 简单提取高分范文部分
      const match = text.match(/高分范文[：:]?\s*([\s\S]*?)(?=\n\n|$)/);
      return match ? match[1].trim() : '';
    };

    const extractSection = (text: string, sectionName: string): string => {
      try {
        const regex = new RegExp(`${sectionName}[：:]?\\s*([\\s\\S]*?)(?=\\n\\n|##|$)`, 'i');
        const match = text.match(regex);
        return (match && match[1]) ? match[1].trim() : '';
      } catch (error) {
        console.error('提取章节时出错:', { sectionName, error });
        return '';
      }
    };

    const gradingResult = parseGradingResult(result);

    // 获取用户剩余点数
    let remainingPoints = 0;
    try {
      remainingPoints = await SupabasePointsService.getUserPoints(user.id);
      console.log('成功获取用户剩余点数:', remainingPoints);
    } catch (error) {
      console.error('获取用户剩余点数失败:', error);
    }

    console.log('应用文批改API - 批改完成', { userId: user.id, pointsCost, remainingPoints });

    return NextResponse.json({
      success: true,
      result: gradingResult,
      pointsCost: pointsCost,
      remainingPoints: remainingPoints,
      message: `应用文批改完成，消耗${pointsCost}点数，剩余${remainingPoints}点数`
    });

  } catch (error) {
    console.error('应用文批改API错误:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '批改失败，请稍后重试'
      },
      { status: 500 }
    );
  }
}