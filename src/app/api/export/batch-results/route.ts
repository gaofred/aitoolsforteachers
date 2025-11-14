import { NextRequest, NextResponse } from 'next/server';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import JSZip from 'jszip';

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
    const { taskTitle, topic, assignments, stats, type } = await request.json();

    // 添加调试信息
    console.log('🔍 批量导出API调试信息:', {
      接收到的作业数量: assignments?.length || 0,
      作业数组: assignments?.map(a => ({
        学生姓名: a.student?.name,
        有批改结果: !!a.gradingResult,
        批改分数: a.gradingResult?.score
      }))
    });

    if (!assignments || assignments.length === 0) {
      return NextResponse.json(
        { error: '没有可导出的批改结果' },
        { status: 400 }
      );
    }

    // 创建一个JSZip实例
    const zip = new JSZip();
    let processedCount = 0; // 计数器

    // 为每个学生生成Word文档
    for (const assignment of assignments) {
      if (!assignment.gradingResult) {
        console.log(`⚠️ 跳过学生 ${assignment.student?.name}：没有批改结果`);
        continue;
      }

      console.log(`📝 正在处理学生: ${assignment.student?.name}`);
      processedCount++;

      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            // 标题
            new Paragraph({
              children: [
                new TextRun({
                  text: `${assignment.student.name} - 读后续写批改结果`,
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
                  text: `得分：${assignment.gradingResult.score}/25分`,
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
            ...createTextParagraphs(assignment.ocrResult.editedText || assignment.ocrResult.content, 22, 300),

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
            ...(assignment.gradingResult.detailedFeedback ? [
              // 处理详细反馈的换行
              ...createTextParagraphs(assignment.gradingResult.detailedFeedback, 22, 400)
            ] : [
              // 如果没有完整反馈，显示结构化反馈
              new Paragraph({
                children: [
                  new TextRun({
                    text: assignment.gradingResult.feedback || '暂无反馈',
                    size: 22,
                    font: "SimSun"
                  })
                ],
                spacing: { after: 300 }
              }),

              // 详细分析
              ...(assignment.gradingResult.gradingDetails ? [
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
                      text: `内容要点分析：${assignment.gradingResult.gradingDetails.contentPoints || '无'}`,
                      size: 22,
                      font: "SimSun"
                    })
                ],
                spacing: { after: 200 }
                }),

                new Paragraph({
                  children: [
                    new TextRun({
                      text: `语言错误分析：${assignment.gradingResult.gradingDetails.languageErrors || '无'}`,
                      size: 22,
                      font: "SimSun"
                    })
                ],
                spacing: { after: 200 }
                }),

                new Paragraph({
                  children: [
                    new TextRun({
                      text: `逻辑问题分析：${assignment.gradingResult.gradingDetails.logicalIssues || '无'}`,
                      size: 22,
                      font: "SimSun"
                    })
                ],
                spacing: { after: 200 }
                }),

                new Paragraph({
                  children: [
                    new TextRun({
                      text: `逐句分析：${assignment.gradingResult.gradingDetails.sentenceAnalysis || '无'}`,
                      size: 22,
                      font: "SimSun"
                    })
                ],
                spacing: { after: 200 }
                }),

                new Paragraph({
                  children: [
                    new TextRun({
                      text: `整体评价：${assignment.gradingResult.gradingDetails.overallEvaluation || '无'}`,
                      size: 22,
                      font: "SimSun"
                    })
                ],
                spacing: { after: 400 }
                })
              ] : [])
            ])
          ]
        }]
      });

      // 生成文档
      const buffer = await Packer.toBuffer(doc);

      // 添加到ZIP文件 - 使用唯一的文件名避免重名覆盖
      const fileName = `student_${assignment.student.name || 'unknown'}_${assignment.student.id || assignment.id || processedCount}_result.docx`;
      console.log(`📄 生成文档: ${fileName}`);
      zip.file(fileName, buffer);
    }

    // 生成ZIP文件
    console.log(`📦 开始生成ZIP文件，已处理 ${processedCount} 个学生`);
    const zipBuffer = await zip.generateAsync({ type: 'uint8array' });
    console.log(`✅ ZIP文件生成成功，包含 ${processedCount} 个学生文档`);

    // 设置响应头
    const headers = new Headers();
    headers.set('Content-Type', 'application/zip');
    headers.set('Content-Disposition', `attachment; filename="batch_results_${Date.now()}.zip"`);

    return new NextResponse(zipBuffer, {
      status: 200,
      headers
    });

  } catch (error) {
    console.error('批量导出失败:', error);
    return NextResponse.json(
      { error: '导出失败，请稍后重试' },
      { status: 500 }
    );
  }
}