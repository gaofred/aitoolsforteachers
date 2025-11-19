import { NextRequest, NextResponse } from 'next/server';
import { SupabasePointsService } from '@/lib/supabase-points-service';

// 阿里云通义千问API配置 - 与读后续写批改保持一致
const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;
const DASHSCOPE_API_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';

// 批量批改请求类型
interface BatchGradingRequest {
  assignments: Array<{
    id: string;
    studentName: string;
    topic: string;
    content: string;
    gradingType?: 'scoring' | 'revision' | 'both';
  }>;
  gradingType: 'scoring' | 'revision' | 'both';
  useMediumStandard?: boolean;
}

export async function POST(request: NextRequest) {
  console.log('应用文批量批改API - 开始处理请求');

  try {
    // 尝试解析请求体
    let body;
    try {
      body = await request.json();
      console.log('应用文批量批改API - 请求体解析成功:', {
        assignmentCount: body.assignments?.length || 0,
        gradingType: body.gradingType,
        userId: body.userId
      });
    } catch (parseError) {
      console.error('应用文批量批改API - 请求体解析失败:', parseError);
      return NextResponse.json(
        { success: false, error: '请求格式错误' },
        { status: 400 }
      );
    }

    const { assignments, gradingType = 'both', useMediumStandard = false } = body as BatchGradingRequest;

    if (!assignments || assignments.length === 0) {
      console.log('应用文批量批改API - 参数验证失败: 没有作业数据');
      return NextResponse.json(
        { success: false, error: '缺少作业数据' },
        { status: 400 }
      );
    }

    // 验证每个作业数据
    for (const assignment of assignments) {
      if (!assignment.studentName || !assignment.topic || !assignment.content) {
        console.log('应用文批量批改API - 参数验证失败', {
          assignmentId: assignment.id,
          hasStudentName: !!assignment.studentName,
          hasTopic: !!assignment.topic,
          hasContent: !!assignment.content
        });
        return NextResponse.json(
          { success: false, error: '作业数据不完整：缺少学生姓名、题目或作文内容' },
          { status: 400 }
        );
      }
    }

    console.log('应用文批量批改API - 参数验证通过');

    // 使用Supabase自动处理token
    const { createServerSupabaseClient } = await import('@/lib/supabase-server');
    const supabase = createServerSupabaseClient();

    const { data: { user }, error } = await supabase.auth.getUser();

    if (!user || error) {
      console.log('应用文批量批改API - 用户认证失败', { error: error?.message });
      return NextResponse.json(
        { success: false, error: '用户认证失败' },
        { status: 401 }
      );
    }

    console.log('应用文批量批改API - 用户验证成功', { userId: user.id, email: user.email });

    // 计算总点数消耗
    const pointsPerStudent = 1; // 批量批改每个学生1点数
    const totalPointsRequired = assignments.length * pointsPerStudent;
    const pointsCost = totalPointsRequired; // 直接使用整数结果

    console.log('批量批改点数计算:', {
      assignmentCount: assignments.length,
      pointsPerStudent,
      totalPointsRequired,
      finalCost: pointsCost
    });

    // 检查用户点数
    const userPoints = await SupabasePointsService.getUserPoints(user.id);
    if (userPoints < pointsCost) {
      console.log('应用文批量批改API - 点数不足，拒绝请求', {
        userId: user.id,
        required: pointsCost,
        available: userPoints
      });
      return NextResponse.json(
        { success: false, error: `点数不足，需要${pointsCost}点数，当前余额${userPoints}点数` },
        { status: 402 }
      );
    }

    // 扣除点数
    try {
      const pointsDeducted = await SupabasePointsService.deductPoints(
        user.id,
        pointsCost,
        `batch_application_grading_${assignments.length}_students`
      );

      if (!pointsDeducted) {
        console.log('应用文批量批改API - 点数扣除失败', { userId: user.id, pointsCost });
        return NextResponse.json(
          { success: false, error: '点数扣除失败，请稍后重试' },
          { status: 500 }
        );
      }

      console.log('应用文批量批改API - 点数扣除成功', { userId: user.id, pointsCost });
    } catch (pointsError) {
      console.error('应用文批量批改API - 点数扣除异常:', pointsError);
      return NextResponse.json(
        { success: false, error: '点数验证失败，请稍后重试' },
        { status: 500 }
      );
    }

    // 检查阿里云通义千问API Key配置
    if (!DASHSCOPE_API_KEY) {
      return NextResponse.json({
        success: false,
        error: '阿里云通义千问API Key未配置，请联系管理员配置环境变量'
      }, { status: 500 });
    }

    // 构建批改提示词函数
    const buildGradingPrompt = (studentName: string, topic: string, content: string, type: 'scoring' | 'revision' | 'both', useMediumStandard: boolean = false) => {
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
The sample essay you provide must adhere strictly to a clearly defined three-paragraph structure. The first paragraph must contain exactly two sentences.
The second paragraph should present detailed and substantial content to fully develop the main idea. It should serve as the core of the essay, elaborating with examples, evidence, or logical reasoning.
The third paragraph should consist of no more than two sentences and offer a concise conclusion.
Word count : 80 - 130 words`;

      if (type === 'scoring') {
        return basePrompt + `

##给你的要求
**步骤1：题目偏离检测**
首先，请仔细分析学生的作文是否**完全偏离题意**（与## 题目要求相比对，是否符合题目要求？）。如果完全偏离题意，请明确说明"**完全偏离题意**"，并直接跳到步骤4进行打分，跳过步骤2和步骤3的逐句修改。

**步骤2：语法和逻辑分析（仅在未偏离题意时进行）**
如果学生作文**未完全偏离题意**，请继续以下分析：
- 指出学生作文中的所有语法、单词拼写错误，尽量指出10处或以上（连字符错误、标题符号错误、首句大写字母未大写不计入，语言表达不够地道等不纳入考虑范围）。
- 指出学生作文里面存在的所有逻辑上的不足（如连贯性等），尽量指出5处或以上逻辑不足。注意是高中生作文，评价不能过于严苛。

**步骤3：逐句分析与修改升级（仅在未偏离题意时进行）**
现在，请精确计算学生作文的句子数量，然后逐句分析和修改：
- 逐句输出学生原文句子
- 给出你的改动升级的句子版本
- 陈述每个改动的理由
- 输出格式如下：
  **原文**: \"Let's creat an honest test environment\"
  **修改**: \"Let us jointly uphold examination ethics through practical actions\"
  **理由**: 修正拼写错误（creat→create），补充具体行动指南。

**步骤4：给学生打分**
按照上面的打分标准，从答题要点、逻辑性、语言表达、单词拼写等方面给出合理分数。**重要提醒**：如果完全偏离题意，直接打6分以下。词数少于80个单词要扣3分。

**评分标准说明**：
${useMediumStandard ? `
**中等标准模式**：
- 严格按照评分标准打分，不额外加分
- 评分要求更加严格，请从严扣分
- 直接按照评分标准给出分数，不因为是中国高中生而放宽要求
- 对于语法错误、用词不当等问题要严格按照标准扣分` : `
**宽松标准模式**：
- 评分标准相对宽松，对小错误可以从轻处理
- 可以在严格评分基础上，酌情增加1-2分作为鼓励
- 针对中国高中生，请适当宽容1分，不要因为小错误过度扣分
- 对于语法错误、用词不当等问题可以适度宽容处理`}

输出格式：##学生姓名+  打分：XX分。

**步骤5：专家评价**
以AI专家的口吻，明确指出学生的优缺点，分点陈述。以"你"称呼，汉字表达，200个汉字以内。

**步骤6：AI高老师评语（详细反馈）**
请以"AI高老师"的身份，给学生写一个详细的作文评语，要求如下：
- 以"你这篇作文"开头
- 具体分析作文的思路和观点表达
- 详细指出语言使用问题（拼写错误、词汇误用等），并给出具体例子和正确表达
- 分析句子结构问题，指出语法错误并提供修改建议
- 评价文章结构组织，肯定优点，指出不足
- 分析论证展开情况，建议如何加强论证
- 检查结尾部分的逻辑性和呼应性
- 最后给出具体的改进建议（至少5条）
- 整体语气要鼓励性强，既指出问题又给予信心
- 字数控制在300汉字左右，确保评语简洁而有针对性

评语格式参考：
"AI高老师评语：
你这篇作文[开头分析]...[具体问题分析]...[结构评价]...[改进建议]...
继续努力，你在思想表达上有潜力，只要加强语言基本功，写作水平一定会有显著提升。"`;
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
**步骤1：题目偏离检测**
换行，指出学生作文是否偏离题意（与用户输入的"作文题目"相比对，是否符合"作文题目"的要点要求？）。如果**完全偏离题意**，请明确说明"**完全偏离题意**"，直接6分以下打分，并跳到步骤3，跳过步骤2的逐句修改。##应用文词数 中的"英语单词数"少于60的，直接3分以下打分。

**步骤2：逐句分析与修改升级（仅在未偏离题意时进行）**
如果学生作文**未完全偏离题意**，请进行逐句分析和修改：
- 精确计算学生作文的句子数量
- 逐句输出学生原文句子
- 给出你的改动升级的句子版本
- 陈述每个改动的理由
- 输出格式如下：
  **原文**: \"Let's creat an honest test environment\"
  **修改**: \"Let us jointly uphold examination ethics through practical actions\"
  **理由**: 修正拼写错误（creat→create），补充具体行动指南。

**步骤3：给学生打分**
现在，请给学生打分要按照我上面给你的打分标准，从答题要点、逻辑性、语言表达的地道性、单词拼写错误等方面给出合理的分数。##应用文词数中的"英语单词数"少于80的，要扣3分。**重要提醒**：${useMediumStandard ? '采用中等标准，严格按照评分标准打分，不额外宽容加分' : '针对中国高中生，请适当宽容1分，不要因为一些小的语法或用词错误就过度扣分'}。最后，输出姓名，输出你的修改后的分数。最后的分数输出格式为：##学生姓名+  打分：XX分。

**步骤4：特别说明：词汇处理原则** - 对于学生使用的高级词汇，只要语法正确，都应该予以保留和鼓励，不要为了追求"看起来更自然"而将高级词汇改为简单表达。中国式英语考试更注重词汇的丰富性和高级性。

**步骤5：亮点词汇和句式表扬** - 请明确列出学生作文中的亮点词汇和句式表达，并给予表扬。格式如下：
## 亮点词汇与句式
**值得表扬的词汇**：[列出具体的高级词汇]
**精彩句式**：[列出学生使用的优秀句式结构]
**表扬理由**：[说明为什么这些词汇和句式值得肯定]

**步骤6：专家总结评价** - 以AI专家的口吻，明确指出学生的优缺点，分点陈述。以"你"称呼，汉字表达，200个汉字以内。

**步骤7：AI高老师评语（详细反馈）**
请以"AI高老师"的身份，给学生写一个详细的作文评语，要求如下：
- 以"你这篇作文"开头
- 具体分析作文的思路和观点表达
- 详细指出语言使用问题（拼写错误、词汇误用等），并给出具体例子和正确表达
- 分析句子结构问题，指出语法错误并提供修改建议
- 评价文章结构组织，肯定优点，指出不足
- 分析论证展开情况，建议如何加强论证
- 检查结尾部分的逻辑性和呼应性
- 最后给出具体的改进建议（至少5条）
- 整体语气要鼓励性强，既指出问题又给予信心
- 字数控制在300汉字左右，确保评语简洁而有针对性

评语格式参考：
"AI高老师评语：
你这篇作文[开头分析]...[具体问题分析]...[结构评价]...[改进建议]...
继续努力，你在思想表达上有潜力，只要加强语言基本功，写作水平一定会有显著提升。"`;
      }
    };

    // 解析结果函数
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

        // 4. 查找通用分数模式 "XX分" - 优先匹配两位数分数
        const twoDigitPattern = /(^|\D)([1-9]\d)分(?!\d)/g; // 匹配10-99分，但我们要10-15分
        const twoDigitMatches = [...text.matchAll(twoDigitPattern)];

        // 先查找两位数分数（10-15分）
        for (const match of twoDigitMatches) {
          const score = parseInt(match[2]);
          if (score >= 10 && score <= 15) {
            console.log('通过两位数模式提取分数:', score, '格式:', match[0]);
            return score;
          }
        }

        // 再查找一位数分数（1-9分）
        const oneDigitPattern = /(^|\D)([1-9])分(?!\d)/g;
        const oneDigitMatches = [...text.matchAll(oneDigitPattern)];

        for (const match of oneDigitMatches) {
          const score = parseInt(match[2]);
          if (score >= 1 && score <= 9) {
            console.log('通过一位数模式提取分数:', score, '格式:', match[0]);
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

        // 确保分数在合理范围内（最高13分）
        score = Math.max(1, Math.min(13, Math.round(score)));

        console.log('基于内容质量估算分数:', score, '错误数量:', errorCount);
        return score;
      };

      let score = extractScore(result);

      // 限制分数范围在1-13分之间
      if (score > 13) {
        console.warn('分数超出范围，调整为13分:', score);
        score = 13;
      } else if (score < 1 && score > 0) {
        console.warn('分数过低，调整为1分:', score);
        score = 1;
      }

      if (score === 0) {
        console.warn('未能提取到有效分数，原始结果:', result.substring(0, 200) + '...');
      }

      // 提取改进版本 - 直接返回空字符串，因为不需要范文
      const extractImprovedVersion = (text: string): string => {
        return '';
      };

      // 提取详细评分信息
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

      const improvedVersion = extractImprovedVersion(result);
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

    // 并行批改处理
    const batchSize = 15; // 进一步增加并发限制以提高速度
    const results = [];
    const errors = [];

    console.log('应用文批量批改API - 开始并行批改', {
      totalAssignments: assignments.length,
      batchSize
    });

    // 分批处理
    for (let i = 0; i < assignments.length; i += batchSize) {
      const batch = assignments.slice(i, i + batchSize);
      console.log(`处理批次 ${Math.floor(i / batchSize) + 1}/${Math.ceil(assignments.length / batchSize)}`, {
        batchSize: batch.length,
        startIndex: i
      });

      const batchPromises = batch.map(async (assignment) => {
        try {
          console.log(`开始批改学生: ${assignment.studentName}`);

          const prompt = buildGradingPrompt(
            assignment.studentName,
            assignment.topic,
            assignment.content,
            gradingType,
            useMediumStandard
          );

          // 调用阿里云通义千问API
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
                  content: `你是一位专业的英语教师，擅长批改学生的英语应用文作文。你会根据评分标准给出详细的批改意见和分数。请记住：${useMediumStandard ? '采用中等标准，严格按照评分标准打分，不额外宽容加分，评分要求更加严格' : '针对中国高中生的英语作文，评分标准应该相对宽容，不要因为一些小的语法或用词错误就过度扣分，适当放宽1分是合理的'}。同时，请鼓励和保留学生使用的高级词汇，只要语法正确就不要改为简单表达。`
                },
                {
                  role: 'user',
                  content: prompt
                }
              ],
              temperature: 0.2,
              max_tokens: 4000,
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

          console.log(`学生 ${assignment.studentName} 批改完成，结果长度:`, result.length);

          const gradingResult = parseGradingResult(result);

          return {
            id: assignment.id,
            studentName: assignment.studentName,
            status: 'completed' as const,
            gradingResult,
            timestamp: new Date().toISOString()
          };

        } catch (error) {
          console.error(`批改学生 ${assignment.studentName} 失败:`, error);
          const errorMessage = error instanceof Error ? error.message : '批改失败';
          errors.push(`${assignment.studentName}: ${errorMessage}`);

          return {
            id: assignment.id,
            studentName: assignment.studentName,
            status: 'failed' as const,
            error: errorMessage,
            timestamp: new Date().toISOString()
          };
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);

      // 处理批次结果
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.error('批次处理失败:', result.reason);
          const failedAssignment = batch.find(a =>
            !results.some(r => r.id === a.id) &&
            !errors.some(e => e.includes(a.studentName))
          );
          if (failedAssignment) {
            results.push({
              id: failedAssignment.id,
              studentName: failedAssignment.studentName,
              status: 'failed' as const,
              error: '处理失败',
              timestamp: new Date().toISOString()
            });
          }
        }
      });
    }

    // 计算统计信息
    const successfulCount = results.filter(r => r.status === 'completed').length;
    const failedCount = results.filter(r => r.status === 'failed').length;
    const successfulResults = results.filter(r => r.status === 'completed' && r.gradingResult?.score);
    const averageScore = successfulResults.length > 0
      ? successfulResults.reduce((sum, r) => sum + (r.gradingResult?.score || 0), 0) / successfulResults.length
      : 0;

    // 获取用户剩余点数
    let remainingPoints = 0;
    try {
      remainingPoints = await SupabasePointsService.getUserPoints(user.id);
      console.log('成功获取用户剩余点数:', remainingPoints);
    } catch (error) {
      console.error('获取用户剩余点数失败:', error);
    }

    console.log('应用文批量批改API - 批改完成', {
      userId: user.id,
      totalAssignments: assignments.length,
      successfulCount,
      failedCount,
      averageScore,
      pointsCost,
      remainingPoints
    });

    return NextResponse.json({
      success: true,
      results,
      statistics: {
        total: assignments.length,
        successful: successfulCount,
        failed: failedCount,
        averageScore: Math.round(averageScore * 10) / 10 // 保留1位小数
      },
      pointsCost,
      remainingPoints,
      message: `批量批改完成！成功${successfulCount}份，失败${failedCount}份，消耗${pointsCost}点数，剩余${remainingPoints}点数`
    });

  } catch (error) {
    console.error('应用文批量批改API错误:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '批量批改失败，请稍后重试'
      },
      { status: 500 }
    );
  }
}