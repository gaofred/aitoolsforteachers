"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Download, Eye, EyeOff, FileText, Star, FileDown } from "lucide-react";
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';
import type { ApplicationBatchTask } from "../types";

interface ApplicationResultTableProps {
  task: ApplicationBatchTask | null;
  onPrev: () => void;
  isGradingCompleted: boolean;
}

const ApplicationResultTable: React.FC<ApplicationResultTableProps> = ({
  task,
  onPrev,
  isGradingCompleted
}) => {
  const [expandedResults, setExpandedResults] = useState<{[key: string]: boolean}>({});
  const [showImprovedVersions, setShowImprovedVersions] = useState<{[key: string]: boolean}>({});
  const [currentPage, setCurrentPage] = useState(1);

  if (!task) return null;

  const assignments = task.assignments || [];
  const completedAssignments = assignments.filter(a => a.status === 'completed' && a.gradingResult);

  // 分页设置：每页5个学生
  const itemsPerPage = 5;
  const totalPages = Math.ceil(completedAssignments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentAssignments = completedAssignments.slice(startIndex, endIndex);

  // 切换详细结果显示
  const toggleResultExpansion = (assignmentId: string) => {
    setExpandedResults(prev => ({
      ...prev,
      [assignmentId]: !prev[assignmentId]
    }));
  };

  // 切换高分范文显示
  const toggleImprovedVersion = (assignmentId: string) => {
    setShowImprovedVersions(prev => ({
      ...prev,
      [assignmentId]: !prev[assignmentId]
    }));
  };

  // 导出Excel
  const exportToExcel = () => {
    if (completedAssignments.length === 0) {
      alert('没有可导出的数据');
      return;
    }

    const data = completedAssignments.map((assignment, index) => ({
      '序号': index + 1,
      '学生姓名': assignment.student.name,
      '得分': assignment.gradingResult?.score || 0,
      '原文内容': assignment.ocrResult.editedText || assignment.ocrResult.content,
      '批改意见': assignment.gradingResult?.feedback || '',
      '高分范文': assignment.gradingResult?.improvedVersion || '',
      '批改时间': assignment.gradingResult?.gradedAt ? new Date(assignment.gradingResult.gradedAt).toLocaleString() : ''
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "批改结果");

    // 设置列宽
    const colWidths = [
      { wch: 8 },  // 序号
      { wch: 12 }, // 学生姓名
      { wch: 8 },  // 得分
      { wch: 50 }, // 原文内容
      { wch: 80 }, // 批改意见
      { wch: 50 }, // 高分范文
      { wch: 20 }  // 批改时间
    ];
    ws['!cols'] = colWidths;

    XLSX.writeFile(wb, `应用文批改结果_${new Date().toLocaleDateString()}.xlsx`);
  };

  // 导出为txt文件（每个学生单独一个文件）
  const exportToTxtFiles = () => {
    if (completedAssignments.length === 0) {
      alert('没有可导出的数据');
      return;
    }

    completedAssignments.forEach((assignment, index) => {
      const studentName = assignment.student.name;
      const score = assignment.gradingResult?.score || 0;
      const originalText = assignment.ocrResult.editedText || assignment.ocrResult.content;
      const feedback = assignment.gradingResult?.feedback || '';
      const improvedVersion = assignment.gradingResult?.improvedVersion || '';
      const gradedTime = assignment.gradingResult?.gradedAt ? new Date(assignment.gradingResult.gradedAt).toLocaleString() : '';

      // 构建txt文件内容
      const content = `＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝
应用文批改报告
＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝

学生姓名：${studentName}
得分：${score}分
批改时间：${gradedTime}

─────────────────────────────────────
【学生原文】
─────────────────────────────────────

${originalText}

─────────────────────────────────────
【详细批改意见】
─────────────────────────────────────

${feedback}

─────────────────────────────────────
【高分范文】
─────────────────────────────────────

${improvedVersion}

＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝
批改完成 - 由AI英语教学助手生成
＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝
`;

      // 创建Blob并下载
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${studentName}_应用文批改报告_${new Date().toLocaleDateString().replace(/\//g, '-')}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    });

    alert(`已导出${completedAssignments.length}个学生的批改报告txt文件`);
  };

  // 导出Word文档（每页一个学生）
  const exportToWord = async () => {
    if (completedAssignments.length === 0) {
      alert('没有可导出的数据');
      return;
    }

    console.log('开始生成Word文档...');

    // 创建每个学生的页面
    const children: any[] = [];

    // 添加封面页
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "应用文批改报告",
            bold: true,
            size: 32,
            color: "2E74B5"
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 }
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `生成时间: ${new Date().toLocaleString()}`,
            size: 24,
            color: "666666"
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 }
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `批改学生数量: ${completedAssignments.length}人`,
            size: 24,
            color: "666666"
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 }
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `平均分: ${averageScore.toFixed(1)}分`,
            size: 24,
            color: "666666"
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 }
      })
    );

    // 为每个学生创建一页
    completedAssignments.forEach((assignment, index) => {
      const studentName = assignment.student.name;
      const score = assignment.gradingResult?.score || 0;
      const originalText = assignment.ocrResult.editedText || assignment.ocrResult.content;
      const feedback = assignment.gradingResult?.feedback || '';
      const improvedVersion = assignment.gradingResult?.improvedVersion || '';
      const gradedTime = assignment.gradingResult?.gradedAt ? new Date(assignment.gradingResult.gradedAt).toLocaleString() : '';

      // 如果不是第一个学生，添加分页符
      if (index > 0) {
        children.push(
          new Paragraph({
            children: [],
            pageBreakBefore: true
          })
        );
      }

      // 学生信息标题
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `学生批改报告 #${index + 1}`,
              bold: true,
              size: 28,
              color: "2E74B5"
            })
          ],
          spacing: { after: 300 },
          border: {
            bottom: {
              color: "2E74B5",
              size: 2,
              style: BorderStyle.SINGLE
            }
          }
        })
      );

      // 基本信息
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "学生姓名: ",
              bold: true,
              size: 22
            }),
            new TextRun({
              text: studentName,
              size: 22
            })
          ],
          spacing: { after: 200 }
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "得分: ",
              bold: true,
              size: 22
            }),
            new TextRun({
              text: `${score}分`,
              size: 22,
              color: score >= 10 ? "FF0000" : "000000"
            })
          ],
          spacing: { after: 200 }
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "批改时间: ",
              bold: true,
              size: 22
            }),
            new TextRun({
              text: gradedTime,
              size: 22
            })
          ],
          spacing: { after: 400 }
        })
      );

      // 学生原文 - 优化分段格式
      const originalTextParagraphs = originalText.split('\n').filter(line => line.trim());
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "【学生原文】",
              bold: true,
              size: 24,
              color: "2E74B5"
            })
          ],
          spacing: { after: 300 },
          border: {
            bottom: {
              color: "E0E0E0",
              size: 1,
              style: BorderStyle.SINGLE
            }
          }
        })
      );

      // 为每个段落创建单独的Paragraph，并添加首行缩进
      originalTextParagraphs.forEach((paragraph, pIndex) => {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: paragraph.trim(),
                size: 22,
                font: "宋体"
              })
            ],
            spacing: {
              after: pIndex < originalTextParagraphs.length - 1 ? 240 : 400
            },
            indent: {
              firstLine: 400  // 首行缩进2字符
            }
          })
        );
      });

      // 批改意见 - 优化分段格式
      if (feedback) {
        const feedbackParagraphs = feedback.split('\n').filter(line => line.trim());
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: "【详细批改意见】",
                bold: true,
                size: 24,
                color: "2E74B5"
              })
            ],
            spacing: { after: 300 },
            border: {
              bottom: {
                color: "E0E0E0",
                size: 1,
                style: BorderStyle.SINGLE
              }
            }
          })
        );

        // 为批改意见的每个段落创建单独的Paragraph
        feedbackParagraphs.forEach((paragraph, pIndex) => {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: paragraph.trim(),
                  size: 22,
                  font: "宋体"
                })
              ],
              spacing: {
                after: pIndex < feedbackParagraphs.length - 1 ? 240 : 400
              },
              indent: {
                firstLine: 400  // 首行缩进2字符
              }
            })
          );
        });
      }

      // 高分范文 - 优化分段格式
      if (improvedVersion) {
        const improvedParagraphs = improvedVersion.split('\n').filter(line => line.trim());
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: "【高分范文】",
                bold: true,
                size: 24,
                color: "2E74B5"
              })
            ],
            spacing: { after: 300 },
            border: {
              bottom: {
                color: "E0E0E0",
                size: 1,
                style: BorderStyle.SINGLE
              }
            }
          })
        );

        // 为高分范文的每个段落创建单独的Paragraph
        improvedParagraphs.forEach((paragraph, pIndex) => {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: paragraph.trim(),
                  size: 22,
                  font: "宋体"
                })
              ],
              spacing: {
                after: pIndex < improvedParagraphs.length - 1 ? 240 : 400
              },
              indent: {
                firstLine: 400  // 首行缩进2字符
              }
            })
          );
        });
      }

      // 美观的分页分隔线
      if (index < completedAssignments.length - 1) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: "─".repeat(50),
                size: 16,
                color: "B0B0B0",
                font: "宋体"
              })
            ],
            spacing: { after: 400 },
            alignment: AlignmentType.CENTER
          })
        );
      }
    });

    // 创建文档
    const doc = new Document({
      sections: [{
        properties: {},
        children: children
      }]
    });

    try {
      console.log('正在打包Word文档...');
      const buffer = await Packer.toBuffer(doc);
      console.log('Word文档生成成功，开始下载...');

      // 保存文件
      saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }), `应用文批改报告_${new Date().toLocaleDateString().replace(/\//g, '-')}.docx`);

      console.log('Word文档下载完成');
      alert(`已导出包含${completedAssignments.length}名学生批改报告的Word文档`);
    } catch (error) {
      console.error('Word文档生成失败:', error);
      alert('Word文档生成失败，请稍后重试');
    }
  };

  // 计算平均分
  const averageScore = completedAssignments.length > 0 
    ? completedAssignments.reduce((sum, a) => sum + (a.gradingResult?.score || 0), 0) / completedAssignments.length 
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">查看结果导出</h2>
        <p className="text-gray-600 text-sm">
          查看批改结果详情，支持导出Excel文件
        </p>
      </div>

      {/* 统计概览 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-600" />
            批改统计
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{assignments.length}</div>
              <div className="text-sm text-blue-700">总作文数</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{completedAssignments.length}</div>
              <div className="text-sm text-green-700">批改完成</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{averageScore.toFixed(1)}</div>
              <div className="text-sm text-yellow-700">平均分</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{completedAssignments.length}</div>
              <div className="text-sm text-purple-700">消耗点数</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 导出操作 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">导出操作</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={exportToExcel}
              disabled={completedAssignments.length === 0}
              className="flex items-center gap-2"
              variant="outline"
            >
              <Download className="w-4 h-4" />
              导出Excel
            </Button>
            <Button
              onClick={exportToTxtFiles}
              disabled={completedAssignments.length === 0}
              className="flex items-center gap-2"
              variant="outline"
            >
              <FileDown className="w-4 h-4" />
              一键导出TXT文件（每个学生单独一份）
            </Button>
            <Button
              onClick={exportToWord}
              disabled={completedAssignments.length === 0}
              className="flex items-center gap-2"
              variant="default"
            >
              <FileText className="w-4 h-4" />
              导出Word文档（每页一个学生）
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 详细结果 */}
      {completedAssignments.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-gray-500">
            {isGradingCompleted ? '暂无批改完成的作文' : '请先完成批改'}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* 分页控制 */}
          {totalPages > 1 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    显示第 {startIndex + 1} - {Math.min(endIndex, completedAssignments.length)} 条，共 {completedAssignments.length} 条记录
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      上一页
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="w-8 h-8 p-0"
                        >
                          {page}
                        </Button>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      下一页
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-4">
            {currentAssignments.map((assignment, index) => (
            <Card key={assignment.id} className="border border-gray-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    {assignment.student.name}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                      {assignment.gradingResult?.score}分
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleResultExpansion(assignment.id)}
                      className="flex items-center gap-1"
                    >
                      {expandedResults[assignment.id] ? (
                        <>
                          <EyeOff className="w-3 h-3" />
                          收起
                        </>
                      ) : (
                        <>
                          <Eye className="w-3 h-3" />
                          详情
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 学生作文 */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    学生作文
                  </label>
                  <div className="bg-gray-50 p-3 rounded border text-sm whitespace-pre-wrap max-h-32 overflow-y-auto">
                    {assignment.ocrResult.editedText || assignment.ocrResult.content}
                  </div>
                </div>

                {/* 详细批改结果 */}
                {expandedResults[assignment.id] && assignment.gradingResult && (
                  <div className="space-y-4 border-t pt-4">
                    {/* 批改意见 */}
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">
                        详细批改意见
                      </label>
                      <Textarea
                        value={assignment.gradingResult.feedback}
                        readOnly
                        className="min-h-[400px] text-sm"
                      />
                    </div>

                    {/* 高分范文 */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-gray-700">
                          高分范文
                        </label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleImprovedVersion(assignment.id)}
                        >
                          {showImprovedVersions[assignment.id] ? '隐藏' : '显示'}
                        </Button>
                      </div>
                      {showImprovedVersions[assignment.id] && (
                        <div className="bg-green-50 p-3 rounded border border-green-200 text-sm whitespace-pre-wrap">
                          {assignment.gradingResult.improvedVersion}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 简要批改信息 */}
                {!expandedResults[assignment.id] && assignment.gradingResult && (
                  <div className="bg-blue-50 p-3 rounded border border-blue-200">
                    <div className="text-sm text-blue-800">
                      {assignment.gradingResult.feedback.substring(0, 150)}...
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          </div>
        </>
      )}

      {/* 操作按钮 */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev}>
          上一步
        </Button>
        <div className="text-sm text-gray-500">
          批改完成！可导出结果或返回修改
        </div>
      </div>
    </div>
  );
};

export default ApplicationResultTable;


