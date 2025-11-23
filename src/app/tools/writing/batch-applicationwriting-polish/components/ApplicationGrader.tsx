"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, AlertCircle, Clock, Star, FileText, Coins, RefreshCw, Eye, EyeOff, Maximize2 } from "lucide-react";
import { useUser } from "@/lib/user-context";
import type { ApplicationBatchTask, ApplicationGradingResult, ProcessingStats } from "../types";

interface ApplicationGraderProps {
  task: ApplicationBatchTask | null;
  setTask: (task: ApplicationBatchTask | null) => void;
  onNext: () => void;
  onPrev: () => void;
  onMediumStandard: () => void;
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
  onMediumStandard,
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
  const [expandedPreviews, setExpandedPreviews] = useState<{[key: string]: boolean}>({});
  const { userPoints, refreshUser } = useUser();

  // 防抖的积分刷新函数 - 批改期间暂停
  const refreshTimeoutRef = useRef<NodeJS.Timeout>();
  const debouncedRefreshPoints = useCallback(() => {
    // 如果正在批改，不进行用户状态刷新，避免干扰批改流程
    if (isGrading) {
      console.log('⏸️ 批改进行中，暂停用户状态刷新（保护登录状态）');
      return;
    }

    // 如果刚刚完成批改，额外延迟确保状态稳定
    if (isGradingCompleted) {
      console.log('⏸️ 批改刚完成，延迟刷新用户状态（确保状态稳定）');
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      refreshTimeoutRef.current = setTimeout(() => {
        console.log('🪙 批改完成后延迟刷新用户积分');
        refreshUser().catch(error => {
          console.warn('批改后刷新用户信息失败:', error);
          // 静默处理，不影响用户体验
        });
      }, 3000);
      return;
    }

    // 清除之前的定时器
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    // 设置新的定时器，延迟1秒执行
    refreshTimeoutRef.current = setTimeout(() => {
      console.log('🪙 防抖刷新用户积分');
      refreshUser().catch(error => {
        console.warn('刷新用户信息失败:', error);
        // 刷新失败不影响批改继续进行
      });
    }, 1000);
  }, [refreshUser, isGrading, isGradingCompleted]);

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

  // 切换预览展开状态
  const togglePreview = (assignmentId: string) => {
    setExpandedPreviews(prev => ({
      ...prev,
      [assignmentId]: !prev[assignmentId]
    }));
  };

  // 批改单个作文（带自动重试机制）
  const gradeApplication = async (assignmentId: string, retryCount: number = 0, maxRetries: number = 1) => {
    const assignment = task.assignments.find(a => a.id === assignmentId);
    if (!assignment) return null;

    const attemptGrade = async () => {
      try {
        const requestData = {
          studentName: assignment.student.name,
          topic: task.topic,
          content: assignment.ocrResult.editedText || assignment.ocrResult.originalText || assignment.ocrResult.content,
          gradingType: 'both',
          userId: userId
        };

        console.log(`开始批改作业 (${retryCount + 1}/${maxRetries + 1}):`, {
          assignmentId,
          studentName: assignment.student.name,
          userId: userId,
          topicLength: task.topic?.length,
          contentLength: requestData.content?.length,
          retryCount,
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
          let errorMessage = '批改失败';
          if (response.status === 404) {
            errorMessage = '批改失败：服务不可用，请稍后重试';
          } else if (response.status === 500) {
            errorMessage = '批改失败：服务器内部错误';
          } else {
            errorMessage = `批改失败：HTTP ${response.status}`;
          }
          throw new Error(errorMessage);
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
            remainingPoints: data.remainingPoints,
            retryCount
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
        console.error(`批改失败 (尝试 ${retryCount + 1}/${maxRetries + 1}):`, {
          error: error,
          message: error?.message,
          stack: error?.stack,
          studentName: assignment.student.name,
          userId: userId,
          retryCount
        });
        throw error;
      }
    };

    // 尝试批改，如果失败且未达到最大重试次数，则自动重试
    try {
      return await attemptGrade();
    } catch (error) {
      if (retryCount < maxRetries) {
        console.log(`⚠️ 批改失败，1秒后自动重试 (${retryCount + 1}/${maxRetries + 1}): ${assignment.student.name}`);

        // 等待1秒后重试
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
          return await gradeApplication(assignmentId, retryCount + 1, maxRetries);
        } catch (retryError) {
          console.error(`❌ 自动重试失败: ${assignment.student.name}`, retryError);
          throw retryError;
        }
      } else {
        console.error(`❌ 所有重试尝试均失败: ${assignment.student.name}`, error);
        throw error;
      }
    }
  };

  // 批量批改所有作文（中等标准）
  const gradeAllApplicationsMedium = async () => {
    if (!task.assignments || task.assignments.length === 0) return;

    // 设置中等标准标志
    const updatedTask = { ...task, useMediumStandard: true };
    setTask(updatedTask);

    // 开始批改
    await gradeAllApplicationsLenient();
  };

  // 批量批改所有作文（宽松标准）
  const gradeAllApplicationsLenient = async () => {
    if (!task.assignments || task.assignments.length === 0) return;

    // 设置宽松标准标志
    const updatedTask = { ...task, useMediumStandard: false };
    setTask(updatedTask);

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

    // 计算预估时间
      const estimatedTimePerStudent = 7; // 每个学生预估7秒
      const estimatedTotalTime = Math.ceil((task.assignments.length * estimatedTimePerStudent) / 35); // 并行35个，除以35
      const estimatedMinutes = Math.ceil(estimatedTotalTime / 60);

      setCurrentGrading(`准备批量批改 ${task.assignments.length} 个学生，预计需要 ${estimatedMinutes} 分钟...`);

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

      // 真正的并行处理，限制并发数为35
      const batchSize = 35; // 35个学生同时并行批改
      const batches = [];

      for (let i = 0; i < updatedAssignments.length; i += batchSize) {
        batches.push(updatedAssignments.slice(i, i + batchSize));
      }

      console.log('开始并行批改:', {
        totalAssignments: task.assignments.length,
        batchSize,
        totalBatches: batches.length,
        estimatedTimeMinutes: estimatedMinutes
      });

      let gradedCount = 0;
      const errors: string[] = [];
      const resultsAssignments = [...updatedAssignments];
      const gradingStartTime = Date.now(); // 记录开始时间

      // 真正的并行处理 - 使用Promise.all确保同时执行
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        const currentProgress = Math.round(((batchIndex) / batches.length) * 100);
        const nextProgress = Math.round(((batchIndex + 1) / batches.length) * 100);

        setCurrentGrading(`🚀 并行处理批次 ${batchIndex + 1}/${batches.length} (${batch.length}个学生同时批改) [${currentProgress}% → ${nextProgress}%]...`);

        // 创建所有Promise并让它们同时执行
        const batchPromises = batch.map(async (assignment) => {
          try {
            setCurrentGrading(`正在批改: ${assignment.student.name}`);

            const requestData = {
              studentName: assignment.student.name,
              topic: task.topic,
              content: assignment.ocrResult.editedText || assignment.ocrResult.originalText || assignment.ocrResult.content,
              gradingType: 'both',
              userId: userId,
              useMediumStandard: task.useMediumStandard || false
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
              let errorMessage = '批改失败';
              if (response.status === 404) {
                errorMessage = '批改失败：服务不可用，请稍后重试';
              } else if (response.status === 500) {
                errorMessage = '批改失败：服务器内部错误';
              } else {
                errorMessage = `批改失败：HTTP ${response.status}`;
              }
              throw new Error(errorMessage);
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

              // 实时更新进度 - 避免并发竞争
              setProcessingStats(prev => ({
                ...prev,
                gradedApplications: gradedCount
              }));

              // 实时更新任务状态 - 使用函数式更新避免竞争条件
              setTask(prevTask => {
                if (!prevTask) return prevTask;
                return {
                  ...prevTask,
                  assignments: [...resultsAssignments]
                };
              });

              console.log(`✅ ${assignment.student.name} 批改完成，得分: ${gradingResult.score}`);

              return { success: true, assignmentId: assignment.id, gradingResult };
            } else {
              throw new Error(data.error || '批改失败');
            }

          } catch (error) {
            console.error(`❌ 批改学生 ${assignment.student.name} 失败:`, error);
            const errorMsg = `${assignment.student.name}: ${error instanceof Error ? error.message : '批改失败'}`;
            errors.push(errorMsg);

            // 更新作业状态为失败 - 使用函数式更新避免竞争条件
            const index = task.assignments.findIndex(a => a.id === assignment.id);
            if (index !== -1) {
              resultsAssignments[index] = {
                ...resultsAssignments[index],
                status: 'failed' as const,
                error: error instanceof Error ? error.message : '批改失败'
              };

              // 立即更新状态
              setTask(prevTask => {
                if (!prevTask) return prevTask;
                return {
                  ...prevTask,
                  assignments: [...resultsAssignments]
                };
              });
            }

            return { success: false, assignmentId: assignment.id, error: errorMsg };
          }
        });

        // 真正的并行执行 - 等待当前批次所有请求同时完成
        console.log(`🚀 开始并行执行批次 ${batchIndex + 1}/${batches.length}，同时处理 ${batch.length} 个学生`);

        const startTime = Date.now();
        const batchResults = await Promise.allSettled(batchPromises);
        const endTime = Date.now();

        // 批次完成后立即同步状态
        setTask(prevTask => {
          if (!prevTask) return prevTask;
          return {
            ...prevTask,
            assignments: [...resultsAssignments]
          };
        });

        console.log(`✅ 批次 ${batchIndex + 1} 并行完成，耗时: ${((endTime - startTime) / 1000).toFixed(2)}秒`);
        console.log(`📊 批次结果统计:`, {
          total: batchResults.length,
          fulfilled: batchResults.filter(r => r.status === 'fulfilled').length,
          rejected: batchResults.filter(r => r.status === 'rejected').length
        });

        // 更新当前进度状态 - 添加百分比显示
        const currentCompletedCount = gradedCount + batchResults.filter(r => r.status === 'fulfilled').length;
        const progressPercentage = Math.round((currentCompletedCount / updatedAssignments.length) * 100);
        const remainingBatches = batches.length - batchIndex - 1;
        const estimatedRemainingMinutes = Math.ceil((remainingBatches * estimatedTotalTime) / batches.length / 60);

        setCurrentGrading(`✅ 批次 ${batchIndex + 1}/${batches.length} 完成 [${progressPercentage}%] - 已完成 ${currentCompletedCount}/${updatedAssignments.length} 名学生${remainingBatches > 0 ? `，预计剩余 ${estimatedRemainingMinutes} 分钟` : ''}`);
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

      // 最终更新状态 - 确保状态同步
      setProcessingStats({
        totalImages: 0,
        processedImages: 0,
        totalApplications: task.assignments.length,
        gradedApplications: successfulCount,
        averageScore,
        errors,
        processingTime: 0
      });

      // 最终状态同步 - 使用函数式更新确保一致性
      setTask(prevTask => ({
        ...prevTask!,
        assignments: resultsAssignments
      }));

      // 重要：先设置完成状态，再重置批改状态，避免竞争条件
      setIsGradingCompleted(true);
      setParallelProgress(null);

      // 延迟重置批改状态，确保UI更新完成
      setTimeout(() => {
        setIsGrading(false);
        console.log('🔄 批改状态已重置，可以安全刷新用户状态');
      }, 1000);

      // 计算实际用时
      const actualTotalTime = Math.round((Date.now() - gradingStartTime) / 1000);
      const actualMinutes = Math.floor(actualTotalTime / 60);
      const actualSeconds = actualTotalTime % 60;

      setCurrentGrading(`🎉 批量批改完成 [100%]！成功${successfulCount}份，失败${failedCount}份，实际用时 ${actualMinutes}分${actualSeconds}秒`);

      // 3秒后清除批改完成消息
      setTimeout(() => {
        setCurrentGrading('');
      }, 3000);

      // 延迟刷新用户点数，确保批改完全结束
      setTimeout(() => {
        console.log('🔄 批改完成，延迟刷新用户点数');
        debouncedRefreshPoints();
      }, 2000);

    } catch (error) {
      console.error('批量批改过程中发生错误:', error);
      setCurrentGrading(`批量批改失败: ${error instanceof Error ? error.message : '未知错误'}`);

      // 恢复作业状态 - 使用函数式更新确保一致性
      setTask(prevTask => {
        if (!prevTask) return prevTask;
        const failedAssignments = prevTask.assignments.map(assignment => ({
          ...assignment,
          status: 'pending' as const
        }));
        return {
          ...prevTask,
          assignments: failedAssignments
        };
      });

      // 重置批改状态和并行进度
      setParallelProgress(null);
      setIsGradingCompleted(false);

      // 延迟重置批改状态，确保错误处理完成
      setTimeout(() => {
        setIsGrading(false);
        console.log('❌ 批改失败，状态已重置');
      }, 1000);

      // 清除错误消息
      setTimeout(() => {
        setCurrentGrading('');
      }, 5000);

      // 即使出错也要刷新用户点数，确保状态一致
      setTimeout(() => {
        console.log('🔄 错误处理后刷新用户状态');
        debouncedRefreshPoints();
      }, 3000);
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

        // 刷新用户点数（使用防抖）
        debouncedRefreshPoints();
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

    // 刷新用户点数（使用防抖）
    debouncedRefreshPoints();
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
      const batchSize = 35; // 与批量API保持一致的并发限制
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

      // 刷新用户点数（使用防抖）
      debouncedRefreshPoints();

    } catch (error) {
      console.error('重新批改过程中发生错误:', error);
      setCurrentGrading(`重新批改失败: ${error.message}`);
      setIsGrading(false);
    }
  };

  // 使用函数式更新确保获取最新状态
  const completedCount = task?.assignments?.filter(a => a.status === 'completed').length || 0;
  const failedCount = task?.assignments?.filter(a => a.status === 'failed').length || 0;
  const canProceed = true; // 始终允许进入下一步，无论批改状态如何
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
              <div className="flex gap-2 flex-wrap items-center">

                {/* 批改中提示 - 只在批改时显示 */}
                {isGrading && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    批改中，请耐心等待...
                  </div>
                )}

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
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm font-medium text-gray-700">
                        作文内容
                      </label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => togglePreview(assignment.id)}
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
                      >
                        {expandedPreviews[assignment.id] ? (
                          <>
                            <EyeOff className="w-3 h-3" />
                            收起
                          </>
                        ) : (
                          <>
                            <Maximize2 className="w-3 h-3" />
                            展开预览
                          </>
                        )}
                      </Button>
                    </div>
                    <div className={`bg-gray-50 p-3 rounded text-sm text-gray-700 border transition-all duration-200 ${
                      expandedPreviews[assignment.id]
                        ? 'max-h-96 overflow-y-auto'
                        : 'max-h-20 overflow-y-auto'
                    }`}>
                      {expandedPreviews[assignment.id] ? (
                        <div className="whitespace-pre-wrap">
                          {assignment.ocrResult.editedText || assignment.ocrResult.content}
                        </div>
                      ) : (
                        <div>
                          {(assignment.ocrResult.editedText || assignment.ocrResult.content).substring(0, 150)}
                          {(assignment.ocrResult.editedText || assignment.ocrResult.content).length > 150 && '...'}
                        </div>
                      )}
                    </div>
                    {!expandedPreviews[assignment.id] && (assignment.ocrResult.editedText || assignment.ocrResult.content).length > 150 && (
                      <div className="text-xs text-gray-500 mt-1">
                        共 {(assignment.ocrResult.editedText || assignment.ocrResult.content).length} 字符，点击展开预览查看完整内容
                      </div>
                    )}
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

            {/* 批改进度 */}
            {isGrading && (
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="text-sm font-medium text-gray-700 text-center">批改进度</div>
                    <div className="flex items-center justify-between text-sm">
                      <span>进度</span>
                      <span className="font-bold text-blue-600">{progress}% ({processingStats.gradedApplications}/{task.assignments.length})</span>
                    </div>
                    <Progress value={progress} className="w-full h-2" />
                    {currentGrading && (
                      <div className="text-sm text-blue-600 bg-blue-50 p-3 rounded-lg border border-blue-200 flex items-center gap-2">
                        <Clock className="w-4 h-4 animate-spin text-blue-600" />
                        <div className="flex-1">
                          <div className="font-medium text-blue-800">{currentGrading}</div>
                          {isGrading && (
                            <div className="text-xs text-blue-600 mt-1">
                              请耐心等待，系统正在并行处理中...
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 并行处理进度 */}
                    {parallelProgress && (
                      <div className="p-2 bg-blue-50 rounded border border-blue-200">
                        <div className="text-xs text-blue-700 mb-1">
                          <strong>并行批改模式</strong> - 第 {parallelProgress.batchIndex}/{parallelProgress.totalBatches} 批
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
                </CardContent>
              </Card>
            )}
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
      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={onPrev}>
          上一步
        </Button>

        <div className="flex items-center gap-3">
          {/* 批量修改按钮 - 初始状态或需要重新批改时显示 */}
          {!isGrading && (
            <div className="space-y-2">
              {/* 提示信息 - 根据是否有批改结果显示不同提示 */}
              <div className="text-center">
                {task.assignments.some(a => a.status === 'completed') ? (
                  <>
                    <div className="text-xs text-gray-500 mb-1">
                      🔄 发现已完成的批改结果
                    </div>
                    <div className="text-xs text-orange-600">
                      可选择标准重新批改或查看当前结果
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-xs text-gray-500 mb-1">
                      ⏱️ 预计需要 {Math.ceil((task.assignments.length * 7) / 20 / 60)} 分钟
                    </div>
                    <div className="text-xs text-blue-600">
                      20个学生并行处理，请耐心等待
                    </div>
                  </>
                )}
              </div>

              {/* 批量修改按钮 */}
              <div className="flex gap-2">
                <Button
                  onClick={gradeAllApplicationsMedium}
                  disabled={!hasEnoughPoints}
                  className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white border-amber-500 flex-1"
                  title={task.assignments.some(a => a.status === 'completed') ? "使用中等标准重新批改，去掉宽容1分" : "去掉宽容1分，批改更严格"}
                >
                  <FileText className="w-4 h-4" />
                  {hasEnoughPoints ?
                    (task.assignments.some(a => a.status === 'completed') ? `重新批改（中等标准）(${totalPointsNeeded}点)` : `批量修改（中等标准）(${totalPointsNeeded}点)`)
                    : `点数不足 (${totalPointsNeeded}点)`
                  }
                </Button>

                <Button
                  onClick={gradeAllApplicationsLenient}
                  disabled={!hasEnoughPoints}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white border-green-600 flex-1"
                  title={task.assignments.some(a => a.status === 'completed') ? "使用宽松标准重新批改，保留宽容1分" : "保留宽容1分，批改更人性化"}
                >
                  <Star className="w-4 h-4" />
                  {hasEnoughPoints ?
                    (task.assignments.some(a => a.status === 'completed') ? `重新批改（宽松标准）(${totalPointsNeeded}点)` : `批量修改（宽松标准）(${totalPointsNeeded}点)`)
                    : `点数不足 (${totalPointsNeeded}点)`
                  }
                </Button>
              </div>
            </div>
          )}

          {/* 批改状态按钮 - 只在批改中或完成后显示 */}
          {(isGrading || isGradingCompleted) && (
            <Button
              disabled={true}
              className={`flex items-center gap-2 ${
                isGradingCompleted
                  ? 'bg-green-600 hover:bg-green-700 text-white border-green-600'
                  : 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600'
              }`}
            >
              {isGradingCompleted ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  已完成
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  批改中，请耐心等待
                </>
              )}
            </Button>
          )}

          <Button
            onClick={onNext}
            disabled={false} // 始终允许点击下一步
            className="px-8"
          >
            下一步：查看结果导出
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ApplicationGrader;
