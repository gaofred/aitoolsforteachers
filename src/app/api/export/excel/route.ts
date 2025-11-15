import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function POST(request: NextRequest) {
  try {
    const { taskTitle, topic, assignments, stats, type } = await request.json();

    if (!assignments || assignments.length === 0) {
      return NextResponse.json(
        { error: '没有可导出的批改结果' },
        { status: 400 }
      );
    }

    // 准备Excel数据
    const excelData = [
      // 表头
      ['序号', '学生姓名', '分数', '等级', '状态'],
    ];

    // 添加学生数据
    assignments.forEach((assignment, index) => {
      const score = assignment.gradingResult?.score || 0;
      const level = getScoreLevel(score, type);

      excelData.push([
        index + 1,
        assignment.student.name || '未知',
        score,
        level.text,
        assignment.status === 'completed' ? '已完成' : '未完成'
      ]);
    });

    // 添加统计信息
    excelData.push([]);
    excelData.push(['统计信息', '', '', '', '']);
    excelData.push(['总人数', stats.totalStudents, '', '', '']);
    excelData.push(['平均分', stats.averageScore.toFixed(2), '', '', '']);
    excelData.push(['最高分', stats.maxScore, '', '', '']);
    excelData.push(['最低分', stats.minScore, '', '', '']);
    excelData.push(['优秀人数', stats.excellentCount, '', '', '']);
    excelData.push(['良好人数', stats.goodCount, '', '', '']);
    excelData.push(['及格人数', stats.passCount, '', '', '']);
    excelData.push(['不及格人数', stats.failCount, '', '', '']);

    // 添加成绩分布
    excelData.push([]);
    excelData.push(['成绩分布', '', '', '', '']);
    if (type === 'continuation-writing') {
      excelData.push(['13-15分（优秀）', stats.excellentCount, `${((stats.excellentCount / stats.totalStudents) * 100).toFixed(1)}%`, '', '']);
      excelData.push(['10-12分（良好）', stats.goodCount, `${((stats.goodCount / stats.totalStudents) * 100).toFixed(1)}%`, '', '']);
      excelData.push(['7-9分（及格）', stats.passCount, `${((stats.passCount / stats.totalStudents) * 100).toFixed(1)}%`, '', '']);
      excelData.push(['0-6分（不及格）', stats.failCount, `${((stats.failCount / stats.totalStudents) * 100).toFixed(1)}%`, '', '']);
    } else {
      excelData.push(['20-25分（优秀）', stats.excellentCount, `${((stats.excellentCount / stats.totalStudents) * 100).toFixed(1)}%`, '', '']);
      excelData.push(['16-19分（良好）', stats.goodCount, `${((stats.goodCount / stats.totalStudents) * 100).toFixed(1)}%`, '', '']);
      excelData.push(['12-15分（及格）', stats.passCount, `${((stats.passCount / stats.totalStudents) * 100).toFixed(1)}%`, '', '']);
      excelData.push(['0-11分（不及格）', stats.failCount, `${((stats.failCount / stats.totalStudents) * 100).toFixed(1)}%`, '', '']);
    }

    // 创建工作簿
    const ws = XLSX.utils.aoa_to_sheet(excelData);

    // 设置列宽
    const colWidths = [
      { wch: 8 },  // 序号
      { wch: 15 }, // 学生姓名
      { wch: 8 },  // 分数
      { wch: 8 },  // 等级
      { wch: 8 },  // 状态
    ];
    ws['!cols'] = colWidths;

    // 创建工作簿
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "成绩统计表");

    // 生成Excel文件
    const excelBuffer = XLSX.write(wb, {
      type: 'buffer',
      bookType: 'xlsx'
    });

    // 设置响应头
    const headers = new Headers();
    headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
  const filename = `continuation_writing_grades_${timestamp}.xlsx`;
  headers.set('Content-Disposition', `attachment; filename="${filename}"`);

    return new NextResponse(excelBuffer, {
      status: 200,
      headers
    });

  } catch (error) {
    console.error('导出Excel失败:', error);
    return NextResponse.json(
      { error: '导出Excel失败，请稍后重试' },
      { status: 500 }
    );
  }
}

// 根据分数获取等级
function getScoreLevel(score: number, type: string) {
  if (type === 'continuation-writing') {
    if (score >= 13) return { text: '优秀', color: 'bg-green-100 text-green-800' };
    if (score >= 10) return { text: '良好', color: 'bg-blue-100 text-blue-800' };
    if (score >= 7) return { text: '及格', color: 'bg-yellow-100 text-yellow-800' };
    return { text: '不及格', color: 'bg-red-100 text-red-800' };
  } else {
    if (score >= 20) return { text: '优秀', color: 'bg-green-100 text-green-800' };
    if (score >= 16) return { text: '良好', color: 'bg-blue-100 text-blue-800' };
    if (score >= 12) return { text: '及格', color: 'bg-yellow-100 text-yellow-800' };
    return { text: '不及格', color: 'bg-red-100 text-red-800' };
  }
}