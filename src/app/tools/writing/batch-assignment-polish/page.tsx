"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Progress } from "@/components/ui/progress"; // 暂时移除
import { Badge } from "@/components/ui/badge";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // 暂时移除
import { useUser } from "@/lib/user-context";
import { SupabasePointsService } from "@/lib/supabase-points-service";
import {
  StudentNameInput,
  RequirementInput,
  BatchImageUploader,
  NameMatchingConfirmation,
  SentencePolisher,
  ResultTable
} from "./components";
import type { BatchTask, Student, Requirement, StudentAssignment, ProcessingStats } from "./types";

const BatchAssignmentPolish = () => {
  const { currentUser } = useUser();
  const [currentStep, setCurrentStep] = useState(1);
  const [task, setTask] = useState<BatchTask | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [processingStats, setProcessingStats] = useState<ProcessingStats>({
    totalImages: 0,
    processedImages: 0,
    totalSentences: 0,
    polishedSentences: 0,
    errors: [],
    processingTime: 0
  });

  // 步骤配置 - 8步流程，职责分离
  const steps = [
    { id: 1, title: "导入学生姓名", description: "添加或导入学生名单" },
    { id: 2, title: "设置润色要求", description: "定义句子润色规则" },
    { id: 3, title: "批量OCR识别", description: "专注图像文字识别" },
    { id: 4, title: "确认OCR结果", description: "核对识别的原文内容" },
    { id: 5, title: "句子智能提取", description: "提取完整英文句子" },
    { id: 6, title: "姓名匹配确认", description: "匹配学生与作业" },
    { id: 7, title: "AI润色处理", description: "智能润色句子" },
    { id: 8, title: "查看结果导出", description: "导出处理结果" }
  ];

  // 初始化任务
  const initializeTask = () => {
    const newTask: BatchTask = {
      id: `task_${Date.now()}`,
      title: `批量润色任务_${new Date().toLocaleDateString()}`,
      students: [],
      requirements: [],
      assignments: [],
      status: 'setup',
      createdAt: new Date(),
      pointsCost: 0
    };
    setTask(newTask);
  };

  useEffect(() => {
    initializeTask();
  }, []);

  // 计算积分消耗
  const calculatePoints = (sentenceCount: number): number => {
    if (sentenceCount >= 10) {
      return Math.ceil(sentenceCount * 0.8); // 批量处理8折优惠
    }
    return sentenceCount;
  };

  // 更新任务状态
  const updateTask = (updates: Partial<BatchTask>) => {
    console.log('updateTask called with:', updates);
    console.log('Current task before update:', task);

    if (!task) {
      console.error('No task exists in updateTask, creating new task');
      // 如果task不存在，创建一个新的task
      const newTask: BatchTask = {
        id: `task_${Date.now()}`,
        title: `批量润色任务_${new Date().toLocaleDateString()}`,
        students: [],
        requirements: [],
        assignments: [],
        status: 'setup',
        createdAt: new Date(),
        pointsCost: 0,
        ...updates
      };
      setTask(newTask);
      return;
    }

    const updatedTask = { ...task, ...updates };
    console.log('Updated task:', updatedTask);
    setTask(updatedTask);
  };

  // 更新学生列表
  const updateStudents = (students: Student[]) => {
    console.log('updateStudents called with:', students.length, 'students');
    updateTask({ students });
  };

  // 更新要求列表
  const updateRequirements = (requirements: Requirement[]) => {
    console.log('updateRequirements called with:', requirements.length, 'requirements');
    updateTask({ requirements });
  };

  // 更新作业列表
  const updateAssignments = (assignments: StudentAssignment[]) => {
    console.log('updateAssignments called with:', assignments.length, 'assignments');
    console.log('Current task:', task);

    if (assignments.length === 0) {
      console.warn('No assignments to update');
      return;
    }

    console.log('Updating task with assignments:', assignments);
    updateTask({ assignments });
  };

  // 计算进度百分比
  const getProgressPercentage = () => {
    return Math.round((currentStep / steps.length) * 100);
  };

  // 获取步骤状态
  const getStepStatus = (stepId: number) => {
    if (stepId < currentStep) return 'completed';
    if (stepId === currentStep) return 'current';
    return 'pending';
  };

  // 下一步
  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  // 上一步
  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!currentUser) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-gray-600">请先登录后使用批量润色功能</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* 头部信息 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          批量修改润色学生英语作业
        </h1>
        <p className="text-gray-600">
          智能OCR识别 + AI润色修改，高效处理学生作业
        </p>
      </div>

      {/* 进度条 */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">处理进度</h3>
            <Badge variant="secondary">
              {currentStep} / {steps.length}
            </Badge>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
            {steps.map((step) => (
              <div
                key={step.id}
                className={`text-center p-2 rounded-lg border ${
                  getStepStatus(step.id) === 'completed'
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : getStepStatus(step.id) === 'current'
                    ? 'bg-blue-50 border-blue-200 text-blue-800'
                    : 'bg-gray-50 border-gray-200 text-gray-600'
                }`}
              >
                <div className="text-xs font-medium">{step.title}</div>
                <div className="text-xs opacity-75 mt-1">{step.id}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 主要内容 */}
      <Card>
        <CardHeader>
          <CardTitle>
            {steps[currentStep - 1].title}
            <div className="text-sm font-normal text-gray-600 mt-1">
              {steps[currentStep - 1].description}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="min-h-[500px]">
          {currentStep === 1 && (
            <StudentNameInput
              students={task?.students || []}
              onStudentsChange={updateStudents}
            />
          )}

          {currentStep === 2 && (
            <RequirementInput
              requirements={task?.requirements || []}
              onRequirementsChange={updateRequirements}
            />
          )}

          {currentStep === 3 && (
            <BatchImageUploader
              onOCRComplete={(assignments) => {
                console.log('=== OCR Complete callback triggered ===');
                console.log('Assignments received:', assignments);
                console.log('Assignments length:', assignments?.length || 0);

                if (assignments && assignments.length > 0) {
                  console.log('First assignment sample:', assignments[0]);
                  console.log('First OCR result:', assignments[0].ocrResult);
                }

                updateAssignments(assignments);
                updateTask({ status: 'ocr_processing' });

                // 强制检查是否assignments已经更新
                setTimeout(() => {
                  console.log('=== Checking assignments after timeout ===');
                  console.log('Current task after OCR:', task);
                  console.log('Assignments count:', task?.assignments.length || 0);
                  if (task?.assignments?.length > 0) {
                    console.log('Task first assignment:', task.assignments[0]);
                  }
                }, 100);
              }}
              onStatsUpdate={setProcessingStats}
            />
          )}

          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="text-center py-8">
                <h3 className="text-lg font-semibold mb-4">OCR结果确认</h3>
                <p className="text-gray-600 mb-6">
                  请核对OCR识别的原文内容，确保文本提取准确
                </p>

                {/* 检查是否有OCR数据 */}
                {!task?.assignments?.length ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                    <div className="text-yellow-800">
                      <h4 className="font-semibold mb-2">⚠️ 缺少OCR识别数据</h4>
                      <p className="mb-4">
                        您还没有进行OCR识别处理。请先上传图片并完成OCR识别。
                      </p>
                      <Button
                        onClick={() => setCurrentStep(3)}
                        className="bg-yellow-600 hover:bg-yellow-700"
                      >
                        返回第3步进行OCR识别
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* 调试信息 */}
                    <div className="text-xs text-gray-500 mb-4 p-2 bg-gray-100 rounded">
                      <div>🔧 调试信息:</div>
                      <div>task存在: {task ? '是' : '否'}</div>
                      <div>assignments数量: {task?.assignments?.length || 0}</div>
                      <div>当前步骤: {currentStep}</div>
                      <div>task详情: {JSON.stringify(task, null, 2)}</div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium mb-2">识别结果预览</h4>
                      {task?.assignments?.map((assignment, index) => (
                        <div key={assignment.id} className="mb-4 p-3 bg-white rounded border">
                          <div className="font-medium text-blue-600 mb-1">
                            学生: {assignment.student.name}
                          </div>
                          <div className="text-sm text-gray-700">
                            原文: {assignment.ocrResult.sentences.join('. ') + (assignment.ocrResult.sentences.length > 0 ? '.' : '')}
                          </div>
                          {/* 额外的调试信息 */}
                          <div className="text-xs text-gray-400 mt-2">
                            句子数量: {assignment.ocrResult.sentences.length} |
                            置信度: {assignment.ocrResult.confidence} |
                            处理时间: {assignment.ocrResult.processedAt.toLocaleTimeString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="text-center py-8">
                <h3 className="text-lg font-semibold mb-4">句子智能提取</h3>
                <p className="text-gray-600 mb-6">
                  AI将从OCR文本中提取完整的英文句子
                </p>
                <Button
                  onClick={async () => {
                    if (!task?.assignments?.length) {
                      alert('没有作业数据需要处理');
                      return;
                    }

                    setIsLoading(true);
                    try {
                      const updatedAssignments = await Promise.all(
                        task.assignments.map(async (assignment) => {
                          const fullText = assignment.ocrResult.sentences.join(' ');

                          const response = await fetch('/api/ai/extract-sentences', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              text: fullText,
                              options: {
                                minLength: 10,
                                includeFragments: false,
                                preserveOriginal: true
                              }
                            })
                          });

                          if (response.ok) {
                            const data = await response.json();
                            return {
                              ...assignment,
                              extractedSentences: data.result.extractedSentences,
                              extractionMethod: 'ai' as const
                            };
                          } else {
                            return {
                              ...assignment,
                              extractedSentences: assignment.ocrResult.sentences,
                              extractionMethod: 'traditional' as const
                            };
                          }
                        })
                      );

                      updateAssignments(updatedAssignments);
                      updateTask({ status: 'sentence_extraction' });
                      handleNext();
                    } catch (error) {
                      console.error('句子提取失败:', error);
                      alert('句子提取失败，请重试');
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  disabled={isLoading || !task?.assignments?.length}
                  className="w-full max-w-xs mx-auto"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      提取中...
                    </>
                  ) : (
                    '开始智能提取句子'
                  )}
                </Button>
              </div>
            </div>
          )}

          {currentStep === 6 && (
            <NameMatchingConfirmation
              assignments={task?.assignments || []}
              students={task?.students || []}
              onAssignmentsChange={updateAssignments}
              onMatchComplete={() => {
                updateTask({ status: 'name_matching' });
                handleNext();
              }}
            />
          )}

        {currentStep === 7 && (
            <SentencePolisher
              assignments={task?.assignments || []}
              requirements={task?.requirements || []}
              onPolishComplete={(assignments) => {
                updateAssignments(assignments);
                updateTask({
                  status: 'completed',
                  completedAt: new Date(),
                  pointsCost: calculatePoints(
                    assignments.reduce((total, assignment) =>
                      total + assignment.polishedSentences.length, 0
                    )
                  )
                });
                handleNext();
              }}
              onStatsUpdate={setProcessingStats}
            />
          )}

        {currentStep === 8 && (
            <ResultTable
              task={task}
              stats={processingStats}
            />
          )}

          {/* 导航按钮 */}
          <div className="flex justify-between mt-6 pt-6 border-t">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1}
            >
              上一步
            </Button>

            <div className="flex items-center gap-4">
              {task && (
                <div className="text-sm text-gray-600">
                  预计消耗: <span className="font-semibold text-purple-600">
                    {calculatePoints(
                      task.assignments.reduce((total, assignment) =>
                        total + assignment.ocrResult.sentences.length, 0
                      )
                    )} 积分
                  </span>
                </div>
              )}

              {currentStep < 8 && (
                <Button
                  onClick={() => {
                    console.log('Next button clicked, currentStep:', currentStep);
                    console.log('Task state:', task);
                    console.log('Students count:', task?.students.length || 0);
                    console.log('Requirements count:', task?.requirements.length || 0);
                    console.log('Assignments count:', task?.assignments.length || 0);

                    // 移除临时修复逻辑，让真实的OCR结果正常显示
                    console.log('使用真实OCR结果，不创建临时数据');

                    handleNext();
                  }}
                  disabled={
                    (currentStep === 1 && (!task?.students.length)) ||
                    (currentStep === 2 && (!task?.requirements.length)) ||
                    (currentStep === 3 && (!task?.assignments.length) && processingStats.processedImages === 0)
                  }
                >
                  下一步
                </Button>
              )}

              {/* 调试信息 */}
              {process.env.NODE_ENV === 'development' && (
                <div className="text-xs text-gray-500 mt-2">
                  Step {currentStep} - Students: {task?.students.length || 0} -
                  Requirements: {task?.requirements.length || 0} -
                  Assignments: {task?.assignments.length || 0}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 处理统计 */}
      {processingStats.totalImages > 0 && (
        <Card className="mt-6">
          <CardContent className="p-4">
            <h4 className="font-semibold mb-2">处理统计</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-gray-600">图片处理</div>
                <div className="font-semibold">
                  {processingStats.processedImages} / {processingStats.totalImages}
                </div>
              </div>
              <div>
                <div className="text-gray-600">句子润色</div>
                <div className="font-semibold">
                  {processingStats.polishedSentences} / {processingStats.totalSentences}
                </div>
              </div>
              <div>
                <div className="text-gray-600">处理时间</div>
                <div className="font-semibold">
                  {Math.round(processingStats.processingTime / 1000)}秒
                </div>
              </div>
              <div>
                <div className="text-gray-600">错误数量</div>
                <div className="font-semibold text-red-600">
                  {processingStats.errors.length}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BatchAssignmentPolish;