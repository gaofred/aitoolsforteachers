import { NextRequest, NextResponse } from 'next/server';
import { SupabasePointsService } from '@/lib/supabase-points-service';

// 极客智坊API配置 - 与应用文API保持一致
const GEEKAI_API_KEY = process.env.GEEKAI_API_KEY;
const GEEKAI_API_URL = 'https://geekai.co/api/v1/chat/completions';

export async function POST(request: NextRequest) {
  try {
    console.log('🎯 开始读后续写全班共性分析API处理');

    const body = await request.json();
    const { topic, p1Content, p2Content, studentEssays, plotAnalysis } = body;

    console.log('📋 接收到的请求参数:', {
      hasTopic: !!topic,
      topicLength: topic?.length || 0,
      p1ContentLength: p1Content?.length || 0,
      p2ContentLength: p2Content?.length || 0,
      hasPlotAnalysis: !!plotAnalysis,
      studentEssaysCount: studentEssays?.length || 0,
      isFirstEssay: studentEssays?.[0]?.studentName
    });

    // 积分相关变量
    let userId = null;
    let pointsDeducted = false;

    if (!topic || !studentEssays || !Array.isArray(studentEssays) || studentEssays.length === 0) {
      return NextResponse.json({
        success: false,
        error: '缺少必要参数：读后续写题目和学生作文内容'
      }, { status: 400 });
    }

    console.log('✅ 基本参数验证通过');

    // 使用双重认证机制 - 支持Cookie和Header认证
    const { authenticateRequest, createAuthErrorResponse, logAuthSuccess } = await import('@/lib/auth-utils');
    const authResult = await authenticateRequest(request);

    if (!authResult.user) {
      const errorResponse = createAuthErrorResponse(authResult, '读后续写共性问题分析API');
      return NextResponse.json(errorResponse, { status: 401 });
    }

    const user = authResult.user;
    userId = user.id;
    logAuthSuccess(authResult, '读后续写共性问题分析API');

    // 检查用户积分是否足够 - 需要3积分
    const pointsCost = 3;
    const currentUserId = user.id;

    // 获取用户积分信息
    try {
      const pointsData = await SupabasePointsService.getUserPoints(currentUserId);

      if (pointsData.points < pointsCost) {
        return NextResponse.json({
          success: false,
          error: `积分不足，需要${pointsCost}积分才能进行全班共性分析（当前积分：${pointsData.points}）`
        }, { status: 402 });
      }

      console.log('💰 用户积分充足:', {
        userId: currentUserId,
        currentPoints: pointsData.points,
        requiredPoints: pointsCost
      });

    } catch (pointsError) {
      console.error('❌ 积分检查失败:', pointsError);
      return NextResponse.json({
        success: false,
        error: '积分检查失败，请稍后重试'
      }, { status: 500 });
    }

    console.log('📝 分析参数:', {
      topicLength: topic.length,
      essaysCount: studentEssays.length,
      hasP1P2: !!(p1Content && p2Content),
      hasPlotAnalysis: !!plotAnalysis,
      topic: topic.substring(0, 100) + '...'
    });

    // 限制学生作文数量，最多处理40份
    const limitedEssays = studentEssays.slice(0, 40);
    const originalCount = studentEssays.length;

    if (studentEssays.length > 40) {
      console.log(`⚠️ 学生作文数量超过限制，从${studentEssays.length}份限制为40份`);
    }

    // 对极大数据量的额外保护
    if (originalCount > 100) {
      console.log(`🚨 数据量极大（${originalCount}份作文），建议分批处理以获得最佳效果`);
    }

    // 构建作文内容文本，包含批改结果
    const essaysContent = limitedEssays.map((essay, index) => {
      let essayText = `## 学生：${essay.studentName}\n`;
      essayText += `### 得分：${essay.score}/25分\n`;
      essayText += `### 作文内容：\n${essay.content}\n`;

      if (essay.feedback) {
        essayText += `### AI批改反馈：\n${essay.feedback}\n`;
      }

      if (essay.detailedFeedback) {
        essayText += `### 详细批改：\n${essay.detailedFeedback}\n`;
      }

      if (essay.languageErrors) {
        essayText += `### 语言错误：\n${essay.languageErrors}\n`;
      }

      if (essay.contentIssues) {
        essayText += `### 内容问题：\n${essay.contentIssues}\n`;
      }

      essayText += '\n---\n';
      return essayText;
    }).join('\n');

    // 检查数据大小，避免数据过大导致超时
    const totalDataSize = JSON.stringify({
      topic: topic,
      essaysContent: essaysContent,
      studentCount: limitedEssays.length
    }).length;

    console.log('📊 数据大小检查:', {
      topicLength: topic.length,
      essaysContentLength: essaysContent.length,
      totalDataSize: totalDataSize,
      originalStudentCount: originalCount,
      processedStudentCount: limitedEssays.length,
      dataSizeKB: Math.round(totalDataSize / 1024)
    });

    // 多级数据大小保护机制，确保系统能处理大量数据
    let finalEssaysContent = essaysContent;
    let processedEssaysCount = limitedEssays.length;

    if (totalDataSize > 3000000) { // 3MB - 极大数据量
      console.log('🚨 数据量极大，大幅截断内容');
      // 只保留核心信息
      finalEssaysContent = limitedEssays.map((essay, index) => {
        let essayText = `## 学生：${essay.studentName} (得分: ${essay.score}/25)\n`;
        essayText += `### 作文内容：\n${essay.content.substring(0, 800)}...\n`;
        essayText += '\n---\n';
        return essayText;
      }).join('\n');
    } else if (totalDataSize > 1500000) { // 1.5MB - 中等大数据量
      console.log('⚠️ 数据过大，限制内容长度以避免超时');
      finalEssaysContent = limitedEssays.map((essay, index) => {
        let essayText = `## 学生：${essay.studentName}\n`;
        essayText += `### 得分：${essay.score}/25分\n`;
        essayText += `### 作文内容：\n${essay.content.substring(0, 1500)}...\n`;

        if (essay.feedback) {
          essayText += `### AI批改反馈：\n${essay.feedback.substring(0, 800)}...\n`;
        }

        if (essay.detailedFeedback) {
          essayText += `### 详细批改：\n${essay.detailedFeedback.substring(0, 800)}...\n`;
        }

        essayText += '\n---\n';
        return essayText;
      }).join('\n');
    }

    if (totalDataSize > 1500000) {
      console.log(`📝 内容已截断，处理${limitedEssays.length}份作文，数据大小: ${Math.round(totalDataSize / 1024)}KB`);
    }

    // 构建给Gemini的提示词
    let fullPrompt = `请你作为一名专业的高中英语教师，分析以下学生在读后续写中的共性问题。

## 续写题目
${topic}

${p1Content ? `## 第一段首句要求
${p1Content}` : ''}

${p2Content ? `## 第二段首句要求
${p2Content}` : ''}

${plotAnalysis ? `## 正确情节走向分析
${plotAnalysis}` : ''}

## 数据说明
${originalCount > processedEssaysCount ? `**注意**：由于系统限制，本次分析仅包含前${processedEssaysCount}份学生作文（共${originalCount}份）。分析结果基于这些已处理的作文。\n\n` : ''}

## 学生作文与批改数据
${finalEssaysContent}

**重要提示：**
1. 在分析中请直接使用学生的真实姓名进行举例和说明，不要使用"学生1"、"学生2"等编号
2. 结合AI批改反馈和得分情况进行综合分析
3. 重点关注读后续写的特殊要求：情节连贯性、语言风格一致性、段落衔接等

请按照以下结构进行分析：

### 1. 整体表现分析
- **分数分布**: 分析学生得分的分布情况和平均水平
- **完成度**: 评估学生对续写要求的完成情况
- **P1/P2首句使用**: 分析学生对规定首句的遵循情况

### 2. 共性问题分析
请从以下几个方面详细分析学生的共性问题：
- **情节发展问题**: 偏离原文逻辑、情节跳跃、缺乏合理性等
- **语言风格不一致**: 与原文语言风格脱节、词汇选择不当等
- **段落衔接问题**: 第一段到第二段过渡不自然、缺乏连贯性等
- **语法表达错误**: 时态混乱、句式单调、搭配不当等
- **词汇运用问题**: 词汇重复、用词不准确、缺乏变化等

### 3. 写作亮点与优秀表达
- **高分学生特点**: 分析表现优秀学生的写作特点
- **精彩表达**: 提取学生作文中的优秀词汇和句式
- **创新思路**: 肯定学生在情节发展中的创意亮点

### 4. 亮点句式分析与仿写练习
请从所有学生作文中挑选出5个最优秀的句式，并按照以下格式进行分析：

#### 亮点句式1：**[学生姓名]** - [句式类型/特点]
**原句**：
"引用学生作文中的原句，标注学生姓名"

**亮点分析**：
- **语法结构**：分析句子的语法结构和复杂度
- **词汇运用**：指出词汇使用的精妙之处
- **表达效果**：说明该句子的表达优势和美感

**仿写练习**：
**题目**：[根据原文主题设计的仿写题目]
**仿写示范**：
- **句子1**：[与原句结构相似的新句]
- **句子2**：[保留原句亮点的变体句]
- **句子3**：[针对不同情境的应用句]

*(按照以上格式，为选出的5个优秀句式分别进行分析和仿写练习)*

### 5. 读后续写提升策略（针对B1-B2层次）
提供具体可行的提升建议：
- **情节构建技巧**: 如何保持与原文的连贯性和创新性
- **语言风格保持**: 如何模仿和延续原文的语言特色
- **段落衔接方法**: 第一段到第二段的自然过渡技巧
- **句式多样性**: 避免句式单调的具体方法
- **词汇拓展策略**: 在读后续写中丰富词汇表达的技巧

### 6. 个性化教学建议
针对不同水平学生给出具体建议：
- **基础薄弱学生**: 重点改进方向和练习方法
- **中等水平学生**: 提升到良好水平的具体路径
- **优秀学生**: 向更高水平突破的突破点

请用中文回复，内容要详细、实用，适合教师在课堂上指导学生使用。要结合具体的学生例子，让分析更具针对性和实用性。`;

try {
      // 调用极客智坊API
      console.log('🔑 API密钥检查:', {
        hasApiKey: !!GEEKAI_API_KEY,
        apiKeyLength: GEEKAI_API_KEY?.length || 0,
        provider: '极客智坊'
      });

      if (!GEEKAI_API_KEY) {
        console.error('❌ 极客智坊API密钥未配置');
        return NextResponse.json({
          success: false,
          error: '极客智坊API密钥未配置，请联系管理员配置环境变量'
        }, { status: 500 });
      }

      console.log('✅ 极客智坊API密钥验证通过，密钥长度:', GEEKAI_API_KEY.length);

      // 🔧 修复：移除超时限制，与应用文API保持一致
      // 检查prompt长度，如果太长则截断
      let promptToUse = fullPrompt;
      if (fullPrompt.length > 50000) { // 50KB limit
        console.log('⚠️ 提示词过长，进行截断');
        promptToUse = fullPrompt.substring(0, 48000) + '\n\n...[由于内容过长，已截断，基于已有数据进行分析]';
      }

      const response = await fetch(GEEKAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GEEKAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gemini-2.5-pro', // 🔧 修复：使用与应用文相同的模型
          messages: [
            {
              role: 'user',
              content: promptToUse
            }
          ],
          temperature: 0.2, // 🔧 修复：使用与应用文相同的参数
          max_tokens: 18000, // 🔧 修复：使用与应用文相同的参数
          stream: false
        })
      });

      console.log('🔍 极客智坊 Gemini 2.5 Pro API响应状态:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ 极客智坊 Gemini 2.5 Pro API调用失败:', {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText
        });

        if (response.status === 401) {
          return NextResponse.json({
            success: false,
            error: '极客智坊 API密钥无效，请联系管理员'
          }, { status: 500 });
        }

        throw new Error(`极客智坊 Gemini 2.5 Pro API调用失败: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ 极客智坊 Gemini 2.5 Pro API调用成功:', {
        hasChoices: !!data.choices,
        choicesLength: data.choices?.length || 0,
        hasContent: !!data.choices?.[0]?.message?.content
      });

      const analysisResult = data.choices?.[0]?.message?.content;

      if (!analysisResult) {
        throw new Error('极客智坊 API返回了空结果');
      }

      // 扣除用户积分
      try {
        const pointsDeducted = await SupabasePointsService.deductPoints(
          currentUserId,
          pointsCost,
          `读后续写全班共性分析 - ${limitedEssays.length}名学生作文（原始${originalCount}份）`
        );

        if (pointsDeducted) {
          console.log('💰 积分扣除成功: -3积分');
        } else {
          console.warn('⚠️ 积分扣除失败');
        }
      } catch (deductError) {
        console.error('❌ 积分扣除异常:', deductError);
        // 不影响主功能，继续执行
      }

      console.log('🎉 读后续写全班共性分析完成:', {
        resultLength: analysisResult.length,
        userId: userId,
        pointsDeducted: pointsDeducted
      });

      return NextResponse.json({
        success: true,
        analysis: analysisResult,
        pointsDeducted: pointsDeducted,
        pointsCost: 3,
        essaysAnalyzed: limitedEssays.length,
        originalEssayCount: originalCount,
        dataTruncated: totalDataSize > 1500000,
        dataSizeKB: Math.round(totalDataSize / 1024)
      });

    } catch (apiError) {
      console.error('💥 极客智坊 API调用异常:', apiError);

      // 检查是否是AbortError（超时）
      if (apiError instanceof Error && apiError.name === 'AbortError') {
        console.log('⏰ API请求超时中止');

        // 如果已经扣除了积分，需要退还
        if (pointsDeducted && currentUserId) {
          try {
            const refundResult = await SupabasePointsService.addPoints(
              currentUserId,
              pointsCost,
              '读后续写全班共性分析超时退款'
            );

            if (refundResult) {
              console.log('💰 已退还3积分（超时退款）');
            } else {
              console.error('❌ 积分退还失败');
            }
          } catch (refundError) {
            console.error('❌ 积分退还错误:', refundError);
          }
        }

        return NextResponse.json({
          success: false,
          error: '分析请求超时，请减少作文数量或稍后重试'
        }, { status: 408 }); // 408 Request Timeout
      }

      // 检查是否是"terminated"错误（Vercel或其他服务终止）
      if (apiError instanceof Error && apiError.message.includes('terminated')) {
        console.log('🚫 API请求被服务终止:', apiError);

        // 如果已经扣除了积分，需要退还
        if (pointsDeducted && currentUserId) {
          try {
            const refundResult = await SupabasePointsService.addPoints(
              currentUserId,
              pointsCost,
              '读后续写全班共性分析服务终止退款'
            );

            if (refundResult) {
              console.log('💰 已退还3积分（服务终止退款）');
            } else {
              console.error('❌ 积分退还失败');
            }
          } catch (refundError) {
            console.error('❌ 积分退还错误:', refundError);
          }
        }

        return NextResponse.json({
          success: false,
          error: '请求处理时间过长，请减少学生数量或稍后重试'
        }, { status: 408 }); // 408 Request Timeout
      }

      // 如果已经扣除了积分，需要退还
      if (pointsDeducted && currentUserId) {
        try {
          const refundResult = await SupabasePointsService.addPoints(
            currentUserId,
            pointsCost,
            '读后续写全班共性分析失败退款'
          );

          if (refundResult) {
            console.log('💰 已退还3积分');
          } else {
            console.error('❌ 积分退还失败');
          }
        } catch (refundError) {
          console.error('❌ 积分退还错误:', refundError);
        }
      }

      return NextResponse.json({
        success: false,
        error: apiError instanceof Error ? apiError.message : '分析服务暂时不可用，请稍后重试'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('💥 共性分析API处理失败:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '分析服务暂时不可用，请稍后重试'
    }, { status: 500 });
  }
}