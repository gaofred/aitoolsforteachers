"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Progress } from "@/components/ui/progress"; // 暂时移除
import { Badge } from "@/components/ui/badge";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // 暂时移除
import { Home } from "lucide-react";
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

  // 步骤配置 - 8步流程，职责分离
  const steps = [
    { id: 1, title: "导入学生姓名", description: "添加或导入学生名单" },
    { id: 2, title: "设置润色要求", description: "定义句子润色规则（可选）" },
    { id: 3, title: "批量OCR识别", description: "专注图像文字识别" },
    { id: 4, title: "确认OCR结果", description: "核对识别的原文内容" },
    { id: 5, title: "句子智能提取", description: "提取完整英文句子" },
    { id: 6, title: "姓名匹配确认", description: "匹配学生与作业" },
    { id: 7, title: "AI句子润色", description: "智能批改和润色" },
    { id: 8, title: "查看结果导出", description: "导出润色结果" }
  ];

  // 初始化任务
  const initializeTask = () => {
    const newTask: BatchTask = {
      id: `task_${Date.now()}`,
      title: `批量作业润色_${new Date().toLocaleDateString()}`,
      students: [],
      requirements: "",
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
  const calculatePoints = (studentCount: number) => {
    return studentCount * 2; // 每个学生2点数
  };

  // 处理步骤切换
  const handleStepChange = (step: number) => {
    if (step <= currentStep + 1) {
      setCurrentStep(step);
    }
  };

  // 处理下一步
  const handleNextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  // 处理上一步
  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // 用户未登录时的显示
  if (!currentUser) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-gray-600 mb-4">请先登录后使用批量作业润色功能</p>
            <Button
              onClick={() => router.push('/auth/signin')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              前往登录
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* 顶部导航 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/')}
              className="flex items-center gap-2"
            >
              <Home className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">首页</span>
            </Button>
            <div className="h-6 w-px bg-gray-300"></div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
              批量修改学生作文
            </h1>
          </div>
          <p className="text-sm sm:text-base text-gray-600 pl-0 sm:pl-12">
            智能OCR识别 + AI批改润色，高效处理学生英语作文作业
          </p>
        </div>
      </div>

      {/* 步骤指示器 */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between overflow-x-auto">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center min-w-0">
                <div
                  className={`flex items-center cursor-pointer ${
                    step.id <= currentStep ? 'text-blue-600' : 'text-gray-400'
                  }`}
                  onClick={() => handleStepChange(step.id)}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 ${
                      step.id === currentStep
                        ? 'bg-blue-600 text-white border-blue-600'
                        : step.id < currentStep
                        ? 'bg-blue-100 text-blue-600 border-blue-600'
                        : 'bg-gray-100 text-gray-400 border-gray-300'
                    }`}
                  >
                    {step.id}
                  </div>
                  <div className="ml-2 hidden sm:block">
                    <div className="text-sm font-medium">{step.title}</div>
                    <div className="text-xs text-gray-500">{step.description}</div>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`w-8 h-0.5 mx-2 ${
                      step.id < currentStep ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-6xl mx-auto">
          {/* 步骤内容 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            {currentStep === 1 && (
              <StudentNameInput
                task={task}
                setTask={setTask}
                onNext={handleNextStep}
              />
            )}

            {currentStep === 2 && (
              <RequirementInput
                task={task}
                setTask={setTask}
                onNext={handleNextStep}
                onPrev={handlePrevStep}
              />
            )}

            {currentStep === 3 && (
              <BatchImageUploader
                task={task}
                setTask={setTask}
                onNext={handleNextStep}
                onPrev={handlePrevStep}
                processingStats={processingStats}
                setProcessingStats={setProcessingStats}
              />
            )}

            {currentStep === 4 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">OCR结果确认</h2>
                  <p className="text-gray-600 text-sm">
                    请核对OCR识别的原文内容，确保准确无误后再进行下一步
                  </p>
                </div>
                <Card>
                  <CardContent className="p-6 text-center text-gray-500">
                    OCR确认功能开发中...
                  </CardContent>
                </Card>
              </div>
            )}

            {currentStep === 5 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">句子智能提取</h2>
                  <p className="text-gray-600 text-sm">
                    AI将从OCR结果中提取完整的英文句子，为润色做准备
                  </p>
                </div>
                <Card>
                  <CardContent className="p-6 text-center text-gray-500">
                    句子提取功能开发中...
                  </CardContent>
                </Card>
              </div>
            )}

            {currentStep === 6 && (
              <NameMatchingConfirmation
                task={task}
                setTask={setTask}
                onNext={handleNextStep}
                onPrev={handlePrevStep}
                editedTexts={editedTexts}
              />
            )}

            {currentStep === 7 && (
              <SentencePolisher
                task={task}
                setTask={setTask}
                onNext={handleNextStep}
                onPrev={handlePrevStep}
                processingStats={processingStats}
                setProcessingStats={setProcessingStats}
                isPolishCompleted={isPolishCompleted}
                setIsPolishCompleted={setIsPolishCompleted}
                userId={currentUser?.id}
              />
            )}

            {currentStep === 8 && (
              <ResultTable
                task={task}
                onPrev={handlePrevStep}
                isPolishCompleted={isPolishCompleted}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BatchAssignmentPolish;