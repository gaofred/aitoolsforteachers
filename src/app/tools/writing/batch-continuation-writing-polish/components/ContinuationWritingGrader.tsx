"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle, AlertCircle, Play, Pause, RotateCcw, Download, Eye, RefreshCw } from "lucide-react";
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
  const [completedCount, setCompletedCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6;

  const assignments = task?.assignments || [];
  const pendingAssignments = assignments.filter(a => a.status === 'pending');
  const completedAssignments = assignments.filter(a => a.status === 'completed');

  // 分页计算
  const totalPages = Math.ceil(assignments.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentAssignments = assignments.slice(startIndex, endIndex);

  // 重置页码，当作业数量变化时
  useEffect(() => {
    const maxPage = Math.ceil(assignments.length / ITEMS_PER_PAGE);
    if (currentPage > maxPage && maxPage > 0) {
      setCurrentPage(maxPage);
    }
  }, [assignments.length, currentPage]);

  // 调试日志
  console.log('🔍 AI批改组件调试信息:', {
    taskTitle: task?.title,
    assignmentsCount: assignments.length,
    pendingCount: pendingAssignments.length,
    completedCount: completedAssignments.length,
    assignments: assignments.map(a => ({
      id: a.id,
      student: a.student.name,
      status: a.status
    }))
  });

  // 计算点数消耗
  const calculatePointsCost = () => {
    return pendingAssignments.length * 1; // 每个学生1点数
  };

  // 单独批改某个学生的作文
  const gradeSingleAssignment = async (assignment: ContinuationWritingAssignment) => {
    if (!confirm(`确定要单独批改「${assignment.student.name}」的作文吗？将消耗1点数。`)) {
      return;
    }

    setIsGrading(true);
    setGradingMessage(`🎯 正在单独批改 ${assignment.student.name} 的作文...`);

    try {
      console.log(`🎯 开始单独批改: ${assignment.student.name}`);

      // 调用批改函数
      const result = await gradeAssignment(assignment, 0, 1, (completed, total, assignmentName, success) => {
        setGradingMessage(`🎯 正在批改 ${assignmentName}${success ? ' ✅' : ' ❌'}`);
      });

      if (result.success && result.gradingResult) {
        // 更新作业状态和结果
        const updatedAssignments = assignments.map(a =>
          a.id === assignment.id
            ? {
                ...a,
                status: 'completed' as const,
                gradingResult: result.gradingResult
              }
            : a
        );

        if (task) {
          setTask({
            ...task,
            assignments: updatedAssignments
          });
        }

        // 更新统计
        setProcessingStats(prev => ({
          ...prev,
          gradedApplications: prev.gradedApplications + 1,
          totalApplications: prev.totalApplications,
          averageScore: (prev.averageScore * prev.gradedApplications + result.gradingResult.score) / (prev.gradedApplications + 1),
          processingTime: prev.processingTime,
          errors: prev.errors
        }));

        setGradingMessage(`🎉 ${assignment.student.name} 作文批改完成！得分：${result.gradingResult.score}/25分`);
      } else {
        // 更新为失败状态
        const updatedAssignments = assignments.map(a =>
          a.id === assignment.id
            ? {
                ...a,
                status: 'failed' as const,
                gradingResult: undefined
              }
            : a
        );

        if (task) {
          setTask({
            ...task,
            assignments: updatedAssignments
          });
        }

        setGradingMessage(`❌ ${assignment.student.name} 作文批改失败: ${result.error || '未知错误'}`);
      }
    } catch (error) {
      console.error(`💥 单独批改失败:`, error);
      setGradingMessage(`💥 ${assignment.student.name} 作文批改过程中发生错误`);
    } finally {
      setIsGrading(false);
    }
  };

  // 单个作业批改函数 - 添加实时进度回调
  const gradeAssignment = async (
    assignment: ContinuationWritingAssignment,
    index: number,
    total: number,
    onProgress?: (completed: number, total: number, assignmentName: string, success: boolean) => void
  ): Promise<{ success: boolean; assignmentId: string; gradingResult?: ContinuationWritingGradingResult; error?: string }> => {
    try {
      console.log(`🔄 开始批改第 ${index + 1} 个作业: ${assignment.student.name}`);

      // 检查作业数据
      if (!assignment || !assignment.ocrResult) {
        throw new Error('作业数据不完整');
      }

      const content = assignment.ocrResult.editedText || assignment.ocrResult.content;
      if (!content) {
        throw new Error('作文内容为空');
      }

      console.log('📋 作业数据检查通过:', {
        assignmentId: assignment.id,
        studentName: assignment.student.name,
        contentLength: content.length
      });

      // 调用AI批改接口
      const requestBody = {
        studentName: assignment.student.name,
        content: content,
        topic: task?.topic || '',
        plotAnalysis: task?.plotAnalysis || '',
        useMediumStandard: task?.useMediumStandard || false,
        userId: userId,
        includeDetailedFeedback: true,
        wordCount: assignment.ocrResult.wordCount || 0,
        p1Content: task?.p1Content || '',
        p2Content: task?.p2Content || ''
      };

      console.log('📤 发送API请求:', requestBody.studentName);

      const gradingResponse = await fetch('/api/continuation-writing-grade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
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
        detailedFeedback: gradingData.detailedFeedback || '',
        gradingDetails: {
          contentPoints: gradingData.gradingDetails?.contentPoints || '',
          languageErrors: gradingData.gradingDetails?.languageErrors || '',
          logicalIssues: gradingData.gradingDetails?.logicalIssues || '',
          sentenceAnalysis: gradingData.gradingDetails?.sentenceAnalysis || '',
          overallEvaluation: gradingData.gradingDetails?.overallEvaluation || ''
        },
        gradedAt: new Date()
      };

      console.log('✅ 批改完成:', assignment.student.name, '得分:', gradingResult.score);

      // 调用进度回调通知前端
      if (onProgress) {
        onProgress(index + 1, total, assignment.student.name, true, assignment.id, gradingResult);
      }

      return {
        success: true,
        assignmentId: assignment.id,
        gradingResult
      };

    } catch (error) {
      console.error(`❌ 批改失败: ${assignment.student.name}`, error);
      const errorMessage = error instanceof Error ? error.message : '批改失败';

      // 调用进度回调通知前端（即使失败也要通知）
      if (onProgress) {
        onProgress(index + 1, total, assignment.student.name, false, assignment.id);
      }

      return {
        success: false,
        assignmentId: assignment.id,
        error: errorMessage
      };
    }
  };

  // 开始并行批改
  const startGrading = async () => {
    console.log('🚀 开始并行批改函数被调用', {
      pendingCount: pendingAssignments.length,
      userId: userId
    });

    if (pendingAssignments.length === 0) {
      console.warn('⚠️ 没有待批改的作业');
      return;
    }

    setIsGrading(true);
    setIsPaused(false);
    setIsGradingCompleted(false);
    setCompletedCount(0);
    setErrorCount(0);
    setGradingProgress(0);
    setGradingMessage(`🚀 正在启动AI批改引擎，准备高速处理 ${pendingAssignments.length} 份作文...`);

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

      setGradingMessage(`⚡ AI批改系统全速运转中，正在智能分析 ${pendingAssignments.length} 份作文...`);

      // 创建并行批改任务数组，每批26个作业
      const BATCH_SIZE = 26; // 每批处理26个，与OCR保持一致的超级并行度
      const batches: ContinuationWritingAssignment[][] = [];

      for (let i = 0; i < pendingAssignments.length; i += BATCH_SIZE) {
        batches.push(pendingAssignments.slice(i, i + BATCH_SIZE));
      }

      console.log(`📦 分成 ${batches.length} 批处理，每批 ${BATCH_SIZE} 个`);

      // 创建实时进度更新回调
      const updateProgress = (completed: number, total: number, assignmentName: string, success: boolean, assignmentId?: string, gradingResult?: ContinuationWritingGradingResult) => {
        const progressPercentage = (completed / total) * 100;
        setGradingProgress(progressPercentage);

        // 立即更新单个作业状态
        if (assignmentId && success && gradingResult) {
          setTask(prevTask => {
            if (!prevTask) return prevTask;

            const updatedAssignments = prevTask.assignments.map(a => {
              if (a.id === assignmentId) {
                return {
                  ...a,
                  gradingResult,
                  status: 'completed' as const
                };
              }
              return a;
            });

            return {
              ...prevTask,
              assignments: updatedAssignments
            };
          });
        } else if (assignmentId && !success) {
          setTask(prevTask => {
            if (!prevTask) return prevTask;

            const updatedAssignments = prevTask.assignments.map(a => {
              if (a.id === assignmentId) {
                return {
                  ...a,
                  status: 'failed' as const
                };
              }
              return a;
            });

            return {
              ...prevTask,
              assignments: updatedAssignments
            };
          });
        }

        // 实时更新统计信息
        setProcessingStats(prev => {
          const newGradedApplications = success ? prev.gradedApplications + 1 : prev.gradedApplications;
          const newErrors = success ? prev.errors : [...prev.errors, `${assignmentName}: 批改失败`];

          return {
            ...prev,
            gradedApplications: newGradedApplications,
            errors: newErrors
          };
        });

        // 更新计数器显示
        setCompletedCount(prev => success ? prev + 1 : prev);
        setErrorCount(prev => success ? prev : prev + 1);

        setGradingMessage(`已完成 ${completed}/${total} 份 - 最新: ${assignmentName} ${success ? '✅' : '❌'}`);
      };

      let allResults: Array<{ success: boolean; assignmentId: string; gradingResult?: ContinuationWritingGradingResult; error?: string }> = [];

      // 逐批处理
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];

        setGradingMessage(`🔥 正在高速批改中，请耐心等待... (第 ${batchIndex + 1}/${batches.length} 批，${batch.length} 个作业)`);

        console.log(`🔄 开始处理第 ${batchIndex + 1} 批，包含 ${batch.length} 个作业`);

        // 创建带进度回调的并行处理任务
        const batchPromises = batch.map((assignment, index) =>
          gradeAssignment(
            assignment,
            batchIndex * BATCH_SIZE + index,
            pendingAssignments.length,
            updateProgress
          )
        );

        // 等待当前批次完成
        const batchResults = await Promise.allSettled(batchPromises);

        // 处理批次结果
        const settledResults = batchResults.map(result => {
          if (result.status === 'fulfilled') {
            return result.value;
          } else {
            console.error('批次中某个作业失败:', result.reason);
            return {
              success: false,
              assignmentId: 'unknown',
              error: result.reason?.message || '未知错误'
            };
          }
        });

        allResults = allResults.concat(settledResults);

        // 批次间添加短暂延迟，避免API限流
        if (batchIndex < batches.length - 1) {
          setGradingMessage(`✅ 第 ${batchIndex + 1} 批批改完成！稍作休整后继续下一批...`);
          await new Promise(resolve => setTimeout(resolve, 3000)); // 增加延迟到3秒
        }
      }

      console.log('✅ 所有批次处理完成，计算最终统计信息');

      // 计算最终统计信息
      const successCount = allResults.filter(r => r.success).length;
      const failCount = allResults.filter(r => !r.success).length;
      const totalScore = allResults
        .filter(r => r.success && r.gradingResult)
        .reduce((sum, r) => sum + (r.gradingResult?.score || 0), 0);
      const averageScore = successCount > 0 ? totalScore / successCount : 0;

      // 最终更新统计信息
      setProcessingStats(prev => ({
        ...prev,
        gradedApplications: successCount,
        errors: allResults.filter(r => !r.success).map(r => r.error || '未知错误'),
        averageScore: Math.round(averageScore * 100) / 100,
        processingTime: Date.now() - startTime
      }));

      setGradingProgress(100);
      setGradingMessage(`🎉 批改完成！成功处理 ${successCount} 份作文，失败 ${failCount} 份，平均分 ${averageScore.toFixed(1)} 分，总耗时 ${Math.round((Date.now() - startTime) / 1000)} 秒！`);
      setIsGradingCompleted(true);

    } catch (error) {
      console.error('并行批改失败:', error);
      setGradingMessage("并行批改过程中发生错误");
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

  // 重新批改单个作业
  const retrySingleAssignment = async (assignmentId: string) => {
    console.log('🔄 开始重新批改单个作业:', assignmentId);

    // 重置单个作业状态
    const updatedAssignments = assignments.map(a => {
      if (a.id === assignmentId) {
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

    // 找到要重新批改的作业
    const assignmentToRetry = updatedAssignments.find(a => a.id === assignmentId);
    if (!assignmentToRetry || !assignmentToRetry.ocrResult) {
      console.error('❌ 找不到要重新批改的作业');
      return;
    }

    try {
      // 调用批改API
      const content = assignmentToRetry.ocrResult.editedText || assignmentToRetry.ocrResult.content;
      if (!content) {
        throw new Error('作文内容为空');
      }

      const requestBody = {
        studentName: assignmentToRetry.student.name,
        content: content,
        topic: task?.topic || '',
        plotAnalysis: task?.plotAnalysis || '',
        useMediumStandard: task?.useMediumStandard || false,
        userId: userId,
        includeDetailedFeedback: true,
        wordCount: assignmentToRetry.ocrResult.wordCount || 0,
        p1Content: task?.p1Content || '',
        p2Content: task?.p2Content || ''
      };

      console.log('📤 重新批改API请求:', requestBody.studentName);

      const gradingResponse = await fetch('/api/continuation-writing-grade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
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
        detailedFeedback: gradingData.detailedFeedback || '',
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
      setTask(prevTask => {
        if (!prevTask) return prevTask;

        return {
          ...prevTask,
          assignments: prevTask.assignments.map(a => {
            if (a.id === assignmentId) {
              console.log('✅ 重新批改完成:', {
                assignmentId: a.id,
                studentName: a.student.name,
                score: gradingResult.score
              });
              return {
                ...a,
                gradingResult,
                status: 'completed' as const
              };
            }
            return a;
          })
        };
      });

    } catch (error) {
      console.error(`重新批改 ${assignmentToRetry.student.name} 失败:`, error);

      // 标记为失败
      setTask(prevTask => {
        if (!prevTask) return prevTask;

        return {
          ...prevTask,
          assignments: prevTask.assignments.map(a => {
            if (a.id === assignmentId) {
              return {
                ...a,
                status: 'failed' as const
              };
            }
            return a;
          })
        };
      });

      // 记录错误
      setProcessingStats(prev => ({
        ...prev,
        errors: [...prev.errors, `${assignmentToRetry.student.name}: ${error instanceof Error ? error.message : '重新批改失败'}`]
      }));
    }
  };

  // 导出单个学生结果
  const exportIndividualResult = async (assignment: ContinuationWritingAssignment) => {
    if (!assignment.gradingResult) return;

    try {
      // 创建导出内容
      const exportContent = `
读后续写批改报告
================

学生姓名：${assignment.student.name}
批改时间：${assignment.gradingResult.gradedAt.toLocaleString('zh-CN')}
题目：${task?.topic || '读后续写'}
得分：${assignment.gradingResult.score}/25分

学生作文原文：
${assignment.ocrResult.editedText || assignment.ocrResult.content}

${assignment.gradingResult.detailedFeedback ? `

完整细致批改：
${assignment.gradingResult.detailedFeedback}` : ''}

${assignment.gradingResult.improvedVersion ? `

升格范文：
${assignment.gradingResult.improvedVersion}` : ''}
      `;

      const blob = new Blob([exportContent], { type: 'text/plain;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${assignment.student.name}_读后续写批改结果.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
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
                    className="flex items-center gap-2 text-orange-600 border-orange-300 hover:bg-orange-50"
                  >
                    <RotateCcw className="w-4 h-4" />
                    重试失败项 ({assignments.filter(a => a.status === 'failed').length})
                  </Button>
                )}

                {/* 添加重新批改所有已完成作业的按钮 */}
                {completedAssignments.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (confirm('确定要重新批改所有已完成的学生作业吗？这将消耗额外的点数。')) {
                        // 重置所有已完成作业为待批改状态
                        const updatedAssignments = assignments.map(a => ({
                          ...a,
                          status: 'pending' as const,
                          gradingResult: undefined
                        }));

                        if (task) {
                          setTask({
                            ...task,
                            assignments: updatedAssignments
                          });
                        }

                        // 延迟开始批改
                        setTimeout(() => {
                          startGrading();
                        }, 100);
                      }
                    }}
                    className="flex items-center gap-2 text-blue-600 border-blue-300 hover:bg-blue-50"
                  >
                    <RefreshCw className="w-4 h-4" />
                    重新批改全部
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

          {/* 进度条和实时状态 */}
          {isGrading && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-blue-600">{gradingMessage}</span>
                <span className="text-sm font-bold text-blue-600">
                  {Math.round(gradingProgress)}%
                </span>
              </div>
              <Progress value={gradingProgress} className="h-3" />

              {/* 实时统计显示 */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-green-50 rounded p-2">
                  <div className="text-lg font-bold text-green-600">
                    {processingStats.gradedApplications}
                  </div>
                  <div className="text-xs text-green-600">已完成</div>
                </div>
                <div className="bg-orange-50 rounded p-2">
                  <div className="text-lg font-bold text-orange-600">
                    {errorCount}
                  </div>
                  <div className="text-xs text-orange-600">失败</div>
                </div>
                <div className="bg-blue-50 rounded p-2">
                  <div className="text-lg font-bold text-blue-600">
                    {processingStats.averageScore > 0 ? processingStats.averageScore.toFixed(1) : '-'}
                  </div>
                  <div className="text-xs text-blue-600">平均分</div>
                </div>
              </div>
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
            <CardTitle className="text-lg flex items-center justify-between">
              <span>批改结果</span>
              <div className="text-sm font-normal text-gray-600">
                第 {currentPage}/{totalPages} 页 · 共 {assignments.length} 个学生
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[800px] overflow-y-auto pr-2">
              {currentAssignments.map((assignment) => (
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
                              {assignment.gradingResult.score}/25
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {/* 单独批改按钮 - 对所有状态的学生都显示 */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => gradeSingleAssignment(assignment)}
                        disabled={isGrading}
                        className="flex items-center gap-1 text-blue-600 border-blue-300 hover:bg-blue-50"
                      >
                        <RefreshCw className="w-3 h-3" />
                        单独批改
                      </Button>

                      {assignment.status === 'failed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => retrySingleAssignment(assignment.id)}
                          className="flex items-center gap-1 text-orange-600 border-orange-300 hover:bg-orange-50"
                        >
                          <RotateCcw className="w-3 h-3" />
                          重试失败
                        </Button>
                      )}
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
                  {assignment.gradingResult && (
                    <div className="mt-4 space-y-4 border-t pt-4">
                      {/* AI分数和基础反馈 */}
                      <div className="bg-gray-50 rounded-lg p-3">
                        <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                          <span>AI批改结果</span>
                          <span className="text-sm text-gray-600">({assignment.gradingResult.gradedAt.toLocaleString('zh-CN')})</span>
                        </h4>
                        <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto p-2 bg-white rounded border">
                          {assignment.gradingResult.feedback}
                        </div>
                      </div>

                      {/* 详细批改内容 */}
                      {assignment.gradingResult.detailedFeedback && (
                        <div className="bg-blue-50 rounded-lg p-4">
                          <h4 className="font-medium text-blue-900 mb-3">完整细致批改报告</h4>
                          <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto p-3 bg-white rounded border">
                            {assignment.gradingResult.detailedFeedback}
                          </div>
                          <div className="mt-3 flex items-center justify-between">
                            <p className="text-xs text-blue-700">
                              包含详细的错误分析、逐句修改建议和升格范文
                            </p>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const downloadContent = `
学生姓名：${assignment.student.name}
批改时间：${assignment.gradingResult.gradedAt.toLocaleString('zh-CN')}
得分：${assignment.gradingResult.score}/25分

${assignment.gradingResult.detailedFeedback}
                                `;
                                const blob = new Blob([downloadContent], { type: 'text/plain;charset=utf-8' });
                                const url = window.URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `${assignment.student.name}_细致批改报告.txt`;
                                document.body.appendChild(a);
                                a.click();
                                window.URL.revokeObjectURL(url);
                                document.body.removeChild(a);
                              }}
                              className="text-blue-600 border-blue-300 hover:bg-blue-100 text-xs"
                            >
                              下载报告
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* 升格范文 */}
                      {assignment.gradingResult.improvedVersion && (
                        <div className="bg-green-50 rounded-lg p-4">
                          <h4 className="font-medium text-green-900 mb-2">升格范文</h4>
                          <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto p-3 bg-white rounded border">
                            {assignment.gradingResult.improvedVersion}
                          </div>
                        </div>
                      )}

                      {/* 批改详情 */}
                      {assignment.gradingResult.gradingDetails && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-orange-50 rounded-lg p-3">
                            <h5 className="font-medium text-orange-900 mb-2 text-sm">内容要点分析</h5>
                            <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap max-h-24 overflow-y-auto">
                              {assignment.gradingResult.gradingDetails.contentPoints}
                            </p>
                          </div>
                          <div className="bg-purple-50 rounded-lg p-3">
                            <h5 className="font-medium text-purple-900 mb-2 text-sm">语言错误分析</h5>
                            <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap max-h-24 overflow-y-auto">
                              {assignment.gradingResult.gradingDetails.languageErrors}
                            </p>
                          </div>
                          <div className="bg-red-50 rounded-lg p-3">
                            <h5 className="font-medium text-red-900 mb-2 text-sm">逻辑问题分析</h5>
                            <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap max-h-24 overflow-y-auto">
                              {assignment.gradingResult.gradingDetails.logicalIssues}
                            </p>
                          </div>
                          <div className="bg-indigo-50 rounded-lg p-3">
                            <h5 className="font-medium text-indigo-900 mb-2 text-sm">句子结构分析</h5>
                            <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap max-h-24 overflow-y-auto">
                              {assignment.gradingResult.gradingDetails.sentenceAnalysis}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* 分页控制 - 放在底部 */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between border-t pt-4">
                <div className="text-sm text-gray-600">
                  显示 {startIndex + 1} - {Math.min(endIndex, assignments.length)} 个，共 {assignments.length} 个学生
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="flex items-center gap-1"
                  >
                    <span>上一页</span>
                  </Button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }

                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className="w-8 h-8 p-0"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-1"
                  >
                    <span>下一页</span>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 批改失败信息输出框 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-red-600">批改失败信息</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {assignments.filter(a => a.status === 'failed').length === 0 ? (
              <div className="text-sm text-gray-500 italic">暂无批改失败的作业</div>
            ) : (
              <>
                <div className="text-sm text-red-600 font-medium">
                  批改失败：{assignments.filter(a => a.status === 'failed').map(a => a.student.name).join('、')}
                </div>
                <div className="text-xs text-gray-600">
                  失败作业将自动退还2点数/每学生，请点击"重新批改"按钮重试
                </div>
              </>
            )}

            {/* 显示详细错误信息 */}
            {processingStats.errors.length > 0 && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="text-sm font-medium text-red-800 mb-2">详细错误信息：</h4>
                <ul className="text-xs text-red-700 space-y-1">
                  {processingStats.errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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