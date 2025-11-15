"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, FileText, TrendingDown, BarChart3, Eye, Edit, Package, Loader2 } from "lucide-react";
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import type { ContinuationWritingBatchTask, ContinuationWritingAssignment } from "../types";

interface ContinuationWritingResultTableProps {
  task: ContinuationWritingBatchTask | null;
  setTask: (task: ContinuationWritingBatchTask | null) => void;
  onPrev: () => void;
  isGradingCompleted: boolean;
}

const ContinuationWritingResultTable: React.FC<ContinuationWritingResultTableProps> = ({
  task,
  setTask,
  onPrev,
  isGradingCompleted
}) => {
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [commonAnalysis, setCommonAnalysis] = useState<string>('');
  const [exporting, setExporting] = useState({
    excel: false,
    batch: false,
    zip: false,
    all: false
  });

  if (!task) return null;

  const assignments = task.assignments || [];
  const completedAssignments = assignments.filter(a => a.status === 'completed' && a.gradingResult);

  // 调试信息
  console.log('🔍 导出调试信息:', {
    totalAssignments: assignments.length,
    completedCount: completedAssignments.length,
    taskTitle: task.title,
    hasGradingResults: completedAssignments.every(a => a.gradingResult),
    samples: completedAssignments.slice(0, 3).map(a => ({
      name: a.student.name,
      status: a.status,
      hasGradingResult: !!a.gradingResult,
      score: a.gradingResult?.score
    }))
  });

  // 计算统计数据
  const calculateStats = () => {
    if (completedAssignments.length === 0) {
      return {
        totalStudents: 0,
        averageScore: 0,
        maxScore: 0,
        minScore: 0,
        excellentCount: 0,
        goodCount: 0,
        passCount: 0,
        failCount: 0,
        scoreDistribution: [0, 0, 0, 0, 0] // 0-5, 6-10, 11-15, 16-20, 21-25
      };
    }

    const scores = completedAssignments.map(a => a.gradingResult!.score);
    const totalScore = scores.reduce((sum, score) => sum + score, 0);
    const averageScore = totalScore / scores.length;
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);

    const excellentCount = scores.filter(s => s >= 20).length; // 优秀 (20-25分)
    const goodCount = scores.filter(s => s >= 15 && s < 20).length; // 良好 (15-19分)
    const passCount = scores.filter(s => s >= 10 && s < 15).length; // 及格 (10-14分)
    const failCount = scores.filter(s => s < 10).length; // 不及格 (0-9分)

    const scoreDistribution = [
      scores.filter(s => s < 10).length,    // 不及格 (0-9分)
      scores.filter(s => s >= 10 && s < 15).length,   // 及格 (10-14分)
      scores.filter(s => s >= 15 && s < 20).length,  // 优秀 (15-19分)
      scores.filter(s => s >= 20).length           // 卓越 (20-25分)
    ];

    return {
      totalStudents: completedAssignments.length,
      averageScore: Math.round(averageScore * 100) / 100,
      maxScore,
      minScore,
      excellentCount,
      goodCount,
      passCount,
      failCount,
      scoreDistribution
    };
  };

  const stats = calculateStats();

  // 获取分数等级
  const getScoreLevel = (score: number) => {
    if (score >= 20) return { text: '卓越', color: 'bg-green-100 text-green-800' };
    if (score >= 15) return { text: '优秀', color: 'bg-blue-100 text-blue-800' };
    if (score >= 10) return { text: '及格', color: 'bg-yellow-100 text-yellow-800' };
    return { text: '不及格', color: 'bg-red-100 text-red-800' };
  };

  // 导出单个学生结果
  const exportIndividualResult = async (assignment: ContinuationWritingAssignment) => {
    if (!assignment.gradingResult) return;

    try {
      const response = await fetch('/api/export/individual-result-fixed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentName: assignment.student.name,
          content: assignment.ocrResult.editedText || assignment.ocrResult.content,
          gradingResult: assignment.gradingResult,
          topic: task.topic || '',
          type: 'continuation-writing'
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${assignment.student.name}_读后续写批改结果.txt`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('导出失败');
      }
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败');
    }
  };

  // 导出批改结果为ZIP包（每个学生一个TXT文件）
  const exportBatchResultsToZip = async () => {
    if (completedAssignments.length === 0 || exporting.zip) {
      if (exporting.zip) {
        console.log('ZIP导出正在进行中，忽略重复点击');
      } else {
        alert('没有可导出的批改结果');
      }
      return;
    }

    try {
      setExporting(prev => ({ ...prev, zip: true }));
      console.log('📦 开始生成学生文档ZIP包...');
      const zip = new JSZip();

      const promises = completedAssignments.map(async (assignment) => {
        if (!assignment.gradingResult) return null;

        try {
          const response = await fetch('/api/export/individual-result-fixed', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              studentName: assignment.student.name,
              content: assignment.ocrResult.editedText || assignment.ocrResult.content,
              gradingResult: assignment.gradingResult,
              topic: task?.topic || '',
              type: 'continuation-writing'
            }),
          });

          if (response.ok) {
            const buffer = await response.arrayBuffer();
            // 使用英文文件名避免中文编码问题
            const fileName = `${assignment.student.name}_读后续写批改结果_${Date.now()}.txt`;
            zip.file(fileName, buffer);
            console.log(`✅ 已添加到ZIP: ${fileName}`);
            return fileName;
          } else {
            console.error(`❌ 学生 ${assignment.student.name} 导出失败`);
            return null;
          }
        } catch (error) {
          console.error(`❌ 学生 ${assignment.student.name} 处理失败:`, error);
          return null;
        }
      });

      const fileNames = await Promise.all(promises);
      const successfulFiles = fileNames.filter(name => name !== null);

      if (successfulFiles.length > 0) {
        // 生成ZIP文件
        console.log('📦 正在生成ZIP包...');
        const zipBuffer = await zip.generateAsync({ type: 'blob' });

        // 下载ZIP文件
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
        const zipFileName = `continuation_writing_results_${completedAssignments.length}students_${timestamp}.zip`;
        saveAs(zipBuffer, zipFileName);

        console.log(`✅ ZIP包下载完成: ${zipFileName}`);
        alert(`✅ 文档包导出成功！\n共包含 ${successfulFiles.length} 个学生的批改结果\n文件名: ${zipFileName}`);
      } else {
        alert('⚠️ 没有找到可导出的批改数据，请先完成批改');
      }
    } catch (error) {
      console.error('❌ 生成ZIP包失败:', error);
      alert(`❌ 文档包生成失败: ${error instanceof Error ? error.message : '未知错误'}\n请减少学生数量或稍后重试`);
    } finally {
      setExporting(prev => ({ ...prev, zip: false }));
    }
  };

  // 导出完整包（包含所有结果）
  const exportCompletePackage = async () => {
    if (exporting.all) return; // 防止重复点击

    try {
      setExporting(prev => ({ ...prev, all: true }));
      console.log('📦 开始导出完整包...');

      // 依次导出所有内容
      await exportAllResults();
      await new Promise(resolve => setTimeout(resolve, 500)); // 短暂延迟

      await exportExcel();
      await new Promise(resolve => setTimeout(resolve, 500));

      console.log('✅ 完整包导出完成');
      alert(`🎉 完整包导出完成！\n已依次下载：\n✅ 个人结果文档 (${completedAssignments.length}名学生)\n✅ Excel成绩统计表\n\n总计2个文件，请查看下载文件夹`);

    } catch (error) {
      console.error('❌ 完整包导出失败:', error);
      alert(`❌ 完整包导出失败: ${error instanceof Error ? error.message : '未知错误'}\n请稍后重试，或尝试单独导出各个文件`);
    } finally {
      setExporting(prev => ({ ...prev, all: false }));
    }
  };

  // 导出全班结果
  const exportAllResults = async () => {
    if (exporting.batch) return; // 防止重复点击

    try {
      setExporting(prev => ({ ...prev, batch: true }));
      console.log('📄 开始导出全班结果...');

      // 添加详细的调试信息
      const exportData = {
        taskTitle: task.title,
        topic: task.topic,
        assignments: completedAssignments,
        stats: stats,
        type: 'continuation-writing'
      };

      console.log('📋 批量结果导出数据调试信息:', {
        taskTitle: exportData.taskTitle,
        topic: exportData.topic,
        assignmentsCount: exportData.assignments.length,
        hasStats: !!exportData.stats,
        type: exportData.type
      });

      const response = await fetch('/api/export/batch-results', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exportData),
      });

      if (response.ok) {
        try {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;

          // 使用英文文件名避免编码问题
          const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
          a.download = `continuation_writing_batch_results_${timestamp}.docx`;

          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          console.log('✅ 全班结果导出成功');

          // 成功提示
          alert(`个人结果导出成功！共包含 ${completedAssignments.length} 名学生`);

        } catch (downloadError) {
          console.error('文件下载失败:', downloadError);
          alert('文件下载失败，请检查浏览器设置');
        }
      } else {
        // 详细错误处理
        const errorText = await response.text();
        console.error('批量结果导出API错误:', {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText
        });

        let errorMessage = '批量结果导出失败';
        if (response.status === 400) {
          errorMessage = '没有可导出的批改结果';
        } else if (response.status === 500) {
          errorMessage = '服务器内部错误，请稍后重试';
        }

        alert(`${errorMessage} (${response.status})`);
      }
    } catch (error) {
      console.error('批量结果导出异常:', error);
      alert(`导出异常: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setExporting(prev => ({ ...prev, batch: false }));
    }
  };

  // 导出Excel表格
  const exportExcel = async () => {
    if (exporting.excel) return; // 防止重复点击

    try {
      setExporting(prev => ({ ...prev, excel: true }));
      console.log('📊 开始导出Excel成绩表...');

      // 添加详细的调试信息
      const exportData = {
        taskTitle: task.title,
        topic: task.topic,
        assignments: completedAssignments,
        stats: stats,
        type: 'continuation-writing'
      };

      console.log('📋 Excel导出数据调试信息:', {
        taskTitle: exportData.taskTitle,
        topic: exportData.topic,
        assignmentsCount: exportData.assignments.length,
        hasStats: !!exportData.stats,
        statsKeys: exportData.stats ? Object.keys(exportData.stats) : [],
        type: exportData.type,
        sampleAssignment: exportData.assignments[0] ? {
          name: exportData.assignments[0].student?.name,
          hasGradingResult: !!exportData.assignments[0].gradingResult,
          score: exportData.assignments[0].gradingResult?.score
        } : null
      });

      const response = await fetch('/api/export/excel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exportData),
      });

      if (response.ok) {
        try {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;

          // 使用英文文件名避免编码问题，添加时间戳
          const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
          a.download = `continuation_writing_grades_${timestamp}.xlsx`;

          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          console.log('✅ Excel导出成功');

          // 成功提示
          alert(`Excel成绩表导出成功！共包含 ${completedAssignments.length} 名学生`);

        } catch (downloadError) {
          console.error('文件下载失败:', downloadError);
          alert('文件下载失败，请检查浏览器设置');
        }
      } else {
        // 详细错误处理
        const errorText = await response.text();
        console.error('Excel导出API错误:', {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText
        });

        let errorMessage = 'Excel导出失败';
        if (response.status === 400) {
          errorMessage = '请求数据错误，请检查是否有学生数据';
        } else if (response.status === 500) {
          errorMessage = '服务器内部错误，请稍后重试';
        }

        alert(`${errorMessage} (${response.status})`);
      }
    } catch (error) {
      console.error('Excel导出异常:', error);
      alert(`Excel导出异常: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setExporting(prev => ({ ...prev, excel: false }));
    }
  };

  // 导出共性分析结果
  const exportCommonAnalysis = async () => {
    if (!commonAnalysis) {
      alert('请先生成共性分析结果');
      return;
    }

    try {
      // 生成TXT格式的共性问题分析
      const textContent = `${'='.repeat(80)}
读后续写全班共性问题分析报告
${'='.repeat(80)}

生成时间：${new Date().toLocaleString()}

【全班共性问题分析】
${commonAnalysis}

${'='.repeat(80)}
分析完成
${'='.repeat(80)}`;

      // 创建Blob对象
      const blob = new Blob([textContent], {
        type: 'text/plain;charset=utf-8'
      });

      // 创建下载链接
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `读后续写全班共性问题分析_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

    } catch (error) {
      console.error('共性分析导出失败:', error);
      alert('共性分析导出失败');
    }
  };

  
  // 全班共性分析
  const analyzeCommonIssues = async () => {
    if (completedAssignments.length === 0) {
      alert('没有已完成批改的学生，无法进行共性分析');
      return;
    }

    setIsAnalyzing(true);

    try {
      // 构建请求数据
      const studentEssays = completedAssignments.map(assignment => ({
        studentName: assignment.student.name,
        content: assignment.ocrResult.editedText || assignment.ocrResult.content,
        score: assignment.gradingResult?.score || 0,
        feedback: assignment.gradingResult?.feedback,
        detailedFeedback: assignment.gradingResult?.detailedFeedback,
        languageErrors: assignment.gradingResult?.gradingDetails?.languageErrors,
        contentIssues: assignment.gradingResult?.gradingDetails?.contentIssues
      }));

      const requestBody = {
        topic: task.topic || '',
        p1Content: task.p1Content || '',
        p2Content: task.p2Content || '',
        plotAnalysis: task.plotAnalysis || '',
        studentEssays
      };

      console.log('🚀 开始发送共性分析请求:', {
        studentsCount: studentEssays.length,
        topicLength: requestBody.topic.length
      });

      const response = await fetch('/api/ai/continuation-writing-common-issues', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      console.log('📡 共性分析API响应状态:', response.status);

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log('✅ 共性分析成功，结果长度:', data.analysis?.length || 0);
          setCommonAnalysis(data.analysis || '');

          if (data.pointsDeducted) {
            console.log('💰 已消耗3积分进行共性分析');
          }
        } else {
          alert(data.error || '共性分析失败');
        }
      } else {
        const errorData = await response.json();
        console.error('❌ API响应错误:', errorData);
        alert(errorData.error || '共性分析请求失败');
      }
    } catch (error) {
      console.error('💥 共性分析失败:', error);
      alert(`共性分析失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const selectedAssignment = completedAssignments.find(a => a.id === selectedStudent);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">查看结果导出</h2>
        <p className="text-gray-600 text-sm">
          查看批改结果统计，支持导出个人结果、全班结果和Excel成绩表。
        </p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.totalStudents}</div>
            <div className="text-sm text-gray-600">总人数</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.averageScore}</div>
            <div className="text-sm text-gray-600">平均分</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">{stats.maxScore}</div>
            <div className="text-sm text-gray-600">最高分</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">{stats.minScore}</div>
            <div className="text-sm text-gray-600">最低分</div>
          </CardContent>
        </Card>
      </div>

      {/* 等级分布 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">成绩等级分布</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-2xl font-bold text-green-600">{stats.excellentCount}</span>
              </div>
              <div className="text-sm font-medium text-green-800">卓越 (21-25分)</div>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-2xl font-bold text-blue-600">{stats.goodCount}</span>
              </div>
              <div className="text-sm font-medium text-blue-800">优秀 (16-20分)</div>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-2xl font-bold text-yellow-600">{stats.passCount}</span>
              </div>
              <div className="text-sm font-medium text-yellow-800">及格 (11-15分)</div>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-2xl font-bold text-red-600">{stats.failCount}</span>
              </div>
              <div className="text-sm font-medium text-red-800">不及格 (0-10分)</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="results" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="results">批改结果</TabsTrigger>
          <TabsTrigger value="export">导出功能</TabsTrigger>
        </TabsList>

        <TabsContent value="results" className="space-y-4">
          {/* 成绩表格 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">成绩明细表</CardTitle>
            </CardHeader>
            <CardContent>
              {completedAssignments.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium">学生姓名</th>
                        <th className="text-left py-3 px-4 font-medium">分数</th>
                        <th className="text-left py-3 px-4 font-medium">等级</th>
                        <th className="text-left py-3 px-4 font-medium">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {completedAssignments.map((assignment) => {
                        const score = assignment.gradingResult!.score;
                        const level = getScoreLevel(score);
                        return (
                          <tr
                            key={assignment.id}
                            className="border-b cursor-pointer hover:bg-gray-50"
                            onClick={() => setSelectedStudent(
                              selectedStudent === assignment.id ? null : assignment.id
                            )}
                          >
                            <td className="py-3 px-4 font-medium">{assignment.student.name}</td>
                            <td className="py-3 px-4">
                              <span className={`font-bold text-lg ${
                                score >= 20 ? 'text-green-600' :
                                score >= 15 ? 'text-blue-600' :
                                score >= 10 ? 'text-yellow-600' :
                                'text-red-600'
                              }`}>
                                {score}/25
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant="secondary" className={level.color}>
                                {level.text}
                              </Badge>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedStudent(
                                      selectedStudent === assignment.id ? null : assignment.id
                                    );
                                  }}
                                  className="flex items-center gap-1"
                                >
                                  <Eye className="w-3 h-3" />
                                  查看
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    exportIndividualResult(assignment);
                                  }}
                                  className="flex items-center gap-1"
                                >
                                  <Download className="w-3 h-3" />
                                  导出
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  暂无批改结果
                </div>
              )}
            </CardContent>
          </Card>

          {/* 详细结果展示 */}
          {selectedAssignment && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>{selectedAssignment.student.name} - 详细批改结果</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedStudent(null)}
                  >
                    收起
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">学生作文</h4>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm leading-relaxed">
                        {selectedAssignment.ocrResult.editedText || selectedAssignment.ocrResult.content}
                      </p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">高分范文</h4>
                    <div className="bg-green-50 rounded-lg p-3">
                      <p className="text-sm leading-relaxed text-green-800">
                        {selectedAssignment.gradingResult!.improvedVersion}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">批改意见</h4>
                    <div className="bg-blue-50 rounded-lg p-3">
                      <p className="text-sm leading-relaxed text-blue-800">
                        {selectedAssignment.gradingResult!.feedback}
                      </p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">整体评价</h4>
                    <div className="bg-yellow-50 rounded-lg p-3">
                      <p className="text-sm leading-relaxed text-yellow-800">
                        {selectedAssignment.gradingResult!.gradingDetails.overallEvaluation}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">详细分析</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">内容要点分析：</span>
                      <p className="text-gray-600 mt-1">
                        {selectedAssignment.gradingResult!.gradingDetails.contentPoints}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">语言错误分析：</span>
                      <p className="text-gray-600 mt-1">
                        {selectedAssignment.gradingResult!.gradingDetails.languageErrors}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">逻辑问题分析：</span>
                      <p className="text-gray-600 mt-1">
                        {selectedAssignment.gradingResult!.gradingDetails.logicalIssues}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">逐句分析：</span>
                      <p className="text-gray-600 mt-1">
                        {selectedAssignment.gradingResult!.gradingDetails.sentenceAnalysis}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

  
        <TabsContent value="export" className="space-y-4">
          {/* 导出提示信息 */}
          <Card className="border-blue-200 bg-blue-50/30">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="text-blue-600 mt-0.5">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-blue-800">导出说明</p>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• <strong>Excel成绩表</strong>：瞬间生成，包含分数统计</li>
                    <li>• <strong>Word文档</strong>：包含详细批改内容，需要 <strong>1-3秒</strong> 生成时间</li>
                    <li>• <strong>大批量导出</strong>：建议 <strong>10人</strong> 为单位分批导出</li>
                    <li>• 导出文件将在浏览器底部自动下载</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">导出选项</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <FileText className="w-6 h-6 text-blue-600" />
                    <h3 className="font-medium">个人结果导出</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    为每个学生生成单独的Word文档，包含作文内容、批改意见和高分范文
                  </p>
                  <div className="flex items-center gap-1 text-xs text-orange-600 mb-3">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                    预计 {Math.ceil(completedAssignments.length * 0.5)}-{Math.ceil(completedAssignments.length * 1)} 秒
                  </div>
                  <Button
                    onClick={() => {
                      console.log('🔥 导出所有个人结果按钮被点击', completedAssignments.length);
                      exportAllResults();
                    }}
                    disabled={completedAssignments.length === 0 || exporting.batch}
                    className="w-full"
                  >
                    {exporting.batch ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        正在生成Word文档... ({completedAssignments.length}名学生)
                      </>
                    ) : (
                      <>
                        <FileText className="w-4 h-4 mr-2" />
                        导出所有个人结果 ({completedAssignments.length})
                      </>
                    )}
                  </Button>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <BarChart3 className="w-6 h-6 text-green-600" />
                    <h3 className="font-medium">Excel成绩表</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    导出Excel格式的成绩统计表，包含所有学生的分数和等级分布
                  </p>
                  <div className="flex items-center gap-1 text-xs text-green-600 mb-3">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    瞬间生成
                  </div>
                  <Button
                    onClick={() => {
                      console.log('🔥 导出Excel成绩表按钮被点击', completedAssignments.length);
                      exportExcel();
                    }}
                    disabled={completedAssignments.length === 0 || exporting.excel}
                    className="w-full"
                    variant="outline"
                  >
                    {exporting.excel ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        正在生成Excel表... ({completedAssignments.length}名学生)
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        导出Excel成绩表 ({completedAssignments.length})
                      </>
                    )}
                  </Button>
                </div>

  
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Download className="w-6 h-6 text-orange-600" />
                    <h3 className="font-medium">完整结果包</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    打包下载所有结果文件，包含个人结果、成绩表和分析报告
                  </p>
                  <div className="flex items-center gap-1 text-xs text-orange-600 mb-3">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                    预计 {Math.ceil(completedAssignments.length * 0.8)}-{Math.ceil(completedAssignments.length * 1.5)} 秒
                  </div>
                  <div className="space-y-2">
                    <Button
                      onClick={exportBatchResultsToZip}
                      disabled={completedAssignments.length === 0 || exporting.zip}
                      className="w-full flex items-center gap-2"
                      variant="default"
                    >
                      {exporting.zip ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          正在打包文档... ({completedAssignments.length}名学生)
                        </>
                      ) : (
                        <>
                          <Package className="w-4 h-4 mr-2" />
                          下载文档包 ({completedAssignments.length})
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={exportCompletePackage}
                      disabled={completedAssignments.length === 0 || exporting.all}
                      className="w-full"
                      variant="outline"
                    >
                      {exporting.all ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          下载完整包中... ({completedAssignments.length})
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 mr-1" />
                          下载完整包 ({completedAssignments.length})
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* 全班共性分析 */}
              <Card className="border-2 border-blue-100 bg-blue-50/30">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-blue-600" />
                      <span>全班共性分析</span>
                    </div>
                    <div className="flex gap-2">
                      {commonAnalysis && (
                        <Button
                          onClick={exportCommonAnalysis}
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          导出Word
                        </Button>
                      )}
                      <Button
                        onClick={analyzeCommonIssues}
                        disabled={isAnalyzing || completedAssignments.length === 0}
                        className="flex items-center gap-2"
                        size="sm"
                      >
                        {isAnalyzing ? (
                          <>
                            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                            分析中...
                          </>
                        ) : (
                          <>
                            <BarChart3 className="w-4 h-4" />
                            开始智能分析
                          </>
                        )}
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {commonAnalysis ? (
                    <div className="prose prose-sm max-w-none">
                      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-blue-800">
                            <FileText className="w-4 h-4" />
                            <span className="text-sm font-medium">分析已完成</span>
                          </div>
                          <Button
                            onClick={exportCommonAnalysis}
                            size="sm"
                            variant="outline"
                            className="text-blue-600 border-blue-200 hover:bg-blue-50"
                          >
                            <Download className="w-3 h-3 mr-1" />
                            下载Word文档
                          </Button>
                        </div>
                      </div>
                      <div className="whitespace-pre-wrap text-sm leading-relaxed bg-gray-50 rounded-lg p-6">
                        {commonAnalysis}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium mb-2">开始AI智能分析</p>
                      <p className="text-sm">
                        点击上方按钮，使用AI模型分析全班学生读后续写的共性问题
                      </p>
                      <div className="mt-4 text-xs text-gray-400">
                        <p>• 消耗3积分</p>
                        <p>• 分析时间约30-60秒</p>
                        <p>• 生成个性化教学建议</p>
                        <p>• 支持导出Word文档</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 操作按钮 */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev}>
          上一步
        </Button>
        <div className="text-center text-sm text-gray-500">
          批改完成时间：{new Date().toLocaleString()}
        </div>
      </div>
    </div>
  );
};

export default ContinuationWritingResultTable;