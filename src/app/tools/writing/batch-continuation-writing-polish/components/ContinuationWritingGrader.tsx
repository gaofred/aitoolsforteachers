"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle, AlertCircle, Play, Pause, RotateCcw, Download, Eye } from "lucide-react";
import type { ContinuationWritingBatchTask, ContinuationWritingAssignment, ContinuationWritingGradingResult, ProcessingStats } from "../types";

interface ContinuationWritingGraderProps {
  task: ContinuationWritingBatchTask | null;
  setTask: (task: ContinuationWritingBatchTask | null) => void;
  onNext: () => void;
  onPrev: () => void;
  onMediumStandard?: () => void;
  processingStats: ProcessingStats;
  setProcessingStats: (stats: ProcessingStats) => void;
  isGradingCompleted: boolean;
  setIsGradingCompleted: (completed: boolean) => void;
  userId?: string;
}

const ContinuationWritingGrader: React.FC<ContinuationWritingGraderProps> = ({
  task,
  setTask,
  onNext,
  onPrev,
  processingStats,
  setProcessingStats,
  isGradingCompleted,
  setIsGradingCompleted,
  userId
}) => {
  const [isGrading, setIsGrading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentAssignmentIndex, setCurrentAssignmentIndex] = useState(0);
  const [gradingProgress, setGradingProgress] = useState(0);
  const [gradingMessage, setGradingMessage] = useState("");
  const [showDetailedView, setShowDetailedView] = useState<string | null>(null);

  const assignments = task?.assignments || [];
  const pendingAssignments = assignments.filter(a => a.status === 'pending');
  const completedAssignments = assignments.filter(a => a.status === 'completed');

  // 计算点数消耗
  const calculatePointsCost = () => {
    return pendingAssignments.length * 2; // 每个学生2点数
  };

  // 开始批改
  const startGrading = async () => {
    if (pendingAssignments.length === 0) return;

    setIsGrading(true);
    setIsPaused(false);
    setIsGradingCompleted(false);
    setCurrentAssignmentIndex(0);
    setGradingProgress(0);
    setGradingMessage("准备开始AI批改...");

    const startTime = Date.now();

    try {
      // 重置统计信息
      setProcessingStats(prev => ({
        ...prev,
        totalApplications: pendingAssignments.length,
        gradedApplications: 0,
        errors: [],
        averageScore: 0,
        processingTime: 0
      }));

      // 逐个批改作业
      for (let i = 0; i < pendingAssignments.length; i++) {
        if (isPaused) {
          setGradingMessage("批改已暂停，点击继续按钮恢复...");
          await new Promise(resolve => {
            const checkPause = setInterval(() => {
              if (!isPaused) {
                clearInterval(checkPause);
                resolve(undefined);
              }
            }, 100);
          });
        }

        if (!isGrading) break; // 如果被取消则停止

        const assignment = pendingAssignments[i];
        setCurrentAssignmentIndex(i);
        setGradingProgress((i / pendingAssignments.length) * 100);
        setGradingMessage(`正在批改 ${assignment.student.name} 的读后续写... (${i + 1}/${pendingAssignments.length})`);

        try {
          // 调用AI批改接口
          const gradingResponse = await fetch('/api/continuation-writing-grade', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              studentName: assignment.student.name,
              content: assignment.ocrResult.editedText || assignment.ocrResult.content,
              topic: task?.topic || '',
              useMediumStandard: task?.useMediumStandard || false,
              userId: userId
            }),
          });

          if (!gradingResponse.ok) {
            throw new Error(`批改请求失败: ${gradingResponse.status}`);
          }

          const gradingData = await gradingResponse.json();

          if (gradingData.error) {
            throw new Error(gradingData.error);
          }

          // 创建批改结果
          const gradingResult: ContinuationWritingGradingResult = {
            score: gradingData.score || 0,
            feedback: gradingData.feedback || '',
            improvedVersion: gradingData.improvedVersion || '',
            gradingDetails: {
              contentPoints: gradingData.gradingDetails?.contentPoints || '',
              languageErrors: gradingData.gradingDetails?.languageErrors || '',
              logicalIssues: gradingData.gradingDetails?.logicalIssues || '',
              sentenceAnalysis: gradingData.gradingDetails?.sentenceAnalysis || '',
              overallEvaluation: gradingData.gradingDetails?.overallEvaluation || ''
            },
            gradedAt: new Date()
          };

          // 更新作业状态
          const updatedAssignments = assignments.map(a => {
            if (a.id === assignment.id) {
              return {
                ...a,
                gradingResult,
                status: 'completed' as const
              };
            }
            return a;
          });

          if (task) {
            setTask({
              ...task,
              assignments: updatedAssignments
            });
          }

          // 更新统计信息
          const newCompletedCount = completedAssignments.length + i + 1;
          const totalScore = updatedAssignments
            .filter(a => a.gradingResult)
            .reduce((sum, a) => sum + (a.gradingResult?.score || 0), 0);
          const averageScore = totalScore / newCompletedCount;

          setProcessingStats(prev => ({
            ...prev,
            gradedApplications: newCompletedCount,
            averageScore: Math.round(averageScore * 100) / 100
          }));

        } catch (error) {
          console.error(`批改 ${assignment.student.name} 的作业失败:`, error);
          const errorMessage = error instanceof Error ? error.message : '批改失败';

          // 标记为失败
          const updatedAssignments = assignments.map(a => {
            if (a.id === assignment.id) {
              return {
                ...a,
                status: 'failed' as const
              };
            }
            return a;
          });

          if (task) {
            setTask({
              ...task,
              assignments: updatedAssignments
            });
          }

          // 记录错误
          setProcessingStats(prev => ({
            ...prev,
            errors: [...prev.errors, `${assignment.student.name}: ${errorMessage}`]
          }));
        }

        // 添加延迟以避免API限流
        if (i < pendingAssignments.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      const processingTime = Date.now() - startTime;

      // 更新最终统计信息
      setProcessingStats(prev => ({
        ...prev,
        processingTime: prev.processingTime + processingTime
      }));

      setGradingProgress(100);
      setGradingMessage("批改完成！");
      setIsGradingCompleted(true);

    } catch (error) {
      console.error('批量批改失败:', error);
      setGradingMessage("批改过程中发生错误");
    } finally {
      setIsGrading(false);
      setCurrentAssignmentIndex(0);
    }
  };

  // 暂停/继续批改
  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  // 停止批改
  const stopGrading = () => {
    setIsGrading(false);
    setIsPaused(false);
    setGradingMessage("批改已停止");
    setCurrentAssignmentIndex(0);
  };

  // 重新开始批改失败的作业
  const retryFailedAssignments = async () => {
    const failedAssignments = assignments.filter(a => a.status === 'failed');
    if (failedAssignments.length === 0) return;

    // 重置失败作业的状态
    const updatedAssignments = assignments.map(a => {
      if (a.status === 'failed') {
        return {
          ...a,
          status: 'pending' as const,
          gradingResult: undefined
        };
      }
      return a;
    });

    if (task) {
      setTask({
        ...task,
        assignments: updatedAssignments
      });
    }

    // 重新开始批改
    setTimeout(() => {
      startGrading();
    }, 100);
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
          topic: task?.topic || ''
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">AI批改</h2>
        <p className="text-gray-600 text-sm">
          系统将对所有学生的读后续写进行AI智能批改，提供详细的评分和反馈。
        </p>
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{assignments.length}</div>
            <div className="text-sm text-gray-600">总作业数</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{completedAssignments.length}</div>
            <div className="text-sm text-gray-600">已批改</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">{pendingAssignments.length}</div>
            <div className="text-sm text-gray-600">待批改</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">
              {processingStats.averageScore > 0 ? processingStats.averageScore.toFixed(1) : '-'}
            </div>
            <div className="text-sm text-gray-600">平均分</div>
          </CardContent>
        </Card>
      </div>

      {/* 批改控制面板 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">批改控制</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {pendingAssignments.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-800">
                  预计消耗点数：{calculatePointsCost()} 点
                </span>
                <span className="text-sm text-blue-600">
                  单个作业：2点
                </span>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            {!isGrading ? (
              <>
                <Button
                  onClick={startGrading}
                  disabled={pendingAssignments.length === 0}
                  className="flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  开始批改
                </Button>

                {assignments.some(a => a.status === 'failed') && (
                  <Button
                    variant="outline"
                    onClick={retryFailedAssignments}
                    className="flex items-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    重试失败项
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={togglePause}
                  className="flex items-center gap-2"
                >
                  {isPaused ? (
                    <>
                      <Play className="w-4 h-4" />
                      继续
                    </>
                  ) : (
                    <>
                      <Pause className="w-4 h-4" />
                      暂停
                    </>
                  )}
                </Button>
                <Button
                  variant="destructive"
                  onClick={stopGrading}
                  className="flex items-center gap-2"
                >
                  停止
                </Button>
              </>
            )}
          </div>

          {/* 进度条 */}
          {isGrading && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{gradingMessage}</span>
                <span className="text-sm text-gray-600">
                  {Math.round(gradingProgress)}%
                </span>
              </div>
              <Progress value={gradingProgress} className="h-2" />
            </div>
          )}

          {/* 错误信息 */}
          {processingStats.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <h4 className="text-sm font-medium text-red-800 mb-2">批改错误：</h4>
              <ul className="text-sm text-red-700 space-y-1">
                {processingStats.errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 批改结果列表 */}
      {assignments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">批改结果</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {assignments.map((assignment) => (
                <div key={assignment.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold">{assignment.student.name}</h3>
                        <Badge
                          variant={
                            assignment.status === 'completed' ? 'default' :
                            assignment.status === 'failed' ? 'destructive' : 'secondary'
                          }
                        >
                          {assignment.status === 'completed' && '已完成'}
                          {assignment.status === 'failed' && '失败'}
                          {assignment.status === 'pending' && '待批改'}
                        </Badge>
                        {assignment.gradingResult && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">得分:</span>
                            <span className={`text-lg font-bold ${
                              assignment.gradingResult.score >= 80 ? 'text-green-600' :
                              assignment.gradingResult.score >= 60 ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {assignment.gradingResult.score}/15
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {assignment.gradingResult && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => exportIndividualResult(assignment)}
                            className="flex items-center gap-1"
                          >
                            <Download className="w-3 h-3" />
                            导出
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowDetailedView(
                              showDetailedView === assignment.id ? null : assignment.id
                            )}
                            className="flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" />
                            {showDetailedView === assignment.id ? '收起' : '详情'}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* 详细批改信息 */}
                  {assignment.gradingResult && showDetailedView === assignment.id && (
                    <div className="mt-4 space-y-3 border-t pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">批改意见</h4>
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {assignment.gradingResult.feedback}
                          </p>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">高分范文</h4>
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {assignment.gradingResult.improvedVersion}
                          </p>
                        </div>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-3">
                        <h4 className="font-medium text-gray-900 mb-2">详细批改</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="font-medium">内容要点：</span>
                            <p className="text-gray-700 mt-1">
                              {assignment.gradingResult.gradingDetails.contentPoints}
                            </p>
                          </div>
                          <div>
                            <span className="font-medium">语言错误：</span>
                            <p className="text-gray-700 mt-1">
                              {assignment.gradingResult.gradingDetails.languageErrors}
                            </p>
                          </div>
                          <div>
                            <span className="font-medium">逻辑问题：</span>
                            <p className="text-gray-700 mt-1">
                              {assignment.gradingResult.gradingDetails.logicalIssues}
                            </p>
                          </div>
                          <div>
                            <span className="font-medium">整体评价：</span>
                            <p className="text-gray-700 mt-1">
                              {assignment.gradingResult.gradingDetails.overallEvaluation}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 操作按钮 */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev}>
          上一步
        </Button>
        <Button
          onClick={onNext}
          disabled={completedAssignments.length === 0}
          className="px-8"
        >
          下一步：查看结果导出
        </Button>
      </div>
    </div>
  );
};

export default ContinuationWritingGrader;