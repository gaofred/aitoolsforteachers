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
          })
      ],
      spacing: { after: spacingAfter / lines.length } // 分配间距
    })
  );
};

// 为单个学生创建Word内容
const createStudentContent = (assignment, topic) => {
  const { student, gradingResult, ocrResult } = assignment;

  return [
    // 学生分隔页
    new Paragraph({
      children: [
        new TextRun({
          text: '='.repeat(80),
          size: 16,
          color: "CCCCCC",
        })
      ],
      spacing: { before: 400, after: 200 }
    }),

    new Paragraph({
      children: [
        new TextRun({
          text: `${student.name} - 读后续写批改结果`,
          bold: true,
          size: 28,
        })
      ],
      heading: HeadingLevel.HEADING_1,
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
        })
      ],
      heading: HeadingLevel.HEADING_2,
      spacing: { after: 200 }
    }),

    // 处理学生作文内容的换行
    ...createTextParagraphs(ocrResult.editedText || ocrResult.content, 22, 300),

    // AI批改反馈
    new Paragraph({
      children: [
        new TextRun({
          text: "AI批改反馈：",
          bold: true,
          size: 24,
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
            })
          ],
          spacing: { after: 200 }
        }),

        new Paragraph({
          children: [
            new TextRun({
              text: `语言错误分析：${gradingResult.gradingDetails.languageErrors || '无'}`,
              size: 22,
            })
          ],
          spacing: { after: 200 }
        }),

        new Paragraph({
          children: [
            new TextRun({
              text: `逻辑问题分析：${gradingResult.gradingDetails.logicalIssues || '无'}`,
              size: 22,
            })
          ],
          spacing: { after: 200 }
        }),

        new Paragraph({
          children: [
            new TextRun({
              text: `逐句分析：${gradingResult.gradingDetails.sentenceAnalysis || '无'}`,
              size: 22,
            })
          ],
          spacing: { after: 200 }
        }),

        new Paragraph({
          children: [
            new TextRun({
              text: `整体评价：${gradingResult.gradingDetails.overallEvaluation || '无'}`,
              size: 22,
            })
          ],
          spacing: { after: 600 }
        })
      ] : [])
    ])
  ];
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

    // 准备Word文档的所有学生内容
    let allStudentContent = [];
    let processedCount = 0;

    // 添加文档标题
    allStudentContent.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${taskTitle || '读后续写'} - 全班批改结果汇总`,
            bold: true,
            size: 32,
          })
        ],
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 600 }
      }),

      new Paragraph({
        children: [
          new TextRun({
            text: `生成时间：${new Date().toLocaleString()}`,
            bold: true,
            size: 24,
          })
        ],
        spacing: { after: 400 }
      }),

      new Paragraph({
        children: [
          new TextRun({
            text: `题目：${topic || '读后续写'}`,
            bold: true,
            size: 24,
          })
        ],
        spacing: { after: 400 }
      }),

      new Paragraph({
        children: [
          new TextRun({
            text: `总人数：${stats.totalStudents}人`,
            bold: true,
            size: 24,
          })
        ],
        spacing: { after: 200 }
      }),

      new Paragraph({
        children: [
          new TextRun({
            text: `平均分：${stats.averageScore.toFixed(2)}分`,
            bold: true,
            size: 24,
          })
        ],
        spacing: { after: 400 }
      })
    );

    // 为每个学生添加内容
    for (const assignment of assignments) {
      if (!assignment.gradingResult) {
        console.log(`⚠️ 跳过学生 ${assignment.student?.name}：没有批改结果`);
        continue;
      }

      console.log(`📝 正在处理学生: ${assignment.student?.name}`);
      processedCount++;

      // 添加学生内容
      allStudentContent.push(...createStudentContent(assignment, topic));
    }

    // 创建一个大的Word文档
    const doc = new Document({
      sections: [{
        properties: {},
        children: allStudentContent
      }]
    });

    // 生成文档
    console.log(`📄 开始生成Word文档，包含 ${processedCount} 个学生`);
    const buffer = await Packer.toBuffer(doc);
    console.log(`✅ Word文档生成成功，包含 ${processedCount} 个学生`);

    // 设置响应头
    const headers = new Headers();
    headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    const filename = `${taskTitle || '读后续写'}_全班批改结果_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.docx`;
    headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);

    return new NextResponse(buffer, {
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