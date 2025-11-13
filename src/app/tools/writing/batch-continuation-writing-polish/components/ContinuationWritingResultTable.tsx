"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, FileText, TrendingUp, TrendingDown, BarChart3, Eye, Edit } from "lucide-react";
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

  if (!task) return null;

  const assignments = task.assignments || [];
  const completedAssignments = assignments.filter(a => a.status === 'completed' && a.gradingResult);

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
        scoreDistribution: [0, 0, 0, 0, 0] // 0-3, 4-6, 7-9, 10-12, 13-15
      };
    }

    const scores = completedAssignments.map(a => a.gradingResult!.score);
    const totalScore = scores.reduce((sum, score) => sum + score, 0);
    const averageScore = totalScore / scores.length;
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);

    const excellentCount = scores.filter(s => s >= 13).length; // 优秀
    const goodCount = scores.filter(s => s >= 10 && s < 13).length; // 良好
    const passCount = scores.filter(s => s >= 7 && s < 10).length; // 及格
    const failCount = scores.filter(s => s < 7).length; // 不及格

    const scoreDistribution = [
      scores.filter(s => s <= 3).length,
      scores.filter(s => s > 3 && s <= 6).length,
      scores.filter(s => s > 6 && s <= 9).length,
      scores.filter(s => s > 9 && s <= 12).length,
      scores.filter(s => s > 12).length
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
    if (score >= 13) return { text: '优秀', color: 'bg-green-100 text-green-800' };
    if (score >= 10) return { text: '良好', color: 'bg-blue-100 text-blue-800' };
    if (score >= 7) return { text: '及格', color: 'bg-yellow-100 text-yellow-800' };
    return { text: '不及格', color: 'bg-red-100 text-red-800' };
  };

  // 导出单个学生结果
  const exportIndividualResult = async (assignment: ContinuationWritingAssignment) => {
    if (!assignment.gradingResult) return;

    try {
      const response = await fetch('/api/export/individual-result', {
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
        a.download = `${assignment.student.name}_读后续写批改结果.docx`;
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

  // 导出全班结果
  const exportAllResults = async () => {
    try {
      const response = await fetch('/api/export/batch-results', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskTitle: task.title,
          topic: task.topic,
          assignments: completedAssignments,
          stats: stats,
          type: 'continuation-writing'
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `全班读后续写批改结果_${new Date().toLocaleDateString()}.docx`;
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

  // 导出Excel表格
  const exportExcel = async () => {
    try {
      const response = await fetch('/api/export/excel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskTitle: task.title,
          topic: task.topic,
          assignments: completedAssignments,
          stats: stats,
          type: 'continuation-writing'
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `读后续写批改成绩表_${new Date().toLocaleDateString()}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Excel导出失败');
      }
    } catch (error) {
      console.error('Excel导出失败:', error);
      alert('Excel导出失败');
    }
  };

  // 生成班级分析报告
  const generateClassAnalysis = async () => {
    try {
      const response = await fetch('/api/export/class-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskTitle: task.title,
          topic: task.topic,
          assignments: completedAssignments,
          stats: stats,
          type: 'continuation-writing'
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `读后续写班级分析报告_${new Date().toLocaleDateString()}.docx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('分析报告导出失败');
      }
    } catch (error) {
      console.error('分析报告导出失败:', error);
      alert('分析报告导出失败');
    }
  };

  const selectedAssignment = completedAssignments.find(a => a.id === selectedStudent);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">查看结果导出</h2>
        <p className="text-gray-600 text-sm">
          查看批改结果统计，支持导出个人结果、全班结果、Excel成绩表和班级分析报告。
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
              <div className="text-sm font-medium text-green-800">优秀 (13-15分)</div>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-2xl font-bold text-blue-600">{stats.goodCount}</span>
              </div>
              <div className="text-sm font-medium text-blue-800">良好 (10-12分)</div>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-2xl font-bold text-yellow-600">{stats.passCount}</span>
              </div>
              <div className="text-sm font-medium text-yellow-800">及格 (7-9分)</div>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-2xl font-bold text-red-600">{stats.failCount}</span>
              </div>
              <div className="text-sm font-medium text-red-800">不及格 (0-6分)</div>
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
                                score >= 13 ? 'text-green-600' :
                                score >= 10 ? 'text-blue-600' :
                                score >= 7 ? 'text-yellow-600' :
                                'text-red-600'
                              }`}>
                                {score}/15
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
                  <p className="text-sm text-gray-600 mb-3">
                    为每个学生生成单独的Word文档，包含作文内容、批改意见和高分范文
                  </p>
                  <Button
                    onClick={exportAllResults}
                    disabled={completedAssignments.length === 0}
                    className="w-full"
                  >
                    导出所有个人结果
                  </Button>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <BarChart3 className="w-6 h-6 text-green-600" />
                    <h3 className="font-medium">Excel成绩表</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    导出Excel格式的成绩统计表，包含所有学生的分数和等级分布
                  </p>
                  <Button
                    onClick={exportExcel}
                    disabled={completedAssignments.length === 0}
                    className="w-full"
                    variant="outline"
                  >
                    导出Excel成绩表
                  </Button>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <TrendingUp className="w-6 h-6 text-purple-600" />
                    <h3 className="font-medium">班级分析报告</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    生成详细的班级分析报告，包含成绩统计、共性问题分析和教学建议
                  </p>
                  <Button
                    onClick={generateClassAnalysis}
                    disabled={completedAssignments.length === 0}
                    className="w-full"
                    variant="outline"
                  >
                    生成分析报告
                  </Button>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Download className="w-6 h-6 text-orange-600" />
                    <h3 className="font-medium">完整结果包</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    打包下载所有结果文件，包含个人结果、成绩表和分析报告
                  </p>
                  <Button
                    onClick={() => {
                      exportAllResults();
                      setTimeout(() => exportExcel(), 1000);
                      setTimeout(() => generateClassAnalysis(), 2000);
                    }}
                    disabled={completedAssignments.length === 0}
                    className="w-full"
                    variant="outline"
                  >
                    下载完整包
                  </Button>
                </div>
              </div>
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