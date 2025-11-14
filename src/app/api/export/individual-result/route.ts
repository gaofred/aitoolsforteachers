import { NextRequest, NextResponse } from 'next/server';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';

// 处理文本换行的辅助函数
const createTextParagraphs = (text: string, fontSize: number = 22, spacingAfter: number = 200) => {
  // 按换行符分割文本
  const lines = text.split('\n');
  return lines.map(line =>
    new Paragraph({
      children: [
        new TextRun({
          text: line || ' ', // 空行用空格代替
          size: fontSize,
          font: "SimSun"
        })
      ],
      spacing: { after: spacingAfter / lines.length } // 分配间距
    })
  );
};

export async function POST(request: NextRequest) {
  try {
    const { studentName, content, gradingResult, topic, type } = await request.json();

    if (!content || !gradingResult || !studentName) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 创建Word文档
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          // 标题
          new Paragraph({
            children: [
              new TextRun({
                text: `${studentName} - 读后续写批改结果`,
                bold: true,
                size: 28,
                font: "SimSun"
              })
            ],
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 }
          }),

          // 基本信息
          new Paragraph({
            children: [
              new TextRun({
                text: `题目：${topic || '读后续写'}`,
                bold: true,
                size: 24,
                font: "SimSun"
              })
            ],
            spacing: { after: 200 }
          }),

          new Paragraph({
            children: [
              new TextRun({
                text: `得分：${gradingResult.score}/25分`,
                bold: true,
                size: 24,
                font: "SimSun"
              })
            ],
            spacing: { after: 400 }
          }),

          // 学生作文
          new Paragraph({
            children: [
              new TextRun({
                text: "学生作文：",
                bold: true,
                size: 24,
                font: "SimSun"
              })
            ],
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 200 }
          }),

          // 处理学生作文内容的换行
          ...createTextParagraphs(content, 22, 300),

          // AI批改反馈
          new Paragraph({
            children: [
              new TextRun({
                text: "AI批改反馈：",
                bold: true,
                size: 24,
                font: "SimSun"
              })
            ],
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 200 }
          }),

          // 优先显示完整反馈
          ...(gradingResult.detailedFeedback ? [
            // 处理详细反馈的换行
            ...createTextParagraphs(gradingResult.detailedFeedback, 22, 400)
          ] : [
            // 如果没有完整反馈，显示结构化反馈
            new Paragraph({
              children: [
                new TextRun({
                  text: gradingResult.feedback || '暂无反馈',
                  size: 22,
                  font: "SimSun"
                })
              ],
              spacing: { after: 300 }
            }),

            // 详细分析
            ...(gradingResult.gradingDetails ? [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "详细分析：",
                    bold: true,
                    size: 24,
                    font: "SimSun"
                  })
                ],
                heading: HeadingLevel.HEADING_3,
                spacing: { after: 200 }
              }),

              new Paragraph({
                children: [
                  new TextRun({
                    text: `内容要点分析：${gradingResult.gradingDetails.contentPoints || '无'}`,
                    size: 22,
                    font: "SimSun"
                  })
                ],
                spacing: { after: 200 }
              }),

              new Paragraph({
                children: [
                  new TextRun({
                    text: `语言错误分析：${gradingResult.gradingDetails.languageErrors || '无'}`,
                    size: 22,
                    font: "SimSun"
                  })
                ],
                spacing: { after: 200 }
              }),

              new Paragraph({
                children: [
                  new TextRun({
                    text: `逻辑问题分析：${gradingResult.gradingDetails.logicalIssues || '无'}`,
                    size: 22,
                    font: "SimSun"
                  })
                ],
                spacing: { after: 200 }
              }),

              new Paragraph({
                children: [
                  new TextRun({
                    text: `逐句分析：${gradingResult.gradingDetails.sentenceAnalysis || '无'}`,
                    size: 22,
                    font: "SimSun"
                  })
                ],
                spacing: { after: 200 }
              }),

              new Paragraph({
                children: [
                  new TextRun({
                    text: `整体评价：${gradingResult.gradingDetails.overallEvaluation || '无'}`,
                    size: 22,
                    font: "SimSun"
                  })
                ],
                spacing: { after: 400 }
              })
            ] : [])
          ]),

          ]
      }]
    });

    // 生成文档
    const buffer = await Packer.toBuffer(doc);

    // 设置响应头
    const headers = new Headers();
    headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    headers.set('Content-Disposition', `attachment; filename="student_result_${Date.now()}.docx"`);

    return new NextResponse(buffer, {
      status: 200,
      headers
    });

  } catch (error) {
    console.error('导出个人结果失败:', error);
    return NextResponse.json(
      { error: '导出失败，请稍后重试' },
      { status: 500 }
    );
  }
}