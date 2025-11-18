"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Home } from "lucide-react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/user-context";
import { SupabasePointsService } from "@/lib/supabase-points-service";
import {
  StudentNameInput,
  ApplicationTopicInput,
  BatchImageUploader,
  ApplicationContentConfirmation,
  NameMatchingConfirmation,
  ApplicationGrader,
  ApplicationResultTable
} from "./components";
import type { ApplicationBatchTask, Student, ApplicationAssignment, ProcessingStats } from "./types";

// 检测是否为移动设备的工具函数
const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;

  // 检测 User Agent
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

  // 检测屏幕尺寸
  const isMobileScreen = window.innerWidth <= 768;

  // 检测触摸设备
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  return isMobileUA || (isMobileScreen && isTouchDevice);
};

const BatchApplicationWritingPolish = () => {
  const router = useRouter();
  const { currentUser } = useUser();
  const [currentStep, setCurrentStep] = useState(1);

  // 调试日志：页面加载检查
  console.log('🔍 批量修改应用文页面加载完成, currentUser:', currentUser ? '已登录' : '未登录');
  const [isMobile, setIsMobile] = useState(false);
  const [task, setTask] = useState<ApplicationBatchTask | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [processingStats, setProcessingStats] = useState<ProcessingStats>({
    totalImages: 0,
    processedImages: 0,
    totalApplications: 0,
    gradedApplications: 0,
    errors: [],
    processingTime: 0,
    averageScore: 0
  });
  const [isGradingCompleted, setIsGradingCompleted] = useState(false);
  const [editingAssignments, setEditingAssignments] = useState<{[key: string]: boolean}>({});
  const [editedTexts, setEditedTexts] = useState<{[key: string]: string}>({});

  // 步骤配置 - 7步流程（第一步可选）
  const steps = [
    { id: 1, title: "导入学生姓名 (可选)", description: "添加或导入学生名单，可跳过" },
    { id: 2, title: "输入应用文题目", description: "设置应用文写作题目（最多2张图片识别）" },
    { id: 3, title: "批量OCR识别", description: "专注图像文字识别（无限制）" },
    { id: 4, title: "学生作文内容确认", description: "核对识别的作文内容" },
    { id: 5, title: "姓名匹配确认 (可选)", description: "匹配学生与作文，可跳过" },
    { id: 6, title: "AI批改", description: "智能批改和打分" },
    { id: 7, title: "查看结果导出", description: "导出批改结果" }
  ];

  // 初始化任务
  const initializeTask = () => {
    const newTask: ApplicationBatchTask = {
      id: `app_task_${Date.now()}`,
      title: `批量应用文批改_${new Date().toLocaleDateString()}`,
      students: [],
      topic: "",
      assignments: [],
      status: 'setup',
      createdAt: new Date(),
      pointsCost: 0
    };
    setTask(newTask);
  };

  useEffect(() => {
    initializeTask();

    // 检测移动设备
    const checkMobile = () => {
      const mobile = isMobileDevice();
      setIsMobile(mobile);

      if (mobile) {
        // console.log('检测到移动设备访问批量修改应用文功能');
      }
    };

    checkMobile();

    // 监听窗口大小变化
    const handleResize = () => {
      checkMobile();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 计算点数消耗（按学生数计算）
  const calculatePoints = (studentCount: number) => {
    return studentCount * 1; // 每个学生1点数
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

  // 处理中等标准（去掉宽容一分评判）
  const handleMediumStandard = () => {
    if (currentStep < steps.length) {
      // 设置中等标准标志到task中
      setTask(prev => prev ? {
        ...prev,
        useMediumStandard: true // 去掉宽容一分评判
      } : null);
      setCurrentStep(currentStep + 1);
    }
  };

  // 移除自动跳转登录的逻辑
  // 改为在实际使用功能时才检查登录状态，与其他工具保持一致

  // 移动设备访问限制 - 已取消，允许移动端访问
  // if (isMobile) {
  //   return (
  //     <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center p-6">
  //       <Card className="w-full max-w-md mx-auto shadow-lg border-orange-200">
  //         <CardContent className="p-8 text-center">
  //           {/* 移动设备图标 */}
  //           <div className="flex justify-center mb-6">
  //             <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center">
  //               <svg className="w-10 h-10 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  //                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
  //               </svg>
  //             </div>
  //           </div>

  //           {/* 标题 */}
  //           <h2 className="text-2xl font-bold text-gray-900 mb-4">
  //             设备限制
  //           </h2>

  //           {/* 说明文案 */}
  //           <p className="text-gray-600 mb-6 leading-relaxed">
  //             批量修改应用文属于非常繁重的任务，需要处理大量图片和复杂的AI分析。
  //           </p>
  //           <p className="text-orange-600 font-medium mb-6">
  //             请在电脑上操作，以获得更好的使用体验。
  //           </p>

  //           {/* 电脑图标 */}
  //           <div className="flex justify-center mb-6">
  //             <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  //               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  //             </svg>
  //           </div>

  //           {/* 返回首页按钮 */}
  //           <Button
  //             onClick={() => router.push('/')}
  //             className="w-full bg-blue-600 hover:bg-blue-700 text-white"
  //           >
  //             返回首页
  //           </Button>

  //           {/* 额外提示 */}
  //           <p className="text-xs text-gray-500 mt-4">
  //             如果您正在使用平板电脑，请尝试横屏模式或切换到桌面浏览器访问
  //           </p>
  //         </CardContent>
  //       </Card>
  //     </div>
  //   );
  // }

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
              批量修改学生应用文
            </h1>
          </div>
          <p className="text-sm sm:text-base text-gray-600 pl-0 sm:pl-12">
            智能OCR识别 + AI批改打分，高效处理学生应用文作业
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
              <ApplicationTopicInput
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
              <ApplicationContentConfirmation
                task={task}
                setTask={setTask}
                onNext={handleNextStep}
                onPrev={handlePrevStep}
                onMediumStandard={handleMediumStandard}
                editingAssignments={editingAssignments}
                setEditingAssignments={setEditingAssignments}
                editedTexts={editedTexts}
                setEditedTexts={setEditedTexts}
              />
            )}

            {currentStep === 5 && (
              <NameMatchingConfirmation
                task={task}
                setTask={setTask}
                onNext={handleNextStep}
                onPrev={handlePrevStep}
                editedTexts={editedTexts}
              />
            )}

            {currentStep === 6 && (
              <ApplicationGrader
                task={task}
                setTask={setTask}
                onNext={handleNextStep}
                onPrev={handlePrevStep}
                onMediumStandard={handleMediumStandard}
                processingStats={processingStats}
                setProcessingStats={setProcessingStats}
                isGradingCompleted={isGradingCompleted}
                setIsGradingCompleted={setIsGradingCompleted}
                userId={currentUser?.id}
              />
            )}

            {currentStep === 7 && (
              <ApplicationResultTable
                task={task}
                setTask={setTask}
                onPrev={handlePrevStep}
                isGradingCompleted={isGradingCompleted}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BatchApplicationWritingPolish;
