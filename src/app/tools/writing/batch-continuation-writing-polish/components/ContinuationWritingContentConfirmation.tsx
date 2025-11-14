"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Edit3, Check, X, Eye, EyeOff, Save, RotateCcw, AlertCircle, Search, Users, ZoomIn } from "lucide-react";
import type { ContinuationWritingBatchTask, ContinuationWritingAssignment, Student } from "../types";
import { countEnglishWords, getWordCountStats, updateOCRResultWordCount } from "../utils/wordCount";

interface ContinuationWritingContentConfirmationProps {
  task: ContinuationWritingBatchTask | null;
  setTask: (task: ContinuationWritingBatchTask | null) => void;
  onNext: () => void;
  onPrev: () => void;
  editingAssignments: { [key: string]: boolean };
  setEditingAssignments: React.Dispatch<React.SetStateAction<{ [key: string]: boolean }>>;
  editedTexts: { [key: string]: string };
  setEditedTexts: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>;
}

const ContinuationWritingContentConfirmation: React.FC<ContinuationWritingContentConfirmationProps> = ({
  task,
  setTask,
  onNext,
  onPrev,
  editingAssignments,
  setEditingAssignments,
  editedTexts,
  setEditedTexts
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showChineseOnly, setShowChineseOnly] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [currentImageTitle, setCurrentImageTitle] = useState<string>("");
  const [showImageModal, setShowImageModal] = useState<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // 分页状态管理
  const [currentPage, setCurrentPage] = useState(1);
  const studentsPerPage = 6; // 每页显示6个学生

  const assignments = task?.assignments || [];

  // 过滤后的作业列表
  const filteredAssignments = assignments.filter(assignment => {
    const matchesSearch = searchTerm === '' ||
      assignment.student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.ocrResult.content.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = !showChineseOnly ||
      assignment.ocrResult.chineseContent.trim() !== '';

    return matchesSearch && matchesFilter;
  });

  // 分页计算
  const totalPages = Math.ceil(filteredAssignments.length / studentsPerPage);
  const startIndex = (currentPage - 1) * studentsPerPage;
  const endIndex = startIndex + studentsPerPage;
  const paginatedAssignments = filteredAssignments.slice(startIndex, endIndex);

  // 分页控制函数
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const goToPreviousPage = () => {
    goToPage(currentPage - 1);
  };

  const goToNextPage = () => {
    goToPage(currentPage + 1);
  };

  // 当搜索或筛选条件变化时，重置到第一页
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, showChineseOnly]);

  // 获取单个作业的字数统计
  const getAssignmentWordCountStats = (assignment: ContinuationWritingAssignment) => {
    const effectiveContent = assignment.ocrResult.editedText || assignment.ocrResult.content;
    return getWordCountStats(effectiveContent);
  };

  // 计算统计信息（包含字数统计）
  const stats = {
    total: assignments.length,
    withChinese: assignments.filter(a => a.ocrResult.chineseContent.trim() !== '').length,
    withoutChinese: assignments.filter(a => a.ocrResult.chineseContent.trim() === '').length,
    // 字数统计
    wordCountStats: assignments.map(assignment => {
      const effectiveContent = assignment.ocrResult.editedText || assignment.ocrResult.content;
      return getWordCountStats(effectiveContent);
    }),
    // 汇总字数信息
    totalWordCount: assignments.reduce((sum, assignment) => {
      const effectiveContent = assignment.ocrResult.editedText || assignment.ocrResult.content;
      return sum + countEnglishWords(effectiveContent);
    }, 0),
    averageWordCount: assignments.length > 0 ?
      assignments.reduce((sum, assignment) => {
        const effectiveContent = assignment.ocrResult.editedText || assignment.ocrResult.content;
        return sum + countEnglishWords(effectiveContent);
      }, 0) / assignments.length : 0,
    sufficientWordCountCount: assignments.filter(assignment => {
      const effectiveContent = assignment.ocrResult.editedText || assignment.ocrResult.content;
      return countEnglishWords(effectiveContent) >= 150;
    }).length
  };

  // 切换编辑状态
  const toggleEdit = (assignmentId: string) => {
    const isEditing = editingAssignments[assignmentId] || false;
    setEditingAssignments(prev => ({
      ...prev,
      [assignmentId]: !isEditing
    }));

    if (!isEditing) {
      // 初始化编辑文本
      const assignment = assignments.find(a => a.id === assignmentId);
      if (assignment && !editedTexts[assignmentId]) {
        setEditedTexts(prev => ({
          ...prev,
          [assignmentId]: assignment.ocrResult.editedText || assignment.ocrResult.content
        }));
      }
    }
  };

  // 保存编辑
  const saveEdit = (assignmentId: string) => {
    const assignment = assignments.find(a => a.id === assignmentId);
    if (assignment && editedTexts[assignmentId]) {
      const updatedAssignments = assignments.map(a => {
        if (a.id === assignmentId) {
          // 更新OCR结果并重新计算字数
          const updatedOCRResult = {
            ...a.ocrResult,
            editedText: editedTexts[assignmentId]
          };
          const updatedWithWordCount = updateOCRResultWordCount(updatedOCRResult);

          return {
            ...a,
            ocrResult: updatedWithWordCount
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

      // 退出编辑模式
      setEditingAssignments(prev => ({
        ...prev,
        [assignmentId]: false
      }));
    }
  };

  // 取消编辑
  const cancelEdit = (assignmentId: string) => {
    setEditingAssignments(prev => ({
      ...prev,
      [assignmentId]: false
    }));

    // 恢复原始文本
    const assignment = assignments.find(a => a.id === assignmentId);
    if (assignment) {
      setEditedTexts(prev => ({
        ...prev,
        [assignmentId]: assignment.ocrResult.editedText || assignment.ocrResult.content
      }));
    }
  };

  // 重置为原始文本
  const resetToOriginal = (assignmentId: string) => {
    const assignment = assignments.find(a => a.id === assignmentId);
    if (assignment) {
      setEditedTexts(prev => ({
        ...prev,
        [assignmentId]: assignment.ocrResult.content
      }));
    }
  };

  // 批量修改学生姓名
  const updateStudentName = (assignmentId: string, newName: string) => {
    if (!task) return;

    const updatedAssignments = assignments.map(assignment => {
      if (assignment.id === assignmentId) {
        return {
          ...assignment,
          student: {
            ...assignment.student,
            name: newName
          }
        };
      }
      return assignment;
    });

    setTask({
      ...task,
      assignments: updatedAssignments
    });
  };

  // 切换卡片展开状态
  const toggleCardExpansion = (assignmentId: string) => {
    const newExpandedCards = new Set(expandedCards);
    if (newExpandedCards.has(assignmentId)) {
      newExpandedCards.delete(assignmentId);
    } else {
      newExpandedCards.add(assignmentId);
    }
    setExpandedCards(newExpandedCards);
  };

  // 全选/全不选编辑
  const toggleAllEdits = () => {
    const allEditing = filteredAssignments.every(a => editingAssignments[a.id]);
    const shouldEdit = !allEditing;

    setEditingAssignments(prev => {
      const newState = { ...prev };
      filteredAssignments.forEach(assignment => {
        newState[assignment.id] = shouldEdit;
      });
      return newState;
    });

    if (shouldEdit) {
      // 初始化编辑文本
      setEditedTexts(prev => {
        const newState = { ...prev };
        filteredAssignments.forEach(assignment => {
          if (!editedTexts[assignment.id]) {
            newState[assignment.id] = assignment.ocrResult.editedText || assignment.ocrResult.content;
          }
        });
        return newState;
      });
    }
  };

  // 处理图片放大
  const handleImageEnlarge = (imageData: string, studentName: string) => {
    setEnlargedImage(imageData);
    setCurrentImageTitle(`学生读后续写图片 - ${studentName}`);
    setShowImageModal(true);
    console.log(`🖼️ 打开图片放大查看: ${studentName}`);
  };

  // 关闭图片模态框
  const handleCloseImageModal = () => {
    setShowImageModal(false);
    setEnlargedImage(null);
    setCurrentImageTitle("");
  };

  // 批量保存
  const saveAllEdits = () => {
    if (!task) return;

    const updatedAssignments = assignments.map(assignment => {
      if (editingAssignments[assignment.id] && editedTexts[assignment.id]) {
        return {
          ...assignment,
          ocrResult: {
            ...assignment.ocrResult,
            editedText: editedTexts[assignment.id]
          }
        };
      }
      return assignment;
    });

    setTask({
      ...task,
      assignments: updatedAssignments
    });

    // 退出所有编辑模式
    setEditingAssignments({});
  };

  // 学生姓名提取功能
  const extractStudentNames = () => {
    if (!task) return;

    console.log('🔍 开始从OCR文本中提取学生姓名...');

    const updatedAssignments = assignments.map(assignment => {
      const { originalText, content } = assignment.ocrResult;

      // 提取学生姓名的算法
      let extractedName = '未识别';

      // 1. 首先从原始文本中寻找可能的姓名（通常在开头或单独一行）
      const lines = originalText.split('\n').map(line => line.trim()).filter(line => line.length > 0);

      // 2. 姓名提取规则：2-4个字符，可能包含中文，通常是第一行或前几行
      for (let i = 0; i < Math.min(5, lines.length); i++) {
        const line = lines[i];

        // 跳过明显的作文内容
        if (line.length > 10 ||
            line.toLowerCase().includes('the') ||
            line.toLowerCase().includes('and') ||
            line.toLowerCase().includes('i ') ||
            /^[A-Za-z\s]+$/.test(line)) {
          continue;
        }

        // 检查是否是可能的姓名（2-4个字符，包含中文）
        if (/^[\u4e00-\u9fff]{2,4}$/.test(line)) {
          extractedName = line;
          break;
        }

        // 检查是否是 "姓名：" 的格式
        const nameMatch = line.match(/^[\u4e00-\u9fff]*(?:姓名|名字|学生).?[:：]\s*([\u4e00-\u9fff]{2,4})/);
        if (nameMatch) {
          extractedName = nameMatch[1];
          break;
        }

        // 检查是否是包含特殊格式的姓名
        const bracketMatch = line.match(/[\(\[【]\s*([\u4e00-\u9fff]{2,4})\s*[\)\]】]/);
        if (bracketMatch) {
          extractedName = bracketMatch[1];
          break;
        }
      }

      // 3. 如果没找到中文姓名，尝试提取英文姓名
      if (extractedName === '未识别') {
        const englishNameMatch = originalText.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/);
        if (englishNameMatch && englishNameMatch[1].length <= 20) {
          extractedName = englishNameMatch[1];
        }
      }

      console.log(`📝 OCR识别结果分析:`, {
        assignmentId: assignment.id,
        originalText: originalText.substring(0, 100) + '...',
        extractedName,
        lineCount: lines.length
      });

      return {
        ...assignment,
        student: {
          ...assignment.student,
          name: extractedName
        }
      };
    });

    // 更新任务数据
    setTask({
      ...task,
      assignments: updatedAssignments
    });

    console.log(`✅ 学生姓名提取完成，处理了 ${updatedAssignments.length} 个作业`);

    // 统计提取结果
    const extractedCount = updatedAssignments.filter(a =>
      a.student.name !== '未识别' && a.student.name !== '待确认'
    ).length;

    console.log(`📊 姓名提取统计: ${extractedCount}/${updatedAssignments.length} 成功提取姓名`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">学生读后续写内容确认</h2>
        <p className="text-gray-600 text-sm">
          请核对OCR识别的学生读后续写内容，如有错误可以进行编辑修正。确认无误后进入下一步。
        </p>
      </div>

      {/* 统计信息 */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-sm text-gray-600">总计作文数量</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{stats.withChinese}</div>
              <div className="text-sm text-gray-600">含中文内容</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-600">{stats.withoutChinese}</div>
              <div className="text-sm text-gray-600">纯英文内容</div>
            </CardContent>
          </Card>
        </div>

        {/* 字数统计信息 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-blue-500" />
              字数统计分析（代码精确统计）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-xl font-bold text-gray-900">{Math.round(stats.averageWordCount)}</div>
                <div className="text-xs text-gray-600">平均词数</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-xl font-bold text-gray-900">{stats.totalWordCount}</div>
                <div className="text-xs text-gray-600">总词数</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-xl font-bold text-green-600">{stats.sufficientWordCountCount}</div>
                <div className="text-xs text-gray-600">≥150词达标</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-xl font-bold text-red-600">{stats.total - stats.sufficientWordCountCount}</div>
                <div className="text-xs text-gray-600">&lt;150词需扣分</div>
              </div>
            </div>
            <div className="mt-3 text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
              <strong>评分规则：</strong>作文不满150词将直接降一档（扣5分）。请仔细核对字数统计，如有错误可编辑修正。
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 搜索和筛选 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                ref={searchInputRef}
                placeholder="搜索学生姓名或作文内容..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={showChineseOnly ? "default" : "outline"}
                onClick={() => setShowChineseOnly(!showChineseOnly)}
                size="sm"
              >
                {showChineseOnly ? '显示全部' : '仅含中文'}
              </Button>
              <Button
                variant="outline"
                onClick={toggleAllEdits}
                size="sm"
              >
                {paginatedAssignments.every(a => editingAssignments[a.id]) ? '取消全选' : '全选编辑'}
              </Button>
              <Button
                onClick={extractStudentNames}
                size="sm"
                variant="secondary"
                className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
              >
                <Users className="w-4 h-4 mr-1" />
                一键提取学生姓名
              </Button>
              {Object.values(editingAssignments).some(editing => editing) && (
                <Button
                  onClick={saveAllEdits}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                >
                  批量保存
                </Button>
              )}
            </div>
          </div>

          {/* 分页信息显示 - 简化版 */}
          {totalPages > 1 && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="text-sm text-gray-600">
                显示 {startIndex + 1}-{Math.min(endIndex, filteredAssignments.length)} 项，共 {filteredAssignments.length} 项（第 {currentPage} / {totalPages} 页）
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 作文列表 */}
      <div className="space-y-4">
        {paginatedAssignments.map((assignment) => (
          <Card key={assignment.id} className="relative">
            <CardContent className="p-6">
              {/* 顶部栏：学生信息和操作按钮 */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-lg">
                    {editingAssignments[assignment.id] ? (
                      <Input
                        value={assignment.student.name}
                        onChange={(e) => updateStudentName(assignment.id, e.target.value)}
                        className="text-lg font-semibold w-48"
                      />
                    ) : (
                      assignment.student.name
                    )}
                  </h3>
                  <Badge variant="outline">
                    置信度: {Math.round(assignment.ocrResult.confidence * 100)}%
                  </Badge>
                  {(() => {
                    const wordStats = getAssignmentWordCountStats(assignment);
                    return (
                      <Badge
                        variant="outline"
                        className={
                          wordStats.isSufficient
                            ? "bg-green-100 text-green-800 border-green-200"
                            : "bg-red-100 text-red-800 border-red-200"
                        }
                      >
                        {wordStats.wordCount}词
                        {wordStats.needsPenalty && " (-5分)"}
                      </Badge>
                    );
                  })()}
                  {assignment.ocrResult.chineseContent.trim() && (
                    <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                      含中文
                    </Badge>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleEdit(assignment.id)}
                    className="flex items-center gap-1"
                  >
                    {editingAssignments[assignment.id] ? (
                      <>
                        <X className="w-3 h-3" />
                        取消
                      </>
                    ) : (
                      <>
                        <Edit3 className="w-3 h-3" />
                        编辑
                      </>
                    )}
                  </Button>

                  {editingAssignments[assignment.id] && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => saveEdit(assignment.id)}
                        className="bg-green-600 hover:bg-green-700 flex items-center gap-1"
                      >
                        <Save className="w-3 h-3" />
                        保存
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => resetToOriginal(assignment.id)}
                        className="flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        重置
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* 主要内容区：左右两栏布局 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 左栏：作文内容 */}
                <div className="space-y-4">
                  {/* 中文内容显示 */}
                  {assignment.ocrResult.chineseContent.trim() && (
                    <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-orange-800">中文内容：</span>
                      </div>
                      <p className="text-sm text-orange-700">
                        {assignment.ocrResult.chineseContent}
                      </p>
                    </div>
                  )}

                  {/* 英文作文内容 */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">英文作文内容：</span>
                      <div className="flex items-center gap-2">
                        {editedTexts[assignment.id] !== assignment.ocrResult.content && (
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                            已编辑
                          </Badge>
                        )}
                      </div>
                    </div>

                    {editingAssignments[assignment.id] ? (
                      <Textarea
                        value={editedTexts[assignment.id] || ''}
                        onChange={(e) => {
                          const newEditedTexts = { ...editedTexts };
                          newEditedTexts[assignment.id] = e.target.value;
                          setEditedTexts(newEditedTexts);
                        }}
                        className="min-h-[200px]"
                      />
                    ) : (
                      <div className="relative">
                        <div
                          className={`p-3 bg-gray-50 rounded-lg text-sm leading-relaxed ${
                            expandedCards.has(assignment.id) ? '' : 'max-h-32 overflow-hidden'
                          }`}
                        >
                          {editedTexts[assignment.id] || assignment.ocrResult.content}
                        </div>
                        {(editedTexts[assignment.id] || assignment.ocrResult.content).length > 200 && (
                          <button
                            onClick={() => toggleCardExpansion(assignment.id)}
                            className="text-blue-600 hover:text-blue-800 text-sm mt-2 flex items-center gap-1"
                          >
                            {expandedCards.has(assignment.id) ? (
                              <>
                                <EyeOff className="w-3 h-3" />
                                收起
                              </>
                            ) : (
                              <>
                                <Eye className="w-3 h-3" />
                                展开全文
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 原始OCR文本（仅在编辑时显示） */}
                  {editingAssignments[assignment.id] && (
                    <div className="p-3 bg-gray-100 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertCircle className="w-4 h-4 text-gray-600" />
                        <span className="text-sm font-medium text-gray-700">原始OCR文本：</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {assignment.ocrResult.originalText}
                      </p>
                    </div>
                  )}
                </div>

                {/* 右栏：原始图片 */}
                <div>
                  <div className="font-medium text-gray-700 mb-2 text-sm">原始图片:</div>
                  {assignment.ocrResult.imageData ? (
                    <div className="space-y-2">
                      <div className="border rounded-lg overflow-hidden bg-gray-50 relative group">
                        <img
                          src={assignment.ocrResult.imageData}
                          alt={`学生读后续写图片 - ${assignment.student.name}`}
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
                        📸 原始读后续写图片，方便核对OCR识别结果
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
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 如果没有搜索结果 */}
      {filteredAssignments.length === 0 && assignments.length > 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-500">没有找到匹配的作文内容</p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm('');
                setShowChineseOnly(false);
              }}
              className="mt-2"
            >
              清除筛选条件
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 如果没有作业 */}
      {assignments.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-500">暂无作业内容，请先完成OCR识别</p>
          </CardContent>
        </Card>
      )}

          {/* 分页控件 - 页面底部 */}
      {totalPages > 1 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                显示第 {startIndex + 1}-{Math.min(endIndex, filteredAssignments.length)} 项，共 {filteredAssignments.length} 项
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                  size="sm"
                >
                  ← 上一页
                </Button>

                {/* 页码按钮 */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                    // 显示当前页周围的页码
                    const shouldShow =
                      page === 1 ||
                      page === totalPages ||
                      Math.abs(page - currentPage) <= 2;

                    if (!shouldShow) return null;

                    // 如果不是连续的页码，添加省略号
                    const prevPage = page - 1;
                    const shouldShowEllipsis = page > 2 && page - currentPage > 3;

                    return (
                      <React.Fragment key={page}>
                        {shouldShowEllipsis && (
                          <span className="text-gray-400 px-1">...</span>
                        )}
                        <Button
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => goToPage(page)}
                          className={`h-8 w-8 p-0 ${currentPage === page ? 'bg-blue-600 text-white' : ''}`}
                        >
                          {page}
                        </Button>
                      </React.Fragment>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                  size="sm"
                >
                  下一页 →
                </Button>

                <span className="text-sm text-gray-600 ml-2">
                  第 {currentPage} / {totalPages} 页
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 操作按钮 */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev}>
          上一步
        </Button>
        <div className="flex gap-2">
          {/* 一键提取学生姓名按钮 */}
          <Button
            variant="default"
            onClick={extractStudentNames}
            disabled={assignments.length === 0}
            className="flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700"
          >
            <Users className="w-4 h-4" />
            一键提取学生姓名({assignments.length}个作业)
          </Button>
          <Button
            onClick={onNext}
            disabled={assignments.length === 0}
            className="px-8"
          >
            下一步：学生姓名匹配确认
          </Button>
        </div>
      </div>

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
  );
};

export default ContinuationWritingContentConfirmation;