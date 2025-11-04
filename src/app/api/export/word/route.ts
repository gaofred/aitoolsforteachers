import { NextRequest, NextResponse } from 'next/server';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';

export async function POST(request: NextRequest) {
  try {
    const { content, title } = await request.json();

    if (!content) {
      return NextResponse.json(
        { error: '请提供要导出的内容' },
        { status: 400 }
      );
    }

    // 创建Word文档
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          // 标题段落
          new Paragraph({
            children: [
              new TextRun({
                text: title || '批量应用文批改结果',
                bold: true,
                size: 12, // 标题字号稍大
                font: "SimSun" // 使用宋体
              })
            ],
            alignment: AlignmentType.CENTER,
            spacing: {
              before: 200, // 段前间距 (twips, 1twip = 1/1440 inch)
              after: 200   // 段后间距
            }
          }),

          // 空行
          new Paragraph({
            children: [new TextRun({ text: "", size: 10, font: "SimSun" })],
            spacing: {
              before: 0,
              after: 0
            }
          })
        ]
      }]
    });

    // 处理内容：分割成段落
    const paragraphs = content.split('\n').filter(line => line.trim().length > 0);

    paragraphs.forEach((paragraphText) => {
      const paragraph = new Paragraph({
        children: [
          new TextRun({
            text: paragraphText,
            size: 10,    // 设置字号为10
            font: "SimSun", // 使用宋体
            spacing: {
              line: 11 // 设置行距为11
            }
          })
        ],
        spacing: {
          before: 0, // 段前间距为0
          after: 0    // 段后间距为0
        },
        indent: {
          firstLine: 0 // 首行缩进
        }
      });

      doc.addParagraph(paragraph);
    });

    // 生成Word文档
    const buffer = await Packer.toBuffer(doc);

    // 设置响应头
    const filename = `${(title || '批量应用文批改结果').replace(/[^\w\u4e00-\u9fa5]/g, '')}_${Date.now()}.docx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
    });

  } catch (error) {
    console.error('导出Word文档失败:', error);
    return NextResponse.json(
      { error: '导出失败，请稍后重试' },
      { status: 500 }
    );
  }
}
