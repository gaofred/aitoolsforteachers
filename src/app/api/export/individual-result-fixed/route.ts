import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { studentName, content, gradingResult, topic, type } = await request.json();

    if (!content || !gradingResult || !studentName) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 生成简单清晰的文本格式
    const textContent = `${'='.repeat(80)}
${studentName} - 读后续写批改结果
${'='.repeat(80)}

生成时间：${new Date().toLocaleString()}

【基本信息】
题目：${topic || '读后续写'}
得分：${gradingResult.score}/25分

【学生作文】
${content}

【AI批改反馈】
${gradingResult.detailedFeedback || gradingResult.feedback || '暂无反馈'}

${gradingResult.gradingDetails ? `
【详细分析】
内容要点分析：${gradingResult.gradingDetails.contentPoints || '无'}

语言错误分析：${gradingResult.gradingDetails.languageErrors || '无'}

逻辑问题分析：${gradingResult.gradingDetails.logicalIssues || '无'}

逐句分析：${gradingResult.gradingDetails.sentenceAnalysis || '无'}

整体评价：${gradingResult.gradingDetails.overallEvaluation || '无'}
` : ''}

${'='.repeat(80)}
结束
${'='.repeat(80)}`;

    const filename = `${studentName}_读后续写批改结果_${Date.now()}.txt`;

    return new NextResponse(textContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('导出个人结果失败:', error);
    return NextResponse.json(
      { error: '导出失败，请稍后重试' },
      { status: 500 }
    );
  }
}