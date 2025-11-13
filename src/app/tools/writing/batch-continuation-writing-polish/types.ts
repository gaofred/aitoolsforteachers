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
  chineseContent: string; // 提取的中文内容（包含姓名、班级、学号等）
  editedText?: string; // 用户编辑后的文本
  content: string; // 读后续写内容
  confidence: number;
  processedAt: Date;
  imageData?: string; // 图片Base64数据
}

// 读后续写批改结果
export interface ContinuationWritingGradingResult {
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
export interface ContinuationWritingAssignment {
  id: string;
  student: Student;
  ocrResult: OCRResult;
  gradingResult?: ContinuationWritingGradingResult;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
}

// 批量任务
export interface ContinuationWritingBatchTask {
  id: string;
  title: string;
  students: Student[];
  topic: string; // 读后续写题目
  assignments: ContinuationWritingAssignment[];
  status: 'setup' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
  pointsCost: number;
  useMediumStandard?: boolean; // 是否使用中等标准（去掉宽容一分评判）
  userId?: string; // 用户ID
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