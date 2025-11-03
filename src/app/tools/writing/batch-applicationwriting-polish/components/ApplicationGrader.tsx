"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, AlertCircle, Clock, Star, FileText, Coins, RefreshCw } from "lucide-react";
import { useUser } from "@/lib/user-context";
import type { ApplicationBatchTask, ApplicationGradingResult, ProcessingStats } from "../types";

interface ApplicationGraderProps {
  task: ApplicationBatchTask | null;
  setTask: (task: ApplicationBatchTask | null) => void;
  onNext: () => void;
  onPrev: () => void;
  processingStats: ProcessingStats;
  setProcessingStats: (stats: ProcessingStats) => void;
  isGradingCompleted: boolean;
  setIsGradingCompleted: (completed: boolean) => void;
  userId?: string;
}

const ApplicationGrader: React.FC<ApplicationGraderProps> = ({
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
  const [currentGrading, setCurrentGrading] = useState<string>('');
  const [parallelProgress, setParallelProgress] = useState<{
    batchIndex: number;
    totalBatches: number;
    completedInBatch: number;
    totalInBatch: number;
  } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const { userPoints, refreshUser } = useUser();

  if (!task) return null;

  // 调试信息
  console.log('ApplicationGrader组件状态:', {
    userId: userId,
    userPoints: userPoints,
    assignmentsCount: task.assignments?.length || 0,
    taskTopic: task?.topic,
    currentUser: userId ? '已传递' : '未传递'
  });

  // 计算点数消耗（向上取整）
  const calculateTotalPoints = () => {
    const pointsPerStudent = 1; // 每个学生1点数
    const totalPoints = (task.assignments?.length || 0) * pointsPerStudent;
    return Math.ceil(totalPoints); // 向上取整
  };

  const totalPointsNeeded = calculateTotalPoints();
  const hasEnoughPoints = userPoints >= totalPointsNeeded;

  // 批改单个作文
  const gradeApplication = async (assignmentId: string) => {
    const assignment = task.assignments.find(a => a.id === assignmentId);
    if (!assignment) return null;

    try {
      const requestData = {
        studentName: assignment.student.name,
        topic: task.topic,
        content: assignment.ocrResult.editedText || assignment.ocrResult.originalText || assignment.ocrResult.content,
        gradingType: 'both',
        userId: userId
      };

      console.log('开始批改作业:', {
        assignmentId,
        studentName: assignment.student.name,
        userId: userId,
        topicLength: task.topic?.length,
        contentLength: requestData.content?.length,
        requestData: JSON.stringify(requestData).substring(0, 200) + '...'
      });

      let response;
      try {
        // 获取认证token（Edge浏览器兼容方式）
        const getAuthToken = () => {
          if (typeof window !== 'undefined') {
            // 优先从 localStorage 获取
            let token = localStorage.getItem('sb-access-token');
            if (token) return token;

            // 备用：从 sessionStorage 获取
            token = sessionStorage.getItem('sb-access-token');
            if (token) return token;
          }
          return '';
        };

        const authToken = getAuthToken();
        console.log('发送API请求到 /api/ai/application-grading，token存在:', !!authToken);

        response = await fetch('/api/ai/application-grading', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // 添加认证头，确保 Edge 浏览器能正确传递认证信息
            'Authorization': `Bearer ${authToken}`
          },
          credentials: 'include', // 确保发送cookies（Edge浏览器兼容）
          body: JSON.stringify(requestData)
        });
      } catch (fetchError) {
        console.error('网络请求失败:', fetchError);
        throw new Error(`网络请求失败: ${fetchError.message}`);
      }

      console.log('批改API响应状态:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        console.error('HTTP错误响应:', response.status, response.statusText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error('JSON解析失败:', jsonError);
        throw new Error(`响应解析失败: ${jsonError.message}`);
      }

      console.log('批改API响应:', {
        success: data.success,
        error: data.error,
        pointsCost: data.pointsCost,
        remainingPoints: data.remainingPoints,
        httpStatus: response.status
      });

      if (data.success) {
        const gradingResult: ApplicationGradingResult = {
          score: data.result.score,
          feedback: data.result.feedback,
          improvedVersion: data.result.improvedVersion,
          gradingDetails: data.result.gradingDetails,
          gradedAt: new Date()
        };

        console.log('批改成功:', {
          studentName: assignment.student.name,
          score: gradingResult.score,
          pointsCost: data.pointsCost,
          remainingPoints: data.remainingPoints
        });

        return gradingResult;
      } else {
        console.error('批改API返回错误:', {
          error: data.error,
          success: data.success,
          httpStatus: response.status,
          statusText: response.statusText,
          studentName: assignment.student.name,
          userId: userId
        });
        throw new Error(data.error || '批改失败');
      }
    } catch (error) {
      console.error('批改失败 (完整错误):', {
        error: error,
        message: error?.message,
        stack: error?.stack,
        studentName: assignment.student.name,
        userId: userId,
        hasResponse: false
      });
      throw error;
    }
  };

  // 批量批改所有作文（使用单个API实现实时进度更新）
  const gradeAllApplications = async () => {
    if (!task.assignments || task.assignments.length === 0) return;

    setIsGrading(true);
    setProcessingStats({
      ...processingStats,
      totalApplications: task.assignments.length,
      gradedApplications: 0,
      errors: []
    });

    // 将所有作业标记为处理中
    const updatedAssignments = task.assignments.map(assignment => ({
      ...assignment,
      status: 'processing' as const,
      gradingResult: undefined,
      error: undefined
    }));
    setTask({ ...task, assignments: updatedAssignments });

    setCurrentGrading(`批量批改 ${task.assignments.length} 个学生...`);

    try {
      // 获取认证token
      const getAuthToken = () => {
        if (typeof window !== 'undefined') {
          let token = localStorage.getItem('sb-access-token');
          if (token) return token;
          token = sessionStorage.getItem('sb-access-token');
          if (token) return token;
        }
        return '';
      };

      const authToken = getAuthToken();

      // 分批处理，限制并发数为15
      const batchSize = 15; // 与批量API保持一致
      const batches = [];

      for (let i = 0; i < updatedAssignments.length; i += batchSize) {
        batches.push(updatedAssignments.slice(i, i + batchSize));
      }

      console.log('开始分批批改:', {
        totalAssignments: task.assignments.length,
        batchSize,
        totalBatches: batches.length
      });

      let gradedCount = 0;
      const errors: string[] = [];
      const resultsAssignments = [...updatedAssignments];

      // 分批并行处理
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];

        setCurrentGrading(`处理批次 ${batchIndex + 1}/${batches.length} (${batch.length}个学生)...`);

        const batchPromises = batch.map(async (assignment) => {
          try {
            setCurrentGrading(`正在批改: ${assignment.student.name}`);

            const requestData = {
              studentName: assignment.student.name,
              topic: task.topic,
              content: assignment.ocrResult.editedText || assignment.ocrResult.originalText || assignment.ocrResult.content,
              gradingType: 'both',
              userId: userId
            };

            const response = await fetch('/api/ai/application-grading', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
              },
              credentials: 'include',
              body: JSON.stringify(requestData)
            });

            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success) {
              const gradingResult: ApplicationGradingResult = {
                score: data.result.score,
                feedback: data.result.feedback,
                improvedVersion: data.result.improvedVersion,
                gradingDetails: data.result.gradingDetails,
                gradedAt: new Date()
              };

              // 更新作业状态
              const index = task.assignments.findIndex(a => a.id === assignment.id);
              if (index !== -1) {
                resultsAssignments[index] = {
                  ...resultsAssignments[index],
                  status: 'completed' as const,
                  gradingResult
                };
              }

              gradedCount++;

              // 实时更新进度
              setProcessingStats(prev => ({
                ...prev,
                gradedApplications: gradedCount
              }));

              // 实时更新任务状态
              setTask(prevTask => ({
                ...prevTask!,
                assignments: [...resultsAssignments]
              }));

              console.log(`✅ ${assignment.student.name} 批改完成，得分: ${gradingResult.score}`);

              return { success: true, assignmentId: assignment.id, gradingResult };
            } else {
              throw new Error(data.error || '批改失败');
            }

          } catch (error) {
            console.error(`❌ 批改学生 ${assignment.student.name} 失败:`, error);
            const errorMsg = `${assignment.student.name}: ${error instanceof Error ? error.message : '批改失败'}`;
            errors.push(errorMsg);

            // 更新作业状态为失败
            const index = task.assignments.findIndex(a => a.id === assignment.id);
            if (index !== -1) {
              resultsAssignments[index] = {
                ...resultsAssignments[index],
                status: 'failed' as const,
                error: error instanceof Error ? error.message : '批改失败'
              };
            }

            return { success: false, assignmentId: assignment.id, error: errorMsg };
          }
        });

        // 等待当前批次完成
        await Promise.allSettled(batchPromises);

        console.log(`批次 ${batchIndex + 1} 完成，累计完成: ${gradedCount}/${task.assignments.length}`);
      }

      // 计算平均分
      const successfulApplications = resultsAssignments.filter(a =>
        a.status === 'completed' && a.gradingResult?.score
      );
      const averageScore = successfulApplications.length > 0
        ? successfulApplications.reduce((sum, a) => sum + (a.gradingResult?.score || 0), 0) / successfulApplications.length
        : 0;

      const failedCount = resultsAssignments.filter(a => a.status === 'failed').length;
      const successfulCount = resultsAssignments.filter(a => a.status === 'completed').length;

      // 最终更新状态
      setProcessingStats({
        totalImages: 0,
        processedImages: 0,
        totalApplications: task.assignments.length,
        gradedApplications: successfulCount,
        averageScore,
        errors,
        processingTime: 0
      });

      setTask({ ...task, assignments: resultsAssignments });
      setIsGrading(false);
      setCurrentGrading(`批量批改完成！成功${successfulCount}份，失败${failedCount}份`);
      setParallelProgress(null);
      setIsGradingCompleted(true);

      // 3秒后清除批改完成消息
      setTimeout(() => {
        setCurrentGrading('');
      }, 3000);

      // 刷新用户点数
      setTimeout(() => {
        refreshUser().catch(error => {
          console.warn('刷新用户信息失败:', error);
        });
      }, 500);

    } catch (error) {
      console.error('批量批改过程中发生错误:', error);
      setCurrentGrading(`批量批改失败: ${error.message}`);
      setIsGrading(false);

      // 恢复作业状态
      const failedAssignments = task.assignments.map(assignment => ({
        ...assignment,
        status: 'pending' as const
      }));
      setTask({ ...task, assignments: failedAssignments });
    }
  };

  // 重新批改单个作文
  const retryGradeApplication = async (assignmentId: string) => {
    const assignment = task.assignments.find(a => a.id === assignmentId);
    if (!assignment) return;

    const updatedAssignments = [...task.assignments];
    const index = task.assignments.findIndex(a => a.id === assignmentId);
    
    try {
      // 更新状态为处理中
      updatedAssignments[index] = { ...assignment, status: 'processing' };
      setTask({ ...task, assignments: updatedAssignments });

      const gradingResult = await gradeApplication(assignmentId);
      
      if (gradingResult) {
        // 更新状态为完成
        updatedAssignments[index] = {
          ...assignment,
          gradingResult,
          status: 'completed'
        };
        
        // 从错误列表中移除该学生的错误
        setProcessingStats(prev => ({
          ...prev,
          errors: prev.errors.filter(error => !error.includes(assignment.student.name))
        }));

        // 显示重新批改成功提示（包含点数消耗）
        console.log(`✅ 重新批改完成：${assignment.student.name}，消耗1点数`);

        // 刷新用户点数（延迟执行）
        setTimeout(() => {
          refreshUser().catch(error => {
            console.warn('刷新用户信息失败:', error);
          });
        }, 500);
      }
    } catch (error) {
      console.error(`重新批改学生 ${assignment.student.name} 的作文失败:`, error);
      // 更新状态为失败
      updatedAssignments[index] = { ...assignment, status: 'failed' };
    }

    setTask({ ...task, assignments: updatedAssignments });
  };

  // 重新批改所有失败的作文
  const retryAllFailedApplications = async () => {
    const failedAssignments = task.assignments.filter(a => a.status === 'failed');
    if (failedAssignments.length === 0) return;

    setIsGrading(true);
    const errors: string[] = [];
    const updatedAssignments = [...task.assignments];

    for (const assignment of failedAssignments) {
      const index = task.assignments.findIndex(a => a.id === assignment.id);
      setCurrentGrading(assignment.student.name);

      try {
        // 更新状态为处理中
        updatedAssignments[index] = { ...assignment, status: 'processing' };
        setTask({ ...task, assignments: updatedAssignments });

        const gradingResult = await gradeApplication(assignment.id);
        
        if (gradingResult) {
          // 更新状态为完成
          updatedAssignments[index] = {
            ...assignment,
            gradingResult,
            status: 'completed'
          };
        }
      } catch (error) {
        console.error(`重新批改学生 ${assignment.student.name} 的作文失败:`, error);
        const errorMsg = `${assignment.student.name}: ${error instanceof Error ? error.message : '批改失败'}`;
        errors.push(errorMsg);
        
        // 更新状态为失败
        updatedAssignments[index] = { ...assignment, status: 'failed' };
      }
    }

    setTask({ ...task, assignments: updatedAssignments });
    setProcessingStats(prev => ({ ...prev, errors }));
    setIsGrading(false);
    setCurrentGrading('');

    // 刷新用户点数（延迟执行）
    setTimeout(() => {
      refreshUser().catch(error => {
        console.warn('刷新用户信息失败:', error);
      });
    }, 500);
  };

  // 重新批改所有作文
  const retryAllApplications = async () => {
    if (task.assignments.length === 0) return;

    const pointsPerStudent = 1; // 每个学生1点数
    const totalPointsRequired = task.assignments.length * pointsPerStudent;
    const totalPoints = Math.ceil(totalPointsRequired); // 向上取整
    const confirmMessage = `确定要重新批改所有 ${task.assignments.length} 份作文吗？将消耗 ${totalPoints} 点数（当前余额：${userPoints} 点）`;

    if (!confirm(confirmMessage)) {
      return;
    }

    setIsGrading(true);
    const errors: string[] = [];
    const updatedAssignments = task.assignments.map(assignment => ({
      ...assignment,
      status: 'processing' as const,
      gradingResult: undefined,
      error: undefined
    }));

    setTask({ ...task, assignments: updatedAssignments });
    setProcessingStats({
      totalImages: 0,
      processedImages: 0,
      totalApplications: task.assignments.length,
      gradedApplications: 0,
      averageScore: 0,
      errors: [],
      processingTime: 0
    });
    setIsGradingCompleted(false);
    setCurrentGrading('开始重新批改...');

    try {
      // 并行处理所有作文
      const batchSize = 15; // 与批量API保持一致的并发限制
      const batches = [];

      for (let i = 0; i < updatedAssignments.length; i += batchSize) {
        batches.push(updatedAssignments.slice(i, i + batchSize));
      }

      let gradedCount = 0;

      for (const batch of batches) {
        const batchPromises = batch.map(async (assignment) => {
          const index = task.assignments.findIndex(a => a.id === assignment.id);
          setCurrentGrading(assignment.student.name);

          try {
            const gradingResult = await gradeApplication(assignment.id);

            if (gradingResult) {
              gradedCount++;
              return {
                ...assignment,
                gradingResult,
                status: 'completed' as const
              };
            } else {
              throw new Error('批改结果为空');
            }
          } catch (error) {
            console.error(`重新批改学生 ${assignment.student.name} 的作文失败:`, error);
            errors.push(`重新批改${assignment.student.name}失败: ${error.message}`);
            return {
              ...assignment,
              status: 'failed' as const,
              error: error.message
            };
          }
        });

        const batchResults = await Promise.allSettled(batchPromises);

        // 更新已完成数量
        batchResults.forEach((result) => {
          if (result.status === 'fulfilled' && result.value.status === 'completed') {
            const currentStats = gradedCount;
            setProcessingStats(prev => ({
              ...prev,
              gradedApplications: currentStats
            }));
          }
        });

        // 更新任务状态
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            const assignmentIndex = task.assignments.findIndex(a => a.id === batch[index].id);
            updatedAssignments[assignmentIndex] = result.value;
          }
        });

        setTask({ ...task, assignments: [...updatedAssignments] });
      }

      // 计算平均分
      const successfulApplications = updatedAssignments.filter(a =>
        a.status === 'completed' && a.gradingResult?.score
      );
      const averageScore = successfulApplications.length > 0
        ? successfulApplications.reduce((sum, a) => sum + (a.gradingResult?.score || 0), 0) / successfulApplications.length
        : 0;

      setProcessingStats({
        totalImages: 0,
        processedImages: 0,
        totalApplications: task.assignments.length,
        gradedApplications: gradedCount,
        averageScore,
        errors,
        processingTime: 0
      });

      setTask({ ...task, assignments: updatedAssignments });
      setIsGrading(false);
      setCurrentGrading('重新批改完成！');
      setParallelProgress(null);
      setIsGradingCompleted(true);

      // 3秒后清除批改完成消息
      setTimeout(() => {
        setCurrentGrading('');
      }, 3000);

      // 刷新用户点数
      setTimeout(() => {
        refreshUser().catch(error => {
          console.warn('刷新用户信息失败:', error);
        });
      }, 500);

    } catch (error) {
      console.error('重新批改过程中发生错误:', error);
      setCurrentGrading(`重新批改失败: ${error.message}`);
      setIsGrading(false);
    }
  };

  // 使用函数式更新确保获取最新状态
  const completedCount = task?.assignments?.filter(a => a.status === 'completed').length || 0;
  const failedCount = task?.assignments?.filter(a => a.status === 'failed').length || 0;
  const canProceed = completedCount > 0 && !isGrading; // 确保批改完成后才能进行下一步
  const progress = task?.assignments?.length > 0 ? (processingStats.gradedApplications / task.assignments.length) * 100 : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">AI批改</h2>
        <p className="text-gray-600 text-sm">
          AI将根据应用文题目要求对学生作文进行详细批改和打分
        </p>
      </div>

      {task.assignments.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-gray-500">
            暂无作文数据，请返回上一步
          </CardContent>
        </Card>
      ) : (
        <>
          {/* 批改控制面板 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-600" />
                批改控制面板
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 统计信息 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{task.assignments.length}</div>
                  <div className="text-sm text-blue-700">总作文数</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{completedCount}</div>
                  <div className="text-sm text-green-700">已完成</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{failedCount}</div>
                  <div className="text-sm text-red-700">失败</div>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">{totalPointsNeeded}</div>
                  <div className="text-sm text-yellow-700">需要点数</div>
                </div>
              </div>

              {/* 进度条 */}
              {isGrading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>批改进度</span>
                    <span>{processingStats.gradedApplications}/{task.assignments.length}</span>
                  </div>
                  <Progress value={progress} className="w-full" />
                  {currentGrading && (
                    <div className="text-sm text-blue-600 flex items-center gap-1">
                      <Clock className="w-3 h-3 animate-spin" />
                      正在批改: {currentGrading}
                    </div>
                  )}

                  {/* 并行处理进度 */}
                  {parallelProgress && (
                    <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                      <div className="text-xs text-blue-700 mb-1">
                        <strong>并行批模式</strong> - 第 {parallelProgress.batchIndex}/{parallelProgress.totalBatches} 批
                      </div>
                      <div className="text-xs text-blue-600">
                        当前进度: {parallelProgress.completedInBatch}/{parallelProgress.totalInBatch} 个学生
                      </div>
                      <Progress
                        value={(parallelProgress.completedInBatch / parallelProgress.totalInBatch) * 100}
                        className="mt-1 h-1"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* 点数余额提示 */}
              {!hasEnoughPoints && task.assignments.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-amber-700 text-sm">
                    <Coins className="w-4 h-4" />
                    <span>点数不足，需要 {totalPointsNeeded} 点数，当前余额 {userPoints} 点数</span>
                  </div>
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={gradeAllApplications}
                  disabled={isGrading || isGradingCompleted || !hasEnoughPoints}
                  className="flex items-center gap-2"
                >
                  {isGrading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      批改中，请耐心等待...
                    </>
                  ) : (
                    <>
                      <Star className="w-4 h-4" />
                      {hasEnoughPoints ? `开始批改 (${totalPointsNeeded}点)` : `点数不足 (${totalPointsNeeded}点)`}
                    </>
                  )}
                </Button>

                {failedCount > 0 && !isGrading && (
                  <Button
                    variant="outline"
                    onClick={retryAllFailedApplications}
                    disabled={userPoints < failedCount * 1}
                    className="flex items-center gap-2 border-orange-300 text-orange-600 hover:bg-orange-50"
                    title={`重新批改失败的作文（消耗${failedCount * 1}点数，当前余额${userPoints}点）`}
                  >
                    <AlertCircle className="w-4 h-4" />
                    重新批改失败项 ({failedCount}份 - {failedCount * 1}点)
                  </Button>
                )}

                {isGradingCompleted && failedCount === 0 && (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      批改完成
                    </Button>
                    <Button
                      variant="outline"
                      className="flex items-center gap-2 border-blue-300 text-blue-600 hover:bg-blue-50"
                      onClick={retryAllApplications}
                      disabled={isGrading}
                      title={`重新批改所有作文（消耗${task.assignments.length * 1}点数，当前余额${userPoints}点）`}
                    >
                      <RefreshCw className="w-4 h-4" />
                      重新批改
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 批改结果列表 */}
          <>
            {/* 分页控制 */}
            {task.assignments.length > 7 && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      显示第 {(currentPage - 1) * 7 + 1} - {Math.min(currentPage * 7, task.assignments.length)} 条，共 {task.assignments.length} 条记录
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
                        {Array.from({ length: Math.ceil(task.assignments.length / 7) }, (_, i) => i + 1).map(page => (
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
                        onClick={() => setCurrentPage(prev => Math.min(Math.ceil(task.assignments.length / 7), prev + 1))}
                        disabled={currentPage === Math.ceil(task.assignments.length / 7)}
                      >
                        下一页
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-4">
              {task.assignments
                .slice((currentPage - 1) * 7, currentPage * 7)
                .map((assignment, index) => {
                  const globalIndex = task.assignments.findIndex(a => a.id === assignment.id) + 1;
                  return (
              <Card key={assignment.id} className="border border-gray-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      {assignment.student.name} - 作文 {globalIndex}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          assignment.status === 'completed' ? 'default' :
                          assignment.status === 'processing' ? 'secondary' :
                          assignment.status === 'failed' ? 'destructive' : 'outline'
                        }
                      >
                        {assignment.status === 'pending' && '待批改'}
                        {assignment.status === 'processing' && '批改中，请耐心等待'}
                        {assignment.status === 'completed' && '已完成'}
                        {assignment.status === 'failed' && '失败'}
                      </Badge>
                      {assignment.gradingResult && (
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                          {assignment.gradingResult.score}分
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* 作文内容预览 */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      作文内容
                    </label>
                    <div className="bg-gray-50 p-3 rounded text-sm text-gray-700 max-h-20 overflow-y-auto">
                      {(assignment.ocrResult.editedText || assignment.ocrResult.content).substring(0, 150)}
                      {(assignment.ocrResult.editedText || assignment.ocrResult.content).length > 150 && '...'}
                    </div>
                  </div>

                  {/* 批改结果 */}
                  {assignment.gradingResult && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 block">
                        批改结果
                      </label>
                      <div className="bg-green-50 p-3 rounded border border-green-200">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="font-medium text-green-800">
                            得分: {assignment.gradingResult.score}分
                          </span>
                        </div>
                        <div className="text-sm text-gray-700 max-h-32 overflow-y-auto">
                          {assignment.gradingResult.feedback.substring(0, 200)}...
                        </div>
                      </div>
                    </div>
                  )}

                  {assignment.status === 'failed' && (
                    <div className="bg-red-50 p-3 rounded border border-red-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-red-700">
                          <AlertCircle className="w-4 h-4" />
                          <span className="text-sm">批改失败，请稍后重试</span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => retryGradeApplication(assignment.id)}
                          disabled={isGrading || userPoints < 1}
                          className="text-xs border-orange-300 text-orange-600 hover:bg-orange-50"
                          title={`重新批改这份作文（消耗1点数，当前余额${userPoints}点）`}
                        >
                          重新批改 (1点)
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* 已完成的作文也可以重新批改 */}
                  {assignment.status === 'completed' && assignment.gradingResult && (
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => retryGradeApplication(assignment.id)}
                        disabled={isGrading || userPoints < 1}
                        className="text-xs text-gray-500 hover:text-gray-700"
                        title={`重新批改这份作文（消耗1点数，当前余额${userPoints}点）`}
                      >
                        重新批改 (1点)
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
              );
                })}
            </div>
          </>

          {/* 错误信息 */}
          {processingStats.errors.length > 0 && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-lg text-red-600">批改错误</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {processingStats.errors.map((error, index) => (
                    <div key={index} className="text-sm text-red-600">
                      {error}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* 操作按钮 */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev}>
          上一步
        </Button>
        <Button
          onClick={onNext}
          disabled={!canProceed || isGrading}
          className="px-8"
        >
          下一步：查看结果导出
        </Button>
      </div>
    </div>
  );
};

export default ApplicationGrader;
