"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Download, Eye, EyeOff, FileText, Star, FileDown, BrainCircuit, TrendingUp, AlertCircle, Coins } from "lucide-react";
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
  const [editableScores, setEditableScores] = useState<{[key: string]: string}>({});
  const [editableFeedback, setEditableFeedback] = useState<{[key: string]: string}>({});
  const [isEditing, setIsEditing] = useState<{[key: string]: boolean}>({});
  const [commonIssuesAnalysis, setCommonIssuesAnalysis] = useState<string | null>(null);
  const [isAnalyzingCommonIssues, setIsAnalyzingCommonIssues] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);

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

  // 导出共性问题分析报告到Word
  const exportAnalysisToWord = async () => {
    if (!commonIssuesAnalysis || !task.topic) {
      alert('没有可导出的分析内容');
      return;
    }

    try {
      console.log('📄 开始生成共性问题分析Word文档...');
      console.log('📝 分析内容长度:', commonIssuesAnalysis.length);
      console.log('📝 分析内容预览:', commonIssuesAnalysis.substring(0, 200) + '...');

      // 将分析结果按段落分割并处理
      const analysisParagraphs = commonIssuesAnalysis.split('\n').filter(line => line.trim());

      // 构建文档内容数组
      const documentChildren: any[] = [
        // 标题
        new Paragraph({
          children: [
            new TextRun({
              text: "学生共性问题分析报告",
              bold: true,
              size: 32,
              color: "2E74B5"
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
              text: "应用文题目：",
              bold: true,
              size: 24
            }),
            new TextRun({
              text: task.topic,
              size: 24
            })
          ],
          spacing: { after: 200 }
        }),

        new Paragraph({
          children: [
            new TextRun({
              text: "分析时间：",
              bold: true,
              size: 24
            }),
            new TextRun({
              text: new Date().toLocaleString('zh-CN'),
              size: 24
            })
          ],
          spacing: { after: 200 }
        }),

        // 统计数据
        new Paragraph({
          children: [
            new TextRun({
              text: "数据统计",
              bold: true,
              size: 28,
              color: "2E74B5"
            })
          ],
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 }
        }),

        new Paragraph({
          children: [
            new TextRun({
              text: `• 分析学生数量：${completedAssignments.length} 名\n` +
                    `• 平均分数：${(completedAssignments.reduce((sum, a) => sum + (a.gradingResult?.score || 0), 0) / completedAssignments.length).toFixed(1)} 分\n` +
                    `• 优秀作文（≥80分）：${completedAssignments.filter(a => (a.gradingResult?.score || 0) >= 80).length} 篇\n` +
                    `• 需要提高（<60分）：${completedAssignments.filter(a => (a.gradingResult?.score || 0) < 60).length} 篇`,
              size: 22
            })
          ],
          spacing: { after: 400 }
        }),

        // 分析结果
        new Paragraph({
          children: [
            new TextRun({
              text: "详细分析结果",
              bold: true,
              size: 28,
              color: "2E74B5"
            })
          ],
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 }
        })
      ];

      // 处理分析内容段落
      analysisParagraphs.forEach(paragraph => {
        if (paragraph.trim()) {
          // 检查是否是标题（包含#号）
          if (paragraph.includes('###') || paragraph.includes('##') || paragraph.includes('#')) {
            const titleText = paragraph.replace(/^#+\s*/, '');
            documentChildren.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: titleText,
                    bold: true,
                    size: 26,
                    color: "2E74B5"
                  })
                ],
                heading: paragraph.includes('###') ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_1,
                spacing: { before: 300, after: 200 }
              })
            );
          } else {
            // 普通段落或列表项
            documentChildren.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: paragraph.trim(),
                    size: 22
                  })
                ],
                spacing: { after: 200 }
              })
            );
          }
        }
      });

      // 添加页脚
      documentChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "---\n*注：此分析报告基于Gemini 2.5 Pro模型生成，建议结合具体教学实际情况进行调整。*",
              size: 20,
              color: "666666",
              italics: true
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 600 }
        })
      );

      // 创建Word文档
      const doc = new Document({
        sections: [{
          properties: {},
          children: documentChildren
        }]
      });

      // 生成并下载文档
      const buffer = await Packer.toBuffer(doc);
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `学生共性问题分析报告_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log('✅ 共性问题分析Word文档导出成功');
      alert('共性问题分析报告已成功导出为Word文档！');

    } catch (error) {
      console.error('❌ Word导出失败:', error);
      alert('Word文档导出失败，请稍后重试');
    }
  };

  // 共性问题分析
  const analyzeCommonIssues = async () => {
    if (completedAssignments.length === 0) {
      alert('没有可分析的学生作文');
      return;
    }

    if (!task.topic) {
      alert('缺少应用文题目信息，无法进行分析');
      return;
    }

    // 确认付费
    const confirmAnalysis = confirm(`共性问题分析需要消耗3积分，是否确认进行分析？\n\n分析内容：\n• 学生共性问题识别\n• 高分词汇与句式推荐\n• 写作提升策略建议\n• B1层次针对性指导`);
    if (!confirmAnalysis) {
      return;
    }

    console.log('🎯 开始共性问题分析...');
    setIsAnalyzingCommonIssues(true);

    try {
      // 准备学生作文数据
      const studentEssays = completedAssignments.map(assignment => ({
        studentName: assignment.student.name,
        content: assignment.ocrResult.editedText || assignment.ocrResult.content || '',
        score: assignment.gradingResult?.score || 0,
        feedback: assignment.gradingResult?.feedback || ''
      }));

      console.log('📝 准备分析的数据:', {
        topic: task.topic,
        essayCount: studentEssays.length,
        avgScore: studentEssays.reduce((sum, essay) => sum + essay.score, 0) / studentEssays.length
      });

      const response = await fetch('/api/ai/common-issues-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic: task.topic,
          studentEssays: studentEssays
        })
      });

      const data = await response.json();

      if (data.success) {
        console.log('✅ 共性问题分析成功:', {
          resultLength: data.result.length,
          analysisCount: data.analysisCount,
          pointsDeducted: data.pointsDeducted
        });

        setCommonIssuesAnalysis(data.result);
        setShowAnalysisModal(true);

        // 显示成功提示
        const successMessage = data.pointsDeducted ?
          `共性问题分析完成！已扣除3积分` :
          `共性问题分析完成！`;
        console.log('💰 ' + successMessage);
      } else {
        console.error('❌ 共性问题分析失败:', data.error);

        // 检查是否是积分不足问题
        if (data.error?.includes('积分不足') || data.error?.includes('点数不足')) {
          alert('积分不足，请充值后再试！');
        } else if (data.error?.includes('退款成功')) {
          // 如果系统自动退款了
          alert(`分析失败，已退还3积分：${data.error}`);
        } else {
          alert(`共性问题分析失败: ${data.error}`);
        }
      }
    } catch (error) {
      console.error('❌ 共性问题分析请求失败:', error);
      alert('共性问题分析失败，系统将自动退还积分');
    } finally {
      setIsAnalyzingCommonIssues(false);
    }
  };

  // 导出Excel
  const exportToExcel = () => {
    if (completedAssignments.length === 0) {
      alert('没有可导出的数据');
      return;
    }

    const data = completedAssignments.map((assignment, index) => {
      const content = assignment.ocrResult.editedText || assignment.ocrResult.content;
      console.log(`📋 Excel导出数据调试 - ${assignment.student.name}:`, {
        hasEditedText: !!assignment.ocrResult.editedText,
        hasOriginalText: !!assignment.ocrResult.content,
        contentLength: content?.length || 0,
        contentPreview: content?.substring(0, 100),
        isFromEditedText: !!assignment.ocrResult.editedText
      });

      return {
        '序号': index + 1,
        '学生姓名': assignment.student.name,
        '得分': editableScores[assignment.id] || assignment.gradingResult?.score || 0,
        '原文内容': content,
        '批改意见': editableFeedback[assignment.id] || assignment.gradingResult?.feedback || '',
        '高分范文': assignment.gradingResult?.improvedVersion || '',
        '批改时间': assignment.gradingResult?.gradedAt ? new Date(assignment.gradingResult.gradedAt).toLocaleString() : ''
      };
    });

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

    // 导出文件
    const fileName = `应用文批改结果_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`;
    XLSX.writeFile(wb, fileName);
    alert(`Excel文件已导出：${fileName}`);
  };

  // 导出单个学生Word文档
  const exportToWordFiles = async () => {
    if (completedAssignments.length === 0) {
      alert('没有可导出的数据');
      return;
    }

    console.log('开始生成Word文档...');

    const promises = completedAssignments.map(async (assignment) => {
      const studentName = assignment.student.name;
      const content = assignment.ocrResult.editedText || assignment.ocrResult.content;
      const feedback = assignment.gradingResult?.feedback || '';
      const improvedVersion = assignment.gradingResult?.improvedVersion || '';
      const score = assignment.gradingResult?.score || 0;
      const gradedTime = assignment.gradingResult?.gradedAt ? new Date(assignment.gradingResult.gradedAt).toLocaleString() : '';

      try {
        // 创建Word文档
        const doc = new Document({
          sections: [{
            properties: {},
            children: [
              // 标题
              new Paragraph({
                children: [
                  new TextRun({
                    text: "应用文批改报告",
                    bold: true,
                    size: 32,
                    color: "2E74B5"
                  })
                ],
                heading: HeadingLevel.TITLE,
                alignment: AlignmentType.CENTER,
                spacing: { after: 400 }
              }),

              // 学生信息
              new Paragraph({
                children: [
                  new TextRun({
                    text: `学生姓名：${studentName}`,
                    bold: true,
                    size: 24
                  })
                ],
                spacing: { after: 200 }
              }),

              new Paragraph({
                children: [
                  new TextRun({
                    text: `得分：${score}`,
                    bold: true,
                    size: 20
                  })
                ],
                spacing: { after: 100 }
              }),

              new Paragraph({
                children: [
                  new TextRun({
                    text: `批改时间：${gradedTime}`,
                    bold: true,
                    size: 20
                  })
                ],
                spacing: { after: 400 }
              }),

              // 原文内容
              new Paragraph({
                children: [
                  new TextRun({
                    text: "原文内容",
                    bold: true,
                    size: 24,
                    color: "2E74B5"
                  })
                ],
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 }
              }),

              // 添加原文段落
              ...content.split('\n').filter(line => line.trim()).map(line =>
                new Paragraph({
                  children: [
                    new TextRun({
                      text: line.trim(),
                      size: 22
                    })
                  ],
                  spacing: { after: 180 }
                })
              ),

              // 批改意见
              new Paragraph({
                children: [
                  new TextRun({
                    text: "批改意见",
                    bold: true,
                    size: 24,
                    color: "2E74B5"
                  })
                ],
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 }
              }),

              // 添加批改意见段落
              ...feedback.split('\n').filter(line => line.trim()).map(line =>
                new Paragraph({
                  children: [
                    new TextRun({
                      text: line.trim(),
                      size: 22
                    })
                  ],
                  spacing: { after: 180 }
                })
              ),

              // 高分范文
              ...(improvedVersion ? [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "高分范文",
                      bold: true,
                      size: 24,
                      color: "2E74B5"
                    })
                  ],
                  heading: HeadingLevel.HEADING_1,
                  spacing: { before: 400, after: 200 }
                }),

                // 添加范文段落
                ...improvedVersion.split('\n').filter(line => line.trim()).map(line =>
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: line.trim(),
                        size: 22
                      })
                    ],
                    spacing: { after: 180 }
                  })
                )
              ] : [])
            ]
          }]
        });

        // 生成buffer
        const buffer = await Packer.toBuffer(doc);
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
        const url = URL.createObjectURL(blob);

        // 下载文件
        const fileName = `${studentName}_应用文批改报告_${new Date().toLocaleDateString().replace(/\//g, '-')}.docx`;
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        console.log(`已生成并下载: ${fileName}`);
        return fileName;
      } catch (error) {
        console.error(`生成${studentName}的Word文档失败:`, error);
        throw error;
      }
    });

    try {
      // 等待所有文档生成完成
      const fileNames = await Promise.all(promises);
      alert(`已成功导出${fileNames.length}个学生的Word批改报告文件`);
      console.log('所有Word文件导出完成');
    } catch (error) {
      console.error('批量导出Word文件失败:', error);
      alert('部分文件导出失败，请稍后重试');
    }
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
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 }
      })
    );

    // 添加生成时间
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `生成时间：${new Date().toLocaleString()}`,
            size: 20
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 800 }
      })
    );

    // 为每个学生添加内容
    completedAssignments.forEach((assignment, index) => {
      const studentName = assignment.student.name;
      const content = assignment.ocrResult.editedText || assignment.ocrResult.content;
      const feedback = assignment.gradingResult?.feedback || '';
      const improvedVersion = assignment.gradingResult?.improvedVersion || '';
      const score = assignment.gradingResult?.score || 0;
      const gradedTime = assignment.gradingResult?.gradedAt ? new Date(assignment.gradingResult.gradedAt).toLocaleString() : '';

      // 分页符（除了第一个学生）
      if (index > 0) {
        children.push(
          new Paragraph({
            children: [],
            pageBreakBefore: true
          })
        );
      }

      // 学生标题
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${index + 1}. ${studentName}`,
              bold: true,
              size: 28,
              color: "2E74B5"
            })
          ],
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 }
        })
      );

      // 基本信息
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `得分：${score}  |  批改时间：${gradedTime}`,
              size: 20
            })
          ],
          spacing: { after: 300 }
        })
      );

      // 原文内容标题
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "原文内容",
              bold: true,
              size: 24,
              color: "2E74B5"
            })
          ],
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 200 }
        })
      );

      // 添加原文段落
      const originalText = assignment.ocrResult.editedText || assignment.ocrResult.content;
      const originalTextParagraphs = originalText.split('\n').filter(line => line.trim());

      originalTextParagraphs.forEach(paragraph => {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: paragraph,
                size: 22
              })
            ],
            spacing: { after: 200 }
          })
        );
      });

      // 批改意见标题
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "批改意见",
              bold: true,
              size: 24,
              color: "2E74B5"
            })
          ],
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 400, after: 200 }
        })
      );

      // 添加批改意见段落
      const feedbackParagraphs = feedback.split('\n').filter(line => line.trim());

      feedbackParagraphs.forEach(paragraph => {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: paragraph,
                size: 22
              })
            ],
            spacing: { after: 200 }
          })
        );
      });

      // 高分范文标题（如果存在）
      if (improvedVersion) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: "高分范文",
                bold: true,
                size: 24,
                color: "2E74B5"
              })
            ],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 }
          })
        );

        // 添加范文段落
        const improvedParagraphs = improvedVersion.split('\n').filter(line => line.trim());

        improvedParagraphs.forEach(paragraph => {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: paragraph,
                  size: 22
                })
              ],
              spacing: { after: 200 }
            })
          );
        });
      }
    });

    // 创建文档
    const doc = new Document({
      sections: [{
        properties: {},
        children: children
      }]
    });

    // 生成并下载
    try {
      const buffer = await Packer.toBuffer(doc);
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `应用文批改报告_${new Date().toLocaleDateString().replace(/\//g, '-')}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log('Word文档导出成功');
      alert('Word文档已成功导出！');
    } catch (error) {
      console.error('Word文档导出失败:', error);
      alert('Word文档导出失败，请稍后重试');
    }
  };

  // 编辑处理
  const toggleEdit = (id: string) => {
    setIsEditing(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const updateScore = (id: string, value: string) => {
    setEditableScores(prev => ({ ...prev, [id]: value }));
  };

  const updateFeedback = (id: string, value: string) => {
    setEditableFeedback(prev => ({ ...prev, [id]: value }));
  };

  const saveEdit = (id: string) => {
    setIsEditing(prev => ({ ...prev, [id]: false }));
    // 这里可以添加保存逻辑，比如保存到数据库
    console.log('保存编辑:', id, editableScores[id], editableFeedback[id]);
  };

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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{completedAssignments.length}</div>
              <div className="text-gray-600">已完成批改</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {(completedAssignments.reduce((sum, a) => sum + (a.gradingResult?.score || 0), 0) / completedAssignments.length).toFixed(1)}
              </div>
              <div className="text-gray-600">平均分数</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {completedAssignments.filter(a => (a.gradingResult?.score || 0) >= 90).length}
              </div>
              <div className="text-gray-600">优秀作文</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {completedAssignments.filter(a => (a.gradingResult?.score || 0) < 60).length}
              </div>
              <div className="text-gray-600">需要提高</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 导出按钮 */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={exportToExcel} className="flex items-center gap-2">
          <Download className="w-4 h-4" />
          导出Excel
        </Button>
        <Button onClick={exportToWord} variant="outline" className="flex items-center gap-2">
          <FileText className="w-4 h-4" />
          导出Word（合并）
        </Button>
        <Button onClick={exportToWordFiles} variant="outline" className="flex items-center gap-2">
          <FileText className="w-4 h-4" />
          导出Word（分别）
        </Button>
      </div>

      {/* 分页控制 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            显示 {startIndex + 1}-{Math.min(endIndex, completedAssignments.length)} / {completedAssignments.length}
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
            <span className="text-sm text-gray-600">
              第 {currentPage} / {totalPages} 页
            </span>
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
      )}

      {currentAssignments.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-gray-500">
            暂无批改完成的数据
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-4">
            {currentAssignments.map((assignment, index) => {
              const globalIndex = completedAssignments.findIndex(a => a.id === assignment.id) + 1;
              return (
              <Card key={assignment.id} className="border border-gray-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      作文 {globalIndex}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {assignment.ocrResult.editedText && (
                        <Badge variant="secondary" className="text-xs">
                          已编辑
                        </Badge>
                      )}
                      {!expandedResults[assignment.id] && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleResultExpansion(assignment.id)}
                          className="flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          查看详情
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* 基本信息 */}
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-4">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <div>
                        <div className="font-medium text-blue-600 text-sm">
                          学生: {assignment.student.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          得分: {assignment.gradingResult?.score || 0}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 详细信息 */}
                  {expandedResults[assignment.id] && assignment.gradingResult && (
                    <div className="space-y-4">
                      {/* 批改意见 */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-medium text-gray-700">
                            批改意见
                          </label>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleEdit(assignment.id + '_feedback')}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            {isEditing[assignment.id + '_feedback'] ? '取消调整' : '调整'}
                          </Button>
                        </div>
                        {isEditing[assignment.id + '_feedback'] ? (
                          <div className="space-y-2">
                            <Textarea
                              value={editableFeedback[assignment.id] || assignment.gradingResult?.feedback || ''}
                              onChange={(e) => updateFeedback(assignment.id, e.target.value)}
                              className="min-h-[400px] text-sm"
                              placeholder="请输入详细批改意见..."
                            />
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => saveEdit(assignment.id + '_feedback')}
                                className="text-green-600 hover:text-green-700"
                              >
                                保存调整
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => toggleEdit(assignment.id + '_feedback')}
                                className="text-gray-600 hover:text-gray-700"
                              >
                                取消调整
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Textarea
                            value={editableFeedback[assignment.id] || assignment.gradingResult?.feedback || ''}
                            readOnly
                            className="min-h-[400px] text-sm"
                          />
                        )}
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
            );
            })}
          </div>
        </>
      )}

      {/* 操作按钮 */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev}>
          上一步
        </Button>
        <div className="flex items-center gap-3">
          <Button
            onClick={analyzeCommonIssues}
            disabled={isAnalyzingCommonIssues || completedAssignments.length === 0}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white border-0"
          >
            {isAnalyzingCommonIssues ? (
              <>
                <div className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin" />
                分析中，大约需要3分钟...
              </>
            ) : (
              <>
                <BrainCircuit className="w-4 h-4" />
                共性问题分析 (3积分)
                <Coins className="w-4 h-4" />
              </>
            )}
          </Button>
          <div className="text-sm text-gray-500">
            批改完成！可导出结果或返回修改
          </div>
        </div>
      </div>

      {/* 共性问题分析结果模态框 */}
      {showAnalysisModal && commonIssuesAnalysis && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] flex flex-col">
            {/* 固定头部 */}
            <div className="flex-shrink-0 p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BrainCircuit className="w-6 h-6 text-blue-600" />
                  <h2 className="text-xl font-semibold text-gray-900">学生共性问题分析</h2>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    {completedAssignments.length} 名学生
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={exportAnalysisToWord}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white border-green-600"
                    size="sm"
                  >
                    <FileDown className="w-4 h-4" />
                    导出Word
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAnalysisModal(false)}
                  >
                    关闭
                  </Button>
                </div>
              </div>
            </div>

            {/* 可滚动内容区域 */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-6">
                <div className="space-y-6">
                  {/* 作文题目 */}
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <h3 className="font-semibold text-blue-900">应用文题目</h3>
                    </div>
                    <p className="text-blue-800 whitespace-pre-wrap">{task.topic}</p>
                  </div>

                  {/* 分析结果 */}
                  <div className="prose prose-sm max-w-none">
                    <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                      {commonIssuesAnalysis}
                    </div>
                  </div>

                  {/* 统计信息 */}
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="w-5 h-5 text-gray-600" />
                      <h3 className="font-semibold text-gray-900">数据分析统计</h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{completedAssignments.length}</div>
                        <div className="text-gray-600">分析作文数</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {(completedAssignments.reduce((sum, a) => sum + (a.gradingResult?.score || 0), 0) / completedAssignments.length).toFixed(1)}
                        </div>
                        <div className="text-gray-600">平均分数</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {completedAssignments.filter(a => (a.gradingResult?.score || 0) >= 80).length}
                        </div>
                        <div className="text-gray-600">优秀作文</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">
                          {completedAssignments.filter(a => (a.gradingResult?.score || 0) < 60).length}
                        </div>
                        <div className="text-gray-600">需要提高</div>
                      </div>
                    </div>
                  </div>

                  {/* 操作提示 */}
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                      <div className="text-sm text-yellow-800">
                        <strong>教学建议：</strong>以上分析基于Gemini 2.5 Pro模型生成，建议结合具体教学实际情况进行调整。重点关注共性问题的针对性训练，为学生提供个性化的写作指导。
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApplicationResultTable;