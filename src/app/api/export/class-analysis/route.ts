import { NextRequest, NextResponse } from 'next/server';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType } from 'docx';

export async function POST(request: NextRequest) {
  try {
    const { taskTitle, topic, assignments, stats, type } = await request.json();

    if (!assignments || assignments.length === 0) {
      return NextResponse.json(
        { error: '没有可导出的批改结果' },
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
                text: `${taskTitle || '读后续写'} - 班级分析报告`,
                bold: true,
                size: 32,
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
                text: `生成时间：${new Date().toLocaleDateString()}`,
                bold: true,
                size: 24,
                font: "SimSun"
              })
            ],
            spacing: { after: 400 }
          }),

          // 统计数据
          new Paragraph({
            children: [
              new TextRun({
                text: "一、班级总体情况",
                bold: true,
                size: 28,
                font: "SimSun"
              })
            ],
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 300 }
          }),

          new Paragraph({
            children: [
              new TextRun({
                text: `总人数：${stats.totalStudents}人`,
                size: 24,
                font: "SimSun"
              })
            ],
            spacing: { after: 200 }
          }),

          new Paragraph({
            children: [
              new TextRun({
                text: `平均分：${stats.averageScore.toFixed(2)}分`,
                size: 24,
                font: "SimSun"
              })
            ],
            spacing: { after: 200 }
          }),

          new Paragraph({
            children: [
              new TextRun({
                text: `最高分：${stats.maxScore}分，最低分：${stats.minScore}分`,
                size: 24,
                font: "SimSun"
              })
            ],
            spacing: { after: 200 }
          }),

          new Paragraph({
            children: [
              new TextRun({
                text: `优秀（${type === 'continuation-writing' ? '13分以上' : '20分以上'}）：${stats.excellentCount}人`,
                size: 24,
                font: "SimSun"
              })
            ],
            spacing: { after: 200 }
          }),

          new Paragraph({
            children: [
              new TextRun({
                text: `良好（${type === 'continuation-writing' ? '10-12分' : '16-19分'}）：${stats.goodCount}人`,
                size: 24,
                font: "SimSun"
              })
            ],
            spacing: { after: 200 }
          }),

          new Paragraph({
            children: [
              new TextRun({
                text: `及格（${type === 'continuation-writing' ? '7-9分' : '12-15分'}）：${stats.passCount}人`,
                size: 24,
                font: "SimSun"
              })
            ],
            spacing: { after: 200 }
          }),

          new Paragraph({
            children: [
              new TextRun({
                text: `不及格：${stats.failCount}人`,
                size: 24,
                font: "SimSun"
              })
            ],
            spacing: { after: 400 }
          }),

          // 成绩分布
          new Paragraph({
            children: [
              new TextRun({
                text: "二、成绩分布",
                bold: true,
                size: 28,
                font: "SimSun"
              })
            ],
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 300 }
          }),

          new Table({
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({
                      children: [new TextRun({ text: "分数段", bold: true, size: 22, font: "SimSun" })]
                    })],
                    width: { size: 25, type: WidthType.PERCENTAGE }
                  }),
                  new TableCell({
                    children: [new Paragraph({
                      children: [new TextRun({ text: "人数", bold: true, size: 22, font: "SimSun" })]
                    })],
                    width: { size: 25, type: WidthType.PERCENTAGE }
                  }),
                  new TableCell({
                    children: [new Paragraph({
                      children: [new TextRun({ text: "比例", bold: true, size: 22, font: "SimSun" })]
                    })],
                    width: { size: 25, type: WidthType.PERCENTAGE }
                  })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({
                      children: [new TextRun({ text: type === 'continuation-writing' ? "13-15分" : "20-25分", size: 22, font: "SimSun" })]
                    })],
                    width: { size: 25, type: WidthType.PERCENTAGE }
                  }),
                  new TableCell({
                    children: [new Paragraph({
                      children: [new TextRun({ text: stats.excellentCount.toString(), size: 22, font: "SimSun" })]
                    })],
                    width: { size: 25, type: WidthType.PERCENTAGE }
                  }),
                  new TableCell({
                    children: [new Paragraph({
                      children: [new TextRun({ text: `${((stats.excellentCount / stats.totalStudents) * 100).toFixed(1)}%`, size: 22, font: "SimSun" })]
                    })],
                    width: { size: 25, type: WidthType.PERCENTAGE }
                  })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({
                      children: [new TextRun({ text: type === 'continuation-writing' ? "10-12分" : "16-19分", size: 22, font: "SimSun" })]
                    })],
                    width: { size: 25, type: WidthType.PERCENTAGE }
                  }),
                  new TableCell({
                    children: [new Paragraph({
                      children: [new TextRun({ text: stats.goodCount.toString(), size: 22, font: "SimSun" })]
                    })],
                    width: { size: 25, type: WidthType.PERCENTAGE }
                  }),
                  new TableCell({
                    children: [new Paragraph({
                      children: [new TextRun({ text: `${((stats.goodCount / stats.totalStudents) * 100).toFixed(1)}%`, size: 22, font: "SimSun" })]
                    })],
                    width: { size: 25, type: WidthType.PERCENTAGE }
                  })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({
                      children: [new TextRun({ text: type === 'continuation-writing' ? "7-9分" : "12-15分", size: 22, font: "SimSun" })]
                    })],
                    width: { size: 25, type: WidthType.PERCENTAGE }
                  }),
                  new TableCell({
                    children: [new Paragraph({
                      children: [new TextRun({ text: stats.passCount.toString(), size: 22, font: "SimSun" })]
                    })],
                    width: { size: 25, type: WidthType.PERCENTAGE }
                  }),
                  new TableCell({
                    children: [new Paragraph({
                      children: [new TextRun({ text: `${((stats.passCount / stats.totalStudents) * 100).toFixed(1)}%`, size: 22, font: "SimSun" })]
                    })],
                    width: { size: 25, type: WidthType.PERCENTAGE }
                  })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({
                      children: [new TextRun({ text: type === 'continuation-writing' ? "0-6分" : "0-11分", size: 22, font: "SimSun" })]
                    })],
                    width: { size: 25, type: WidthType.PERCENTAGE }
                  }),
                  new TableCell({
                    children: [new Paragraph({
                      children: [new TextRun({ text: stats.failCount.toString(), size: 22, font: "SimSun" })]
                    })],
                    width: { size: 25, type: WidthType.PERCENTAGE }
                  }),
                  new TableCell({
                    children: [new Paragraph({
                      children: [new TextRun({ text: `${((stats.failCount / stats.totalStudents) * 100).toFixed(1)}%`, size: 22, font: "SimSun" })]
                    })],
                    width: { size: 25, type: WidthType.PERCENTAGE }
                  })
                ]
              })
            ]
          }),

          // 学生成绩明细
          new Paragraph({
            children: [
              new TextRun({
                text: "三、学生成绩明细",
                bold: true,
                size: 28,
                font: "SimSun"
              })
            ],
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 300 }
          }),

          // 成绩明细表格
          new Table({
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({
                      children: [new TextRun({ text: "姓名", bold: true, size: 22, font: "SimSun" })]
                    })],
                    width: { size: 25, type: WidthType.PERCENTAGE }
                  }),
                  new TableCell({
                    children: [new Paragraph({
                      children: [new TextRun({ text: "分数", bold: true, size: 22, font: "SimSun" })]
                    })],
                    width: { size: 25, type: WidthType.PERCENTAGE }
                  }),
                  new TableCell({
                    children: [new Paragraph({
                      children: [new TextRun({ text: "等级", bold: true, size: 22, font: "SimSun" })]
                    })],
                    width: { size: 25, type: WidthType.PERCENTAGE }
                  })
                ]
              }),
              ...assignments.map((assignment: any) => {
                const score = assignment.gradingResult?.score || 0;
                const level = score >= (type === 'continuation-writing' ? 13 : 20) ? '优秀' :
                            score >= (type === 'continuation-writing' ? 10 : 16) ? '良好' :
                            score >= (type === 'continuation-writing' ? 7 : 12) ? '及格' : '不及格';

                return new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({
                        children: [new TextRun({ text: assignment.student.name || '未知', size: 22, font: "SimSun" })]
                    })],
                    width: { size: 25, type: WidthType.PERCENTAGE }
                    }),
                    new TableCell({
                      children: [new Paragraph({
                        children: [new TextRun({ text: score.toString(), size: 22, font: "SimSun" })]
                    })],
                    width: { size: 25, type: WidthType.PERCENTAGE }
                    }),
                    new TableCell({
                      children: [new Paragraph({
                        children: [new TextRun({ text: level, size: 22, font: "SimSun" })]
                    })],
                    width: { size: 25, type: WidthType.PERCENTAGE }
                    })
                  ]
                });
              })
            ]
          })
        ]
      }]
    });

    // 生成文档
    const buffer = await Packer.toBuffer(doc);

    // 设置响应头
    const headers = new Headers();
    headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    headers.set('Content-Disposition', `attachment; filename="class_analysis_report_${Date.now()}.docx"`);

    return new NextResponse(buffer, {
      status: 200,
      headers
    });

  } catch (error) {
    console.error('导出班级分析报告失败:', error);
    return NextResponse.json(
      { error: '导出失败，请稍后重试' },
      { status: 500 }
    );
  }
}