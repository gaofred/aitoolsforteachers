import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { task, stats, options } = await request.json();

    if (!task || !task.assignments) {
      return NextResponse.json(
        { error: '缺少导出数据' },
        { status: 400 }
      );
    }

    // 根据格式生成不同内容
    let content: string;
    let mimeType: string;
    let filename: string;

    switch (options.format) {
      case 'word':
        content = generateWordContent(task, stats, options);
        mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        filename = `批量润色结果_${new Date().toLocaleDateString()}.docx`;
        break;
      case 'excel':
        content = generateExcelContent(task, stats, options);
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        filename = `批量润色结果_${new Date().toLocaleDateString()}.xlsx`;
        break;
      case 'pdf':
        content = generatePDFContent(task, stats, options);
        mimeType = 'application/pdf';
        filename = `批量润色结果_${new Date().toLocaleDateString()}.pdf`;
        break;
      default:
        content = generateTextContent(task, stats, options);
        mimeType = 'text/plain';
        filename = `批量润色结果_${new Date().toLocaleDateString()}.txt`;
    }

    // 返回文件内容（简化版本，实际应用中可能需要使用专门的库）
    const buffer = Buffer.from(content, 'utf-8');

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    });

  } catch (error) {
    console.error('导出失败:', error);
    return NextResponse.json(
      { error: '导出失败，请稍后重试' },
      { status: 500 }
    );
  }
}

// 生成Word格式内容
function generateWordContent(task: any, stats: any, options: any): string {
  let content = `
# 批量润色结果报告

**生成时间：** ${new Date().toLocaleString()}
**处理学生：** ${task.assignments.length} 名
**处理句子：** ${stats.totalSentences} 句
**优化句子：** ${stats.polishedSentences} 句
**处理时间：** ${(stats.processingTime / 1000).toFixed(1)} 秒
**消耗积分：** ${task.pointsCost} 点

`;

  if (options.template === 'table') {
    content += generateTableFormat(task, options);
  } else if (options.template === 'list') {
    content += generateListFormat(task, options);
  } else {
    content += generateDetailedFormat(task, options);
  }

  return content;
}

// 生成Excel格式内容
function generateExcelContent(task: any, stats: any, options: any): string {
  let content = `学生姓名,句子编号,${options.includeOriginal ? '原句,' : ''}润色后${options.includeExplanation ? ',修改说明' : ''},质量评分,状态\n`;

  task.assignments.forEach((assignment: any) => {
    assignment.polishedSentences.forEach((sentence: any, index: number) => {
      const hasChanges = sentence.original !== sentence.polished;
      const status = hasChanges ? '已优化' : '保持原句';

      content += `"${assignment.student.name}",${index + 1},`;

      if (options.includeOriginal) {
        content += `"${sentence.original}",`;
      }

      content += `"${sentence.polished}"`;

      if (options.includeExplanation) {
        content += `,"${sentence.explanation || ''}"`;
      }

      content += `,${Math.round(sentence.confidence * 100)}%,${status}\n`;
    });
  });

  return content;
}

// 生成PDF格式内容
function generatePDFContent(task: any, stats: any, options: any): string {
  // 简化的PDF内容（实际应用中需要使用专门的PDF库）
  return generateWordContent(task, stats, options);
}

// 生成文本格式内容
function generateTextContent(task: any, stats: any, options: any): string {
  let content = `批量润色结果报告
====================
生成时间: ${new Date().toLocaleString()}
处理学生: ${task.assignments.length} 名
处理句子: ${stats.totalSentences} 句
优化句子: ${stats.polishedSentences} 句
处理时间: ${(stats.processingTime / 1000).toFixed(1)} 秒
消耗积分: ${task.pointsCost} 点

`;

  if (options.template === 'table') {
    content += generateTableFormat(task, options);
  } else if (options.template === 'list') {
    content += generateListFormat(task, options);
  } else {
    content += generateDetailedFormat(task, options);
  }

  return content;
}

// 表格格式
function generateTableFormat(task: any, options: any): string {
  let content = `

## 结果表格

| 学生姓名 | 句子编号 | ${options.includeOriginal ? '原句 | ' : ''}润色后 | ${options.includeExplanation ? '修改说明 | ' : ''}质量评分 | 状态 |
|---------|---------|${options.includeOriginal ? '-------|' : ''}--------|${options.includeExplanation ? '----------|' : ''}----------|------|
`;

  task.assignments.forEach((assignment: any) => {
    assignment.polishedSentences.forEach((sentence: any, index: number) => {
      const hasChanges = sentence.original !== sentence.polished;
      const status = hasChanges ? '已优化' : '保持原句';

      content += `| ${assignment.student.name} | #${index + 1} | `;

      if (options.includeOriginal) {
        content += `${sentence.original} | `;
      }

      content += `${sentence.polished} | `;

      if (options.includeExplanation) {
        content += `${sentence.explanation || ''} | `;
      }

      content += `${Math.round(sentence.confidence * 100)}% | ${status} |\n`;
    });
  });

  return content;
}

// 列表格式
function generateListFormat(task: any, options: any): string {
  let content = `

## 学生润色结果

`;

  task.assignments.forEach((assignment: any) => {
    content += `### ${assignment.student.name}
`;

    assignment.polishedSentences.forEach((sentence: any, index: number) => {
      const hasChanges = sentence.original !== sentence.polished;

      content += `${index + 1}. **润色后**: ${sentence.polished}\n`;

      if (options.includeOriginal) {
        content += `   **原句**: ${sentence.original}\n`;
      }

      if (options.includeExplanation && sentence.explanation) {
        content += `   **说明**: ${sentence.explanation}\n`;
      }

      content += `   **状态**: ${hasChanges ? '✅ 已优化' : '⚪ 保持原句'}\n\n`;
    });

    content += '\n';
  });

  return content;
}

// 详细格式
function generateDetailedFormat(task: any, options: any): string {
  let content = `

## 详细分析报告

`;

  task.assignments.forEach((assignment: any) => {
    const improvedCount = assignment.polishedSentences.filter((s: any) => s.original !== s.polished).length;
    const totalCount = assignment.polishedSentences.length;

    content += `### ${assignment.student.name} (${improvedCount}/${totalCount} 句优化)
`;

    assignment.polishedSentences.forEach((sentence: any, index: number) => {
      const hasChanges = sentence.original !== sentence.polished;

      content += `
#### 句子 ${index + 1}

**状态**: ${hasChanges ? '✅ 已优化' : '⚪ 保持原句'}
**质量评分**: ${Math.round(sentence.confidence * 100)}%

`;

      if (options.includeOriginal) {
        content += `**原句**:
${sentence.original}

`;
      }

      content += `**润色后**:
${sentence.polished}

`;

      if (options.includeExplanation && sentence.explanation) {
        content += `**修改说明**: ${sentence.explanation}

`;
      }

      if (hasChanges && sentence.changes && sentence.changes.length > 0) {
        content += `**主要变化**:
`;
        sentence.changes.forEach((change: any) => {
          content += `- ${change.reason}\n`;
        });
        content += '\n';
      }
    });

    content += '---\n\n';
  });

  return content;
}