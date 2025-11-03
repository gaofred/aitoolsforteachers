// 学生信息
export interface Student {
  id: string;
  name: string;
  createdAt: Date;
}

// OCR识别结果
export interface OCRResult {
  imageId: string;
  studentName: string;
  originalText: string; // 完整的OCR原文
  editedText?: string; // 用户编辑后的文本
  content: string; // 应用文内容
  confidence: number;
  processedAt: Date;
}

// 应用文批改结果
export interface ApplicationGradingResult {
  score: number; // 分数
  feedback: string; // 详细批改意见
  improvedVersion: string; // 高分范文
  gradingDetails: {
    contentPoints: string; // 内容要点分析
    languageErrors: string; // 语言错误分析
    logicalIssues: string; // 逻辑问题分析
    sentenceAnalysis: string; // 逐句分析
    overallEvaluation: string; // 整体评价
  };
  gradedAt: Date;
}

// 学生作业
export interface ApplicationAssignment {
  id: string;
  student: Student;
  ocrResult: OCRResult;
  gradingResult?: ApplicationGradingResult;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
}

// 批量任务
export interface ApplicationBatchTask {
  id: string;
  title: string;
  students: Student[];
  topic: string; // 应用文题目
  assignments: ApplicationAssignment[];
  status: 'setup' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
  pointsCost: number;
}

// 处理统计
export interface ProcessingStats {
  totalImages: number;
  processedImages: number;
  totalApplications: number;
  gradedApplications: number;
  errors: string[];
  processingTime: number;
  averageScore: number;
}

// 导出格式
export interface ExportFormat {
  type: 'excel' | 'csv' | 'pdf';
  includeOriginal: boolean;
  includeGrading: boolean;
  includeImprovedVersion: boolean;
}


