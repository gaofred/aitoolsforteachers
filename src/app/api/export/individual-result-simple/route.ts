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

    // 生成RTF格式文档
    const escapeRTF = (text: string) => {
      return text
        .replace(/\\/g, '\\\\')
        .replace(/{/g, '\\{')
        .replace(/}/g, '\\}')
        .replace(/\n/g, '\\line ')
        .replace(/\r\n/g, '\\line ')
        .replace(/\r/g, '\\line ');
    };

    const rtfContent = `{\\rtf1\\ansi\\ansicpg1252\\deff0
{\\fonttbl{\\f0 Times New Roman;}}
{\\colortbl;\\red0\\green0\\blue0;}
\\f0\\fs24
{\\b\\fs32 ${escapeRTF(studentName + ' - 读后续写批改结果')}\\b0\\fs24\\par
\\par
{\\b 题目：${escapeRTF(topic || '读后续写')}\\b0\\par
{\\b 得分：${escapeRTF(gradingResult.score + '/25分')}\\b0\\par
\\par
{\\b\\fs28 学生作文：\\b0\\fs24\\par
${escapeRTF(content)}\\par
\\par
{\\b\\fs28 AI批改反馈：\\b0\\fs24\\par
${escapeRTF(gradingResult.detailedFeedback || gradingResult.feedback || '暂无反馈')}\\par
${gradingResult.gradingDetails ? `
\\par
{\\b\\fs28 详细分析：\\b0\\fs24\\par
{\\b 内容要点分析：\\b0 ${escapeRTF(gradingResult.gradingDetails.contentPoints || '无')}\\par
{\\b 语言错误分析：\\b0 ${escapeRTF(gradingResult.gradingDetails.languageErrors || '无')}\\par
{\\b 逻辑问题分析：\\b0 ${escapeRTF(gradingResult.gradingDetails.logicalIssues || '无')}\\par
{\\b 逐句分析：\\b0 ${escapeRTF(gradingResult.gradingDetails.sentenceAnalysis || '无')}\\par
{\\b 整体评价：\\b0 ${escapeRTF(gradingResult.gradingDetails.overallEvaluation || '无')}\\par
` : ''}
}`;

    const filename = `${studentName}_读后续写批改结果_${Date.now()}.rtf`;

    return new NextResponse(rtfContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/rtf',
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