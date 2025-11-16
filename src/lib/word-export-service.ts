import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';

export interface WordExportOptions {
  title?: string;
  author?: string;
  subject?: string;
}

// Word导出服务
export class WordExportService {
  // 导出K12解题结果为Word文档
  static async exportK12Solution(
    content: string,
    options: WordExportOptions = {}
  ): Promise<void> {
    const {
      title = 'K12学科解题解析',
      author = '英语AI教学工具',
      subject = '学科解析报告'
    } = options;

    // 创建文档
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          // 标题
          new Paragraph({
            children: [
              new TextRun({
                text: title,
                bold: true,
                size: 32,
                color: {
                  argb: '2E5984' // 蓝色
                }
              })
            ],
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: {
              after: 400
            }
          }),

          // 元信息
          new Paragraph({
            children: [
              new TextRun({
                text: `生成时间：${new Date().toLocaleString('zh-CN')}`,
                size: 20,
                color: {
                  argb: '666666'
                }
              })
            ],
            spacing: {
              after: 200
            }
          }),

          // 内容处理
          ...this.parseContentToParagraphs(content)
        ]
      }]
    });

    // 生成文档
    const buffer = await Packer.toBuffer(doc);

    // 保存文件
    const fileName = `${title}_${new Date().getTime()}.docx`;
    saveAs(new Blob([buffer]), fileName);
  }

  // 解析内容为Word段落
  private static parseContentToParagraphs(content: string): Paragraph[] {
    const paragraphs: Paragraph[] = [];
    const lines = content.split('\n');

    lines.forEach(line => {
      const trimmedLine = line.trim();

      if (!trimmedLine) {
        // 空行
        paragraphs.push(new Paragraph({
          children: [],
          spacing: {
            after: 200
          }
        }));
        return;
      }

      // 检查是否为标题（## 开头或【...】开头）
      if (trimmedLine.startsWith('## ')) {
        // Markdown标题
        const titleText = trimmedLine.replace('## ', '');
        paragraphs.push(new Paragraph({
          children: [
            new TextRun({
              text: titleText,
              bold: true,
              size: 24,
              color: {
                argb: '2E5984' // 蓝色
              }
            })
          ],
          heading: HeadingLevel.HEADING_1,
          spacing: {
            before: 400,
            after: 200
          }
        }));
      } else if (trimmedLine.startsWith('【') && trimmedLine.endsWith('】')) {
        // 括号标题
        paragraphs.push(new Paragraph({
          children: [
            new TextRun({
              text: trimmedLine,
              bold: true,
              size: 22,
              color: {
                argb: '1F4788' // 深蓝色
              }
            })
          ],
          spacing: {
            before: 300,
            after: 150
          }
        }));
      } else if (trimmedLine.startsWith('### 【')) {
        // 三级标题
        paragraphs.push(new Paragraph({
          children: [
            new TextRun({
              text: trimmedLine,
              bold: true,
              size: 20,
              color: {
                argb: '1F4788' // 深蓝色
              }
            })
          ],
          spacing: {
            before: 200,
            after: 100
          }
        }));
      } else if (trimmedLine.startsWith('**') && trimmedLine.endsWith('**：')) {
        // 粗体标题
        const titleText = trimmedLine.slice(2, -2);
        paragraphs.push(new Paragraph({
          children: [
            new TextRun({
              text: titleText,
              bold: true,
              size: 20,
              color: {
                argb: '1F4788' // 深蓝色
              }
            })
          ],
          spacing: {
            before: 200,
            after: 100
          }
        }));
      } else if (trimmedLine.startsWith('- ')) {
        // 列表项
        paragraphs.push(new Paragraph({
          children: [
            new TextRun({
              text: trimmedLine,
              size: 20
            })
          ],
          spacing: {
            before: 100,
            after: 50,
            left: 720 // 缩进
          }
        }));
      } else if (trimmedLine.match(/^\d+\./)) {
        // 数字列表
        paragraphs.push(new Paragraph({
          children: [
            new TextRun({
              text: trimmedLine,
              size: 20
            })
          ],
          spacing: {
            before: 100,
            after: 50,
            left: 720 // 缩进
          }
        }));
      } else {
        // 普通段落
        paragraphs.push(this.createTextParagraph(trimmedLine));
      }
    });

    return paragraphs;
  }

  // 创建文本段落（支持简单的数学公式格式）
  private static createTextParagraph(text: string): Paragraph {
    const textRuns: TextRun[] = [];
    let currentText = text;

    // 简单处理行内公式 $...$
    const mathPattern = /\$([^$]+)\$/g;
    let lastIndex = 0;
    let match;

    while ((match = mathPattern.exec(currentText)) !== null) {
      // 添加公式前的文本
      if (match.index > lastIndex) {
        const beforeText = currentText.substring(lastIndex, match.index);
        textRuns.push(new TextRun({
          text: beforeText,
          size: 20
        }));
      }

      // 添加公式（使用斜体和特殊颜色）
      const mathText = match[1];
      textRuns.push(new TextRun({
        text: mathText,
        italics: true,
        size: 20,
        color: {
          argb: 'D35400' // 橙色，用于标识数学公式
        }
      }));

      lastIndex = match.index + match[0].length;
    }

    // 添加剩余文本
    if (lastIndex < currentText.length) {
      const remainingText = currentText.substring(lastIndex);
      textRuns.push(new TextRun({
        text: remainingText,
        size: 20
      }));
    }

    // 如果没有匹配到公式，整个文本作为普通文本
    if (textRuns.length === 0) {
      textRuns.push(new TextRun({
        text: text,
        size: 20
      }));
    }

    return new Paragraph({
      children: textRuns,
      spacing: {
        after: 150
      }
    });
  }
}

export default WordExportService;