"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Progress } from "@/components/ui/progress"; // 暂时移除
import { Badge } from "@/components/ui/badge";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // 暂时移除
import { Home, ZoomIn, X, ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
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
import NoSSR from "@/components/NoSSR";

const BatchAssignmentPolish = () => {
  const router = useRouter();
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
  const [isPolishCompleted, setIsPolishCompleted] = useState(false);
  const [editingAssignments, setEditingAssignments] = useState<{[key: string]: boolean}>({});
  const [editedTexts, setEditedTexts] = useState<{[key: string]: string}>({});

  // 图片预览相关状态
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [currentImageTitle, setCurrentImageTitle] = useState('');

  // OCR结果分页相关状态
  const [ocrCurrentPage, setOcrCurrentPage] = useState(1);
  const [ocrPageSize] = useState(5); // 每页显示5个OCR结果

  // 步骤配置 - 8步流程，职责分离
  const steps = [
    { id: 1, title: "导入学生姓名", description: "添加或导入学生名单" },
    { id: 2, title: "设置润色要求", description: "定义句子润色规则（可选）" },
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

  // 计算点数消耗（按学生数计算）
  const calculatePoints = (studentCount: number): number => {
    // 每个学生1.5点数，向上取整
    return Math.ceil(studentCount * 1.5);
  };

  // 处理图片放大
  const handleImageEnlarge = (imageData: string, studentName: string) => {
    setEnlargedImage(imageData);
    setCurrentImageTitle(`学生作业图片 - ${studentName}`);
    setShowImageModal(true);
  };

  // 关闭图片放大
  const handleCloseImageModal = () => {
    setShowImageModal(false);
    setEnlargedImage(null);
    setCurrentImageTitle('');
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

    // 重置OCR分页到第一页
    resetOcrPage();
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

  // OCR结果分页计算
  const getOcrPageData = () => {
    if (!task?.assignments?.length) return { currentPageData: [], totalPages: 0, startIndex: 0, endIndex: 0 };

    const totalItems = task.assignments.length;
    const totalPages = Math.ceil(totalItems / ocrPageSize);
    const startIndex = (ocrCurrentPage - 1) * ocrPageSize;
    const endIndex = Math.min(startIndex + ocrPageSize, totalItems);
    const currentPageData = task.assignments.slice(startIndex, endIndex);

    return {
      currentPageData,
      totalPages,
      startIndex,
      endIndex,
      totalItems
    };
  };

  // 重置OCR分页到第一页（当数据更新时）
  const resetOcrPage = () => {
    setOcrCurrentPage(1);
  };

  // OCR分页组件
  const OcrPagination = () => {
    const { totalPages, totalItems, startIndex, endIndex } = getOcrPageData();

    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-between bg-white px-4 py-3 border border-gray-200 rounded-lg">
        <div className="flex items-center text-sm text-gray-700">
          <span className="mr-2">
            显示第 {startIndex + 1} - {endIndex} 项，共 {totalItems} 项
          </span>
          <Badge variant="secondary">
            第 {ocrCurrentPage} / {totalPages} 页
          </Badge>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOcrCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={ocrCurrentPage === 1}
            className="flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            上一页
          </Button>

          <div className="flex items-center space-x-1">
            {/* 显示页码 */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNumber;
              if (totalPages <= 5) {
                pageNumber = i + 1;
              } else if (ocrCurrentPage <= 3) {
                pageNumber = i + 1;
              } else if (ocrCurrentPage >= totalPages - 2) {
                pageNumber = totalPages - 4 + i;
              } else {
                pageNumber = ocrCurrentPage - 2 + i;
              }

              return (
                <Button
                  key={pageNumber}
                  variant={ocrCurrentPage === pageNumber ? "default" : "outline"}
                  size="sm"
                  onClick={() => setOcrCurrentPage(pageNumber)}
                  className="w-8 h-8 p-0"
                >
                  {pageNumber}
                </Button>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setOcrCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={ocrCurrentPage === totalPages}
            className="flex items-center gap-1"
          >
            下一页
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
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

  // 重新开始
  const handleRestart = () => {
    if (confirm('确定要重新开始吗？当前所有数据将被清空。')) {
      // 重置所有状态
      setCurrentStep(1);
      initializeTask();
      setProcessingStats({
        totalImages: 0,
        processedImages: 0,
        totalSentences: 0,
        polishedSentences: 0,
        errors: [],
        processingTime: 0
      });
      setIsLoading(false);
    }
  };

  if (!currentUser) {
    if (typeof window !== 'undefined') {
      router.push('/auth/signin');
    }
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-gray-600 mb-4">请先登录后使用批量作业润色功能</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <NoSSR>
      <div className="container mx-auto p-3 sm:p-4 md:p-6 max-w-6xl">
      {/* 头部信息 */}
      <div className="mb-4 sm:mb-6 md:mb-8">
        <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/')}
            className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-2 sm:px-3"
          >
            <Home className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">首页</span>
          </Button>
          <div className="h-6 w-px bg-gray-300"></div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
            批量润色学生英文句子
          </h1>
        </div>
        <p className="text-sm sm:text-base text-gray-600 pl-0 sm:pl-12">
          智能OCR识别 + AI润色修改，高效处理学生作业
        </p>
      </div>

      {/* 进度条 */}
      <Card className="mb-4 sm:mb-6 md:mb-8">
        <CardContent className="p-3 sm:p-4 md:p-6">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="text-base sm:text-lg font-semibold">处理进度</h3>
            <Badge variant="secondary" className="text-xs sm:text-sm">
              {currentStep} / {steps.length}
            </Badge>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2 mb-3 sm:mb-4">
              <div
                className="bg-blue-600 h-1.5 sm:h-2 rounded-full transition-all duration-300"
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-8 gap-1.5 sm:gap-2">
            {steps.map((step) => (
              <div
                key={step.id}
                className={`text-center p-1.5 sm:p-2 rounded-lg border ${
                  getStepStatus(step.id) === 'completed'
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : getStepStatus(step.id) === 'current'
                    ? 'bg-blue-50 border-blue-200 text-blue-800'
                    : 'bg-gray-50 border-gray-200 text-gray-600'
                }`}
              >
                <div className="text-[10px] sm:text-xs font-medium leading-tight">{step.title}</div>
                <div className="text-[10px] sm:text-xs opacity-75 mt-0.5 sm:mt-1">{step.id}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 主要内容 */}
      <Card>
        <CardHeader className="p-3 sm:p-4 md:p-6">
          <CardTitle className="text-base sm:text-lg md:text-xl">
            {steps[currentStep - 1].title}
            <div className="text-xs sm:text-sm font-normal text-gray-600 mt-1">
              {steps[currentStep - 1].description}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="min-h-[300px] sm:min-h-[400px] md:min-h-[500px] p-3 sm:p-4 md:p-6">
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
                  
                  // 直接更新task状态，包含assignments
                  setTask(prevTask => {
                    if (!prevTask) {
                      console.error('No task exists, creating new one with assignments');
                      return {
                        id: `task_${Date.now()}`,
                        title: `批量润色任务_${new Date().toLocaleDateString()}`,
                        students: [],
                        requirements: [],
                        assignments: assignments,
                        status: 'ocr_completed',
                        createdAt: new Date(),
                        pointsCost: 0
                      };
                    }
                    
                    const updated = {
                      ...prevTask,
                      assignments: assignments,
                      status: 'ocr_completed' as const
                    };
                    console.log('Task updated with assignments:', updated);
                    return updated;
                  });
                } else {
                  console.warn('No assignments received from OCR');
                }
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

                {/* 检查是否有OCR数据 - 同时检查task.assignments和processingStats */}
                {(!task?.assignments?.length && processingStats.processedImages === 0) ? (
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
                ) : task?.assignments?.length ? (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium text-left">识别结果预览</h4>
                      <Badge variant="outline" className="text-sm">
                        共 {task.assignments.length} 个学生
                      </Badge>
                    </div>

                    {/* OCR分页控制 */}
                    <div className="mb-6">
                      <OcrPagination />
                    </div>

                    {getOcrPageData().currentPageData.map((assignment, index) => (
                      <div key={assignment.id} className="mb-6">
                        <div className="font-medium text-blue-600 mb-3 text-lg">
                          提取的学生姓名: <span className="text-blue-800 bg-blue-50 px-2 py-1 rounded">{assignment.ocrResult.studentName}</span>
                          <span className="text-gray-500 text-sm ml-3">匹配学生: <span className="font-medium">{assignment.student.name}</span></span>
                        </div>

                        {/* 左右分栏布局 */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* 左栏：OCR文本内容 */}
                          <div className="space-y-4">
                            {/* 完整原文显示和编辑 */}
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <div className="font-medium text-gray-700 text-sm">完整OCR原文:</div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const isEditing = editingAssignments[assignment.id];
                                    if (isEditing) {
                                      // 保存编辑
                                      const editedText = editedTexts[assignment.id];
                                      if (editedText !== undefined) {
                                        // 更新assignment的OCR结果
                                        setTask(prevTask => {
                                          if (!prevTask) return prevTask;
                                          const updatedAssignments = prevTask.assignments.map(a =>
                                            a.id === assignment.id
                                              ? {
                                                  ...a,
                                                  ocrResult: {
                                                    ...a.ocrResult,
                                                    editedText: editedText
                                                  }
                                                }
                                              : a
                                          );
                                          return {
                                            ...prevTask,
                                            assignments: updatedAssignments
                                          };
                                        });
                                      }
                                      setEditingAssignments(prev => ({ ...prev, [assignment.id]: false }));
                                    } else {
                                      // 开始编辑
                                      setEditingAssignments(prev => ({ ...prev, [assignment.id]: true }));
                                      setEditedTexts(prev => ({
                                        ...prev,
                                        [assignment.id]: assignment.ocrResult.editedText || assignment.ocrResult.originalText || ''
                                      }));
                                    }
                                  }}
                                  className="text-xs"
                                >
                                  {editingAssignments[assignment.id] ? '保存' : '编辑'}
                                </Button>
                              </div>

                              {editingAssignments[assignment.id] ? (
                                <textarea
                                  value={editedTexts[assignment.id] || ''}
                                  onChange={(e) => {
                                    setEditedTexts(prev => ({
                                      ...prev,
                                      [assignment.id]: e.target.value
                                    }));
                                  }}
                                  className="w-full p-3 border border-gray-300 rounded text-sm text-gray-800 whitespace-pre-wrap break-words min-h-32 resize-y"
                                  placeholder="请输入或修改OCR识别的文本内容..."
                                />
                              ) : (
                                <div className="bg-gray-50 p-3 rounded border border-gray-300 text-sm text-gray-800 whitespace-pre-wrap break-words max-h-96 overflow-y-auto">
                                  {assignment.ocrResult.editedText || assignment.ocrResult.originalText || '未识别到原文'}
                                </div>
                              )}

                              {assignment.ocrResult.editedText && (
                                <div className="text-xs text-green-600 mt-1">
                                  ✓ 已编辑 - 将使用编辑后的内容进行句子提取
                                </div>
                              )}
                            </div>

                            {/* 提取的句子预览 */}
                            <div>
                              <div className="font-medium text-gray-700 mb-2 text-sm">提取的句子 ({assignment.ocrResult.sentences.length}个):</div>
                              <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded border border-gray-200">
                                {assignment.ocrResult.sentences.length > 0
                                  ? assignment.ocrResult.sentences.map((sentence, idx) => (
                                      <div key={idx} className="mb-2 last:mb-0">
                                        <span className="text-gray-500 text-xs mr-2">{idx + 1}.</span>
                                        {sentence}
                                      </div>
                                    ))
                                  : '未提取到句子'
                                }
                              </div>
                            </div>

                            {/* 统计信息 */}
                            <div className="flex gap-4 text-xs text-gray-500 pt-2 border-t border-gray-200">
                              <div>句子数量: <span className="font-medium">{assignment.ocrResult.sentences.length}</span></div>
                              <div>原文长度: <span className="font-medium">{assignment.ocrResult.originalText?.length || 0} 字符</span></div>
                              <div>置信度: <span className="font-medium">{assignment.ocrResult.confidence}</span></div>
                              <div>处理时间: <span className="font-medium">{assignment.ocrResult.processedAt.toLocaleTimeString()}</span></div>
                            </div>
                          </div>

                          {/* 右栏：原始图片 */}
                          <div>
                            <div className="font-medium text-gray-700 mb-2 text-sm">原始图片:</div>
                            {assignment.ocrResult.imageData ? (
                              <div className="space-y-2">
                                <div className="border rounded-lg overflow-hidden bg-gray-50 relative group">
                                  <img
                                    src={assignment.ocrResult.imageData}
                                    alt={`学生作业图片 - ${assignment.student.name}`}
                                    className="w-full h-auto max-h-96 object-contain"
                                    style={{ maxHeight: '400px' }}
                                  />
                                  {/* 放大镜按钮 */}
                                  <button
                                    onClick={() => handleImageEnlarge(assignment.ocrResult.imageData!, assignment.student.name)}
                                    className="absolute top-2 right-2 bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-700 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                    title="放大查看"
                                  >
                                    <ZoomIn className="w-4 h-4" />
                                  </button>
                                </div>
                                <div className="text-xs text-gray-500 text-center">
                                  📸 原始作业图片，方便核对OCR识别结果
                                </div>
                              </div>
                            ) : (
                              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50">
                                <div className="text-gray-500">
                                  <svg className="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  <div className="text-sm">图片数据不可用</div>
                                  <div className="text-xs mt-1">请返回上传步骤重新上传图片</div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* 底部分页控制 */}
                    <div className="mt-6">
                      <OcrPagination />
                    </div>
                  </div>
                ) : (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <div className="text-blue-800">
                      <h4 className="font-semibold mb-2">🔄 正在加载OCR结果...</h4>
                      <p className="mb-4">
                        OCR识别已完成（{processingStats.processedImages}张图片），数据正在加载中...
                      </p>
                      <Button
                        onClick={() => {
                          // 强制刷新状态 - 使用useRouter代替window.location
                          if (typeof window !== 'undefined') {
                            router.refresh();
                          }
                        }}
                        variant="outline"
                        className="border-blue-600 text-blue-600 hover:bg-blue-100"
                      >
                        刷新页面
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="text-center py-8">
                <h3 className="text-lg font-semibold mb-4">句子智能提取</h3>
                <p className="text-gray-600 mb-6">
                  AI将从OCR文本（包括您编辑后的内容）中提取完整的英文句子
                </p>
                
                {/* 显示当前作业信息 */}
                {task?.assignments?.length > 0 && (
                  <div className="mb-6 text-sm text-gray-600">
                    <p>准备提取 <span className="font-semibold text-blue-600">{task.assignments.length}</span> 份作业的句子</p>
                    {(() => {
                      const editedCount = task.assignments.filter(a => a.ocrResult.editedText).length;
                      if (editedCount > 0) {
                        return (
                          <p className="text-green-600 mt-1">
                            ✓ 其中 <span className="font-semibold">{editedCount}</span> 份作业使用了编辑后的内容
                          </p>
                        );
                      }
                      return null;
                    })()}
                  </div>
                )}

                <Button
                  onClick={async () => {
                    if (!task?.assignments?.length) {
                      alert('没有作业数据需要处理');
                      return;
                    }

                    setIsLoading(true);
                    const errors: string[] = [];
                    
                    try {
                      const updatedAssignments = await Promise.all(
                        task.assignments.map(async (assignment, index) => {
                          try {
                            // 优先使用编辑后的文本，如果没有则使用OCR原文
                            const fullText = assignment.ocrResult.editedText || assignment.ocrResult.originalText || assignment.ocrResult.sentences.join(' ');
                            
                            console.log(`[${index + 1}/${task.assignments.length}] 提取学生 ${assignment.student.name} 的句子...`);
                            console.log('原文长度:', fullText.length);

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

                            const data = await response.json();
                            console.log(`学生 ${assignment.student.name} 的API响应:`, data);

                            if (response.ok && data.success) {
                              const extractedSentences = data.result?.extractedSentences || [];
                              console.log(`✅ 成功提取 ${extractedSentences.length} 个句子`);
                              
                              return {
                                ...assignment,
                                extractedSentences: extractedSentences.length > 0 ? extractedSentences : assignment.ocrResult.sentences,
                                extractionMethod: extractedSentences.length > 0 ? 'ai' as const : 'traditional' as const
                              };
                            } else {
                              const errorMsg = data.error || '未知错误';
                              console.warn(`⚠️ AI提取失败，使用原始句子。错误: ${errorMsg}`);
                              errors.push(`${assignment.student.name}: ${errorMsg}`);
                              
                              return {
                                ...assignment,
                                extractedSentences: assignment.ocrResult.sentences,
                                extractionMethod: 'traditional' as const
                              };
                            }
                          } catch (error) {
                            const errorMsg = error instanceof Error ? error.message : '网络错误';
                            console.error(`❌ 学生 ${assignment.student.name} 处理失败:`, error);
                            errors.push(`${assignment.student.name}: ${errorMsg}`);
                            
                            return {
                              ...assignment,
                              extractedSentences: assignment.ocrResult.sentences,
                              extractionMethod: 'traditional' as const
                            };
                          }
                        })
                      );

                      // 更新状态
                      setTask(prevTask => {
                        if (!prevTask) return prevTask;
                        return {
                          ...prevTask,
                          assignments: updatedAssignments,
                          status: 'sentence_extraction'
                        };
                      });

                      // 显示结果
                      if (errors.length > 0) {
                        alert(`部分作业使用了备用提取方式：\n${errors.join('\n')}\n\n已使用基础分割方式处理这些作业。`);
                      } else {
                        console.log('✅ 所有作业句子提取完成');
                      }

                      // 进入下一步
                      handleNext();
                    } catch (error) {
                      console.error('句子提取失败:', error);
                      alert(`句子提取失败: ${error instanceof Error ? error.message : '未知错误'}\n\n请检查网络连接后重试。`);
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

                {/* 显示提取说明 */}
                <div className="mt-6 text-xs text-gray-500 max-w-md mx-auto">
                  <p>💡 提示：如果 AI 提取失败，系统会自动使用基础分割方式处理</p>
                </div>
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
                console.log('=== 润色完成回调 ===');
                console.log('接收到的 assignments:', assignments.length);
                console.log('第一个 assignment 的 polishedSentences:', assignments[0]?.polishedSentences?.length || 0);
                
                // 计算点数消耗（按学生数计算）
                const studentCount = assignments.length;
                const pointsCost = calculatePoints(studentCount);
                
                console.log('学生数量:', studentCount);
                console.log('点数消耗:', pointsCost);
                
                // 直接更新完整的 task，确保 assignments 和状态一起更新
                setTask(prevTask => {
                  if (!prevTask) {
                    console.error('No task exists in onPolishComplete');
                    return null;
                  }
                  
                  const updated = {
                    ...prevTask,
                    assignments: assignments,
                    status: 'completed' as const,
                    completedAt: new Date(),
                    pointsCost: pointsCost
                  };
                  
                  console.log('更新后的 task:', updated);
                  console.log('更新后的 assignments 数量:', updated.assignments.length);
                  console.log('第一个 assignment 的 polishedSentences:', updated.assignments[0]?.polishedSentences?.length || 0);
                  
                  return updated;
                });
                
                // 设置润色完成状态
                setIsPolishCompleted(true);
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
          <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-0 mt-4 sm:mt-6 pt-4 sm:pt-6 border-t">
            <div className="flex gap-2 justify-center sm:justify-start">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 1}
                className="flex-1 sm:flex-none text-sm"
              >
                上一步
              </Button>
              <Button
                variant="outline"
                onClick={handleRestart}
                className="flex-1 sm:flex-none text-sm text-orange-600 border-orange-200 hover:bg-orange-50"
              >
                重新开始
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
              {task && (
                <div className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
                  预计消耗: <span className="font-semibold text-purple-600">
                    {calculatePoints(task.assignments.length || task.students.length || 0)} 点数
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
                    (currentStep === 3 && (!task?.assignments.length) && processingStats.processedImages === 0)
                  }
                  className="w-full sm:w-auto text-sm"
                >
                  下一步
                </Button>
              )}

              {/* 调试信息 */}
              {process.env.NODE_ENV === 'development' && (
                <div className="text-xs text-gray-500 mt-2 text-center sm:text-left">
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
        <Card className="mt-3 sm:mt-4 md:mt-6">
          <CardContent className="p-3 sm:p-4">
            <h4 className="text-sm sm:text-base font-semibold mb-2 sm:mb-3">处理统计</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 text-xs sm:text-sm">
              <div>
                <div className="text-gray-600">图片处理</div>
                <div className="font-semibold text-sm sm:text-base">
                  {processingStats.processedImages} / {processingStats.totalImages}
                </div>
              </div>
              <div>
                <div className="text-gray-600">句子润色</div>
                <div className="font-semibold text-sm sm:text-base">
                  {processingStats.polishedSentences} / {processingStats.totalSentences}
                </div>
              </div>
              <div>
                <div className="text-gray-600">处理时间</div>
                <div className="font-semibold text-sm sm:text-base">
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

      {/* 图片放大查看模态框 */}
      {showImageModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={handleCloseImageModal}
        >
          <div
            className="relative max-w-7xl max-h-full bg-white rounded-lg shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 关闭按钮 */}
            <button
              onClick={handleCloseImageModal}
              className="absolute top-2 right-2 z-10 bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-700 p-2 rounded-full shadow-lg"
              title="关闭"
            >
              <X className="w-5 h-5" />
            </button>

            {/* 标题 */}
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {currentImageTitle}
              </h3>
            </div>

            {/* 图片容器 */}
            <div className="p-6 overflow-auto" style={{ maxHeight: '80vh' }}>
              <img
                src={enlargedImage!}
                alt={currentImageTitle}
                className="max-w-full h-auto object-contain"
                style={{ maxHeight: '70vh' }}
              />
            </div>

            {/* 底部操作栏 */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  💡 提示：可以使用鼠标滚轮或触摸手势进行缩放
                </p>
                <Button
                  onClick={handleCloseImageModal}
                  className="bg-gray-600 hover:bg-gray-700"
                >
                  关闭
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </NoSSR>
  );
};

export default BatchAssignmentPolish;