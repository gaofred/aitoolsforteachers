// 类型定义文件

export interface Student {
  id: string;
  name: string;
  originalName?: string; // OCR识别的原始姓名
  confirmed: boolean;
}

export interface Requirement {
  id: string;
  sentenceIndex: number;
  requiredWords: string[]; // 必须使用的单词
  requiredStructures: string[]; // 必须使用的语法结构
  notes?: string; // 额外要求说明
}

export interface OCRResult {
  imageId: string;
  studentName: string;
  originalText: string; // 完整的OCR原文
  editedText?: string; // 用户编辑后的文本
  sentences: string[];
  confidence: number;
  processedAt: Date;
  imageData?: string; // 图片Base64数据
}

export interface NameMatch {
  ocrResult: OCRResult;
  matchedStudent: Student | null;
  confidence: number;
  confirmed: boolean;
}

export interface SentenceChange {
  type: 'word' | 'structure' | 'grammar' | 'style';
  original: string;
  changed: string;
  reason: string;
}

export interface PolishedSentence {
  original: string;
  polished: string;
  changes: SentenceChange[];
  explanation: string;
  confidence: number;
}

export interface StudentAssignment {
  id: string;
  student: Student;
  ocrResult: OCRResult;
  extractedSentences?: string[]; // 新增：提取的句子
  polishedSentences: PolishedSentence[];
  processedAt: Date;
  extractionMethod?: 'ai' | 'traditional' | 'none'; // 提取方法
}

export interface BatchTask {
  id: string;
  title: string;
  students: Student[];
  requirements: Requirement[];
  assignments: StudentAssignment[];
  status: 'setup' | 'ocr_processing' | 'ocr_confirmed' | 'sentence_extraction' | 'name_matching' | 'polishing' | 'completed' | 'error';
  createdAt: Date;
  completedAt?: Date;
  pointsCost: number;
  currentStep?: number; // 当前步骤
}

// 新增：OCR确认状态
export interface OCRConfirmation {
  assignmentId: string;
  studentName: string;
  ocrText: string;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  needsReprocessing: boolean;
  notes?: string;
}

// 新增：句子提取选项
export interface ExtractionOptions {
  method: 'ai' | 'traditional' | 'manual';
  minLength: number;
  includeFragments: boolean;
  preserveOriginal: boolean;
}

export interface ProcessingStats {
  totalImages: number;
  processedImages: number;
  totalSentences: number;
  polishedSentences: number;
  errors: string[];
  processingTime: number;
}

export interface ExportOptions {
  format: 'word' | 'excel' | 'pdf';
  includeOriginal: boolean;
  includeExplanation: boolean;
  template: 'table' | 'list' | 'detailed';
}