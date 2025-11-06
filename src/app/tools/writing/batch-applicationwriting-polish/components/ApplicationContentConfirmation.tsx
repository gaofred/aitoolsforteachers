"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Edit, Save, X, User, Wand2, Sparkles, Eye, EyeOff } from "lucide-react";
import type { ApplicationBatchTask } from "../types";
import { formatEssayText, intelligentParagraphFormatting, needsFormatting, previewFormatting } from "@/lib/text-formatter";

interface ApplicationContentConfirmationProps {
  task: ApplicationBatchTask | null;
  setTask: (task: ApplicationBatchTask | null) => void;
  onNext: () => void;
  onPrev: () => void;
  editingAssignments: {[key: string]: boolean};
  setEditingAssignments: (editing: {[key: string]: boolean}) => void;
  editedTexts: {[key: string]: string};
  setEditedTexts: (texts: {[key: string]: string}) => void;
}

const ApplicationContentConfirmation: React.FC<ApplicationContentConfirmationProps> = ({
  task,
  setTask,
  onNext,
  onPrev,
  editingAssignments,
  setEditingAssignments,
  editedTexts,
  setEditedTexts
}) => {
  const assignments = task?.assignments || [];
  const [currentPage, setCurrentPage] = useState(1);
  const [showFormattingSuggestions, setShowFormattingSuggestions] = useState<{[key: string]: boolean}>({});
  const [formattedPreviews, setFormattedPreviews] = useState<{[key: string]: string}>({});
  const [batchFormattingInProgress, setBatchFormattingInProgress] = useState(false);
  const [formattingInProgress, setFormattingInProgress] = useState<{[key: string]: boolean}>({});

  // 在进入下一步前保存所有编辑的内容
  const handleNextWithSave = () => {
    if (!task) {
      onNext();
      return;
    }

    // 将editedTexts中的内容保存到task.assignments中
    const updatedAssignments = task.assignments.map(assignment => {
      const editedText = editedTexts[assignment.id];
      if (editedText !== undefined) {
        return {
          ...assignment,
          ocrResult: {
            ...assignment.ocrResult,
            editedText: editedText,
            content: editedText
          }
        };
      }
      return assignment;
    });

    // 更新任务数据
    setTask({
      ...task,
      assignments: updatedAssignments
    });

    console.log('✅ 已保存编辑后的文本内容到任务数据中，准备进入下一步', {
      totalAssignments: updatedAssignments.length,
      assignmentsWithEditedText: updatedAssignments.filter(a => a.ocrResult.editedText).length,
      assignmentsWithOriginalOnly: updatedAssignments.filter(a => !a.ocrResult.editedText).length
    });
    onNext();
  };

  // 分页设置：每页7个学生
  const itemsPerPage = 7;
  const totalPages = Math.ceil(assignments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentAssignments = assignments.slice(startIndex, endIndex);

  const handleEdit = (assignmentId: string, currentText: string) => {
    setEditingAssignments({ ...editingAssignments, [assignmentId]: true });
    setEditedTexts({ ...editedTexts, [assignmentId]: currentText });
  };

  const handleSave = (assignmentId: string) => {
    if (!task) return;

    const newText = editedTexts[assignmentId];
    if (newText !== undefined) {
      const updatedAssignments = task.assignments.map(assignment => {
        if (assignment.id === assignmentId) {
          return {
            ...assignment,
            ocrResult: {
              ...assignment.ocrResult,
              editedText: newText,
              content: newText
            }
          };
        }
        return assignment;
      });

      setTask({
        ...task,
        assignments: updatedAssignments
      });
    }

    setEditingAssignments({ ...editingAssignments, [assignmentId]: false });
  };

  const handleCancel = (assignmentId: string) => {
    setEditingAssignments({ ...editingAssignments, [assignmentId]: false });
    // 恢复原始文本
    const assignment = assignments.find(a => a.id === assignmentId);
    if (assignment) {
      setEditedTexts({
        ...editedTexts,
        [assignmentId]: assignment.ocrResult.editedText || assignment.ocrResult.content
      });
    }
  };

  // AI排版功能
  const applyAIFormatting = async (assignmentId: string, originalText: string) => {
    setFormattingInProgress(prev => ({ ...prev, [assignmentId]: true }));

    try {
      const response = await fetch('/api/ai/text-formatting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: originalText })
      });

      const data = await response.json();

      if (data.success) {
        console.log('✨ AI排版成功:', { assignmentId, originalLength: originalText.length, formattedLength: data.formattedText.length });
        return data.formattedText;
      } else {
        console.warn('⚠️ AI排版失败，使用规则排版:', data.error);
        // 使用本地规则排版作为备选
        const fallbackFormatted = intelligentParagraphFormatting(originalText);
        return fallbackFormatted;
      }
    } catch (error) {
      console.error('❌ AI排版请求失败:', error);
      // 使用本地规则排版作为备选
      const fallbackFormatted = intelligentParagraphFormatting(originalText);
      return fallbackFormatted;
    } finally {
      // 清除加载状态
      setFormattingInProgress(prev => ({ ...prev, [assignmentId]: false }));
    }
  };

  // 预览格式化效果
  const previewFormattingEffect = async (assignmentId: string, originalText: string) => {
    console.log('🔍 开始预览AI排版效果...', { assignmentId, textLength: originalText.length });

    try {
      const formatted = await applyAIFormatting(assignmentId, originalText);

      // 显示格式化建议
      setShowFormattingSuggestions(prev => ({
        ...prev,
        [assignmentId]: true
      }));

    } catch (error) {
      console.error('预览失败:', error);
      // 预览失败时使用本地排版
      const localFormatted = intelligentParagraphFormatting(originalText);
      setFormattedPreviews(prev => ({
        ...prev,
        [assignmentId]: localFormatted
      }));
      setShowFormattingSuggestions(prev => ({
        ...prev,
        [assignmentId]: true
      }));
    }
  };

  // 应用格式化
  const applyFormatting = async (assignmentId: string, originalText: string) => {
    console.log('🎯 应用AI排版...', { assignmentId });

    try {
      const formatted = await applyAIFormatting(assignmentId, originalText);

      // 🔧 修复：先更新任务数据，确保状态同步
      if (task) {
        const updatedAssignments = task.assignments.map(assignment => {
          if (assignment.id === assignmentId) {
            return {
              ...assignment,
              ocrResult: {
                ...assignment.ocrResult,
                editedText: formatted,
                content: formatted
              }
            };
          }
          return assignment;
        });

        setTask({
          ...task,
          assignments: updatedAssignments
        });

        console.log('✅ AI排版已应用到任务数据', { assignmentId, textLength: formatted.length });
      }

      // 🔧 修复：立即更新所有状态，防止页面刷新导致状态丢失
      // 立即更新 editedTexts 状态
      setEditedTexts(prev => ({ ...prev, [assignmentId]: formatted }));

      // 立即隐藏格式化建议和预览
      setShowFormattingSuggestions(prev => ({ ...prev, [assignmentId]: false }));
      setFormattedPreviews(prev => ({ ...prev, [assignmentId]: '' }));

      // 🔧 强制刷新任务状态，确保所有相关状态同步
      setTask(prev => {
        if (!prev) return prev;

        const updatedAssignments = prev.assignments.map(assignment => {
          if (assignment.id === assignmentId) {
            // 更新 OCR结果中的 editedText 和 content 字段
            const updatedOCRResult = {
              ...assignment.ocrResult,
              editedText: formatted,
              content: formatted
            };

            console.log('✅ AI排版状态已同步更新', {
              assignmentId,
              studentName: assignment.student?.name || '未知',
              textLength: formatted.length,
              updatedFields: ['editedText', 'content']
            });

            return {
              ...assignment,
              ocrResult: updatedOCRResult
            };
          }
          return assignment;
        });

        // 🔧 关键：强制更新 assignments 的引用以触发组件重新渲染
        return {
          ...prev,
          assignments: [...updatedAssignments]
        };
      });

      console.log('✅ AI排版已应用，所有状态已同步更新', { assignmentId, textLength: formatted.length });

      console.log('✅ AI排版已应用', { assignmentId, textLength: formatted.length });

    } catch (error) {
      console.error('应用排版失败:', error);
    }
  };

  // 智能提取姓名
  const extractNameFromText = async (assignmentId: string, text: string) => {
    if (!text || text.trim().length === 0) return;

    try {
      const response = await fetch('/api/ai/extract-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });

      const data = await response.json();

      if (data.success && data.name) {
        console.log('✅ 姓名提取成功:', data.name);

        // 更新学生姓名
        if (task) {
          const updatedAssignments = task.assignments.map(assignment => {
            if (assignment.id === assignmentId) {
              return {
                ...assignment,
                student: {
                  ...assignment.student,
                  name: data.name
                }
              };
            }
            return assignment;
          });

          setTask({
            ...task,
            assignments: updatedAssignments
          });
        }
      } else {
        console.warn('姓名提取失败:', data.error);
      }
    } catch (error) {
      console.error('姓名提取失败:', error);
    }
  };

  // 批量智能提取姓名
  const batchExtractNames = async () => {
    if (!task || assignments.length === 0) return;

    console.log('🎯 开始批量智能提取姓名...');

    try {
      // 构建批量提取的数据
      const texts = assignments.map(assignment => ({
        id: assignment.id,
        text: assignment.ocrResult.originalText
      }));

      const response = await fetch('/api/ai/batch-name-extraction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignments: texts })
      });

      const data = await response.json();

      if (data.success && data.results) {
        console.log('✅ 批量姓名提取完成');

        // 更新所有学生姓名
        const updatedAssignments = task.assignments.map(assignment => {
          const result = data.results.find((r: any) => r.id === assignment.id);
          if (result && result.name) {
            return {
              ...assignment,
              student: {
                ...assignment.student,
                name: result.name
              }
            };
          }
          return assignment;
        });

        setTask({
          ...task,
          assignments: updatedAssignments
        });

        console.log(`✅ 成功更新 ${data.results.filter((r: any) => r.name).length} 个学生姓名`);
      } else {
        console.warn('批量姓名提取失败:', data.error);
      }
    } catch (error) {
      console.error('批量姓名提取失败:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-semibold text-gray-900">学生作文内容确认</h2>
          {assignments.length > 0 && (
            <Button
              onClick={batchExtractNames}
              className="flex items-center gap-2"
              variant="outline"
            >
              <Wand2 className="w-4 h-4" />
              批量智能提取姓名
            </Button>
          )}
        </div>
        <p className="text-gray-600 text-sm">
          请检查OCR识别的作文内容，如有错误可点击编辑进行修正。支持智能提取学生姓名和智能排版功能。
        </p>
      </div>

      {assignments.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-gray-500">
            暂无识别的作文内容，请返回上一步上传图片
          </CardContent>
        </Card>
      ) : (
        <>
          {/* 分页控制 */}
          {totalPages > 1 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    显示第 {startIndex + 1} - {Math.min(endIndex, assignments.length)} 条，共 {assignments.length} 条记录
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
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
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
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      下一页
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-4">
            {currentAssignments.map((assignment, index) => (
            <Card key={assignment.id} className="border border-gray-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-600" />
                    作文 {startIndex + index + 1} - {assignment.student.name}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {showFormattingSuggestions[assignment.id] && (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => applyFormatting(assignment.id, assignment.ocrResult.editedText || assignment.ocrResult.content)}
                          className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white"
                          disabled={formattingInProgress[assignment.id]}
                        >
                          {formattingInProgress[assignment.id] ? (
                            <>
                              <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                              应用中...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3 h-3" />
                              应用AI排版
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setShowFormattingSuggestions(prev => ({ ...prev, [assignment.id]: false }));
                            setFormattedPreviews(prev => ({ ...prev, [assignment.id]: '' }));
                          }}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                    {!editingAssignments[assignment.id] && !showFormattingSuggestions[assignment.id] && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(assignment.id, assignment.ocrResult.editedText || assignment.ocrResult.content)}
                        className="flex items-center gap-1"
                      >
                        <Edit className="w-3 h-3" />
                        编辑
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 学生信息 */}
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <User className="w-4 h-4 text-blue-600" />
                    <div>
                      <div className="font-medium text-blue-600 text-sm">
                        识别学生: {assignment.student.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        原文长度: {assignment.ocrResult.originalText.length} 字符
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => extractNameFromText(
                      assignment.id,
                      assignment.ocrResult.editedText || assignment.ocrResult.content
                    )}
                    variant="outline"
                    className="flex items-center gap-1"
                  >
                    <Wand2 className="w-3 h-3" />
                    提取姓名
                  </Button>
                </div>

                {/* 其他识别出的中文内容 */}
                <div>
                  <div className="font-medium text-gray-700 mb-2 text-sm flex items-center gap-2">
                    <span>其他识别出的中文内容（从ocr中提取）</span>
                    <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">双保险查看学生姓名</span>
                  </div>
                  <div className="bg-orange-50 p-4 rounded border border-orange-200 text-sm text-gray-800 whitespace-pre-wrap break-words max-h-48 overflow-y-auto mb-4">
                    {assignment.ocrResult.chineseContent || '无中文内容'}
                  </div>
                </div>

                {/* 作文内容 */}
                <div>
                  <div className="font-medium text-gray-700 mb-2 text-sm">作文内容:</div>
                  {editingAssignments[assignment.id] ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editedTexts[assignment.id] || assignment.ocrResult.editedText || assignment.ocrResult.content || ''}
                        onChange={(e) => setEditedTexts({ ...editedTexts, [assignment.id]: e.target.value })}
                        className="min-h-[200px] text-sm"
                        placeholder="请输入作文内容..."
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSave(assignment.id)}
                          className="flex items-center gap-1"
                        >
                          <Save className="w-3 h-3" />
                          保存
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCancel(assignment.id)}
                        >
                          <X className="w-3 h-3" />
                          取消
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => previewFormattingEffect(
                            assignment.id,
                            editedTexts[assignment.id] || assignment.ocrResult.content
                          )}
                          className="flex items-center gap-1 bg-purple-600 hover:bg-purple-700 text-white"
                          disabled={formattingInProgress[assignment.id]}
                        >
                          {formattingInProgress[assignment.id] ? (
                            <>
                              <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                              排版中...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3 h-3" />
                              AI排版
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {/* 非编辑模式：显示内容并添加AI排版按钮 */}
                      <div className="flex justify-between items-start mb-2">
                        <div className="text-xs text-gray-500">
                          {needsFormatting(assignment.ocrResult.editedText || assignment.ocrResult.content) ? (
                            <span className="flex items-center gap-1 text-orange-600">
                              <Sparkles className="w-3 h-3" />
                              建议使用AI排版优化格式
                            </span>
                          ) : (
                            <span className="text-green-600">格式良好</span>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => previewFormattingEffect(
                            assignment.id,
                            assignment.ocrResult.editedText || assignment.ocrResult.content
                          )}
                          className="flex items-center gap-1"
                          disabled={formattingInProgress[assignment.id]}
                        >
                          {formattingInProgress[assignment.id] ? (
                            <>
                              <div className="w-3 h-3 border border-gray-500 border-t-transparent rounded-full animate-spin" />
                              排版中...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3 h-3" />
                              AI排版
                            </>
                          )}
                        </Button>
                      </div>

                      {/* 作文内容显示 */}
                      <div className="bg-gray-50 p-4 rounded border border-gray-300 text-sm text-gray-800 whitespace-pre-wrap break-words max-h-96 overflow-y-auto">
                        {(() => {
                          // 🔧 修复：优先级逻辑 - 确保显示最新的状态
                          const showPreview = formattedPreviews[assignment.id] && showFormattingSuggestions[assignment.id];
                          const editedText = editedTexts[assignment.id];
                          const taskEditedText = assignment.ocrResult.editedText;
                          const taskContent = assignment.ocrResult.content;

                          // 优先级：预览 > editedTexts > task.editedText > task.content
                          if (showPreview) {
                            return formattedPreviews[assignment.id];
                          } else if (editedText && editedText !== taskEditedText) {
                            return editedText;
                          } else if (taskEditedText) {
                            return taskEditedText;
                          } else {
                            return taskContent || '未识别到作文内容';
                          }
                        })()}
                      </div>

                      {/* AI排版预览提示 */}
                      {showFormattingSuggestions[assignment.id] && formattedPreviews[assignment.id] && (
                        <div className="p-2 bg-green-50 border border-green-200 rounded">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-green-600" />
                            <span className="text-xs text-green-700">这是AI排版预览（火山引擎豆包模型），点击"应用AI排版"保存更改</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          </div>
        </>
      )}

      {/* 操作按钮 */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev}>
          上一步
        </Button>
        <div className="flex items-center gap-3">
          {/* 批量AI排版按钮 */}
          {currentAssignments.length > 0 && (
            <Button
              onClick={async () => {
                console.log('🎯 开始批量AI排版检测...');
                setBatchFormattingInProgress(true);

                try {
                  // 显示提示信息 - 智能检测：排除已经排版过的内容
                  const needsFormattingCount = currentAssignments.filter(assignment => {
                    const text = assignment.ocrResult.editedText || assignment.ocrResult.content;
                    const isAlreadyFormatted = !needsFormatting(text);

                    console.log(`🔍 检测作文格式: ${assignment.student.name}`, {
                      textLength: text.length,
                      needsFormatting: !isAlreadyFormatted,
                      hasEditedText: !!assignment.ocrResult.editedText
                    });

                    return !isAlreadyFormatted;
                  }).length;

                  if (needsFormattingCount > 0) {
                    const proceed = confirm(`检测到 ${needsFormattingCount} 篇作文可能需要AI排版优化。是否使用AI批量排版（统一消耗1积分）？`);
                    if (!proceed) {
                      setBatchFormattingInProgress(false);
                      return;
                    }
                  } else {
                    alert('当前所有作文格式良好，无需AI排版优化！');
                    setBatchFormattingInProgress(false);
                    return;
                  }

                  let successful = 0;

                  // 逐个进行AI排版
                  for (const assignment of currentAssignments) {
                    const text = assignment.ocrResult.editedText || assignment.ocrResult.content;

                    if (needsFormatting(text)) {
                      try {
                        const formatted = await applyAIFormatting(assignment.id, text);

                        // 保存格式化结果
                        setEditedTexts(prev => ({
                          ...prev,
                          [assignment.id]: formatted
                        }));

                        successful++;

                        // 更新任务数据
                        if (task) {
                          const updatedAssignments = task.assignments.map(a => {
                            if (a.id === assignment.id) {
                              return {
                                ...a,
                                ocrResult: {
                                  ...a.ocrResult,
                                  editedText: formatted,
                                  content: formatted
                                }
                              };
                            }
                            return a;
                          });

                          setTask({
                            ...task,
                            assignments: updatedAssignments
                          });
                        }

                        console.log(`✨ 批量排版成功: ${assignment.student.name}`, {
                          textLength: formatted.length,
                          savedToEditedText: true,
                          preview: formatted.substring(0, 50)
                        });

                        // 短暂延迟避免API限制
                        await new Promise(resolve => setTimeout(resolve, 1000));

                      } catch (error) {
                        console.error(`❌ 批量排版失败: ${assignment.student.name}`, error);
                      }
                    }
                  }

                  // 显示完成提示
                  if (successful > 0) {
                    console.log(`✨ 成功检测到 ${successful} 篇作文需要AI排版`);
                    alert(`✅ 批量AI排版完成！\n\n已成功为 ${successful} 篇作文进行AI排版优化。\n\n请点击"下一步：姓名匹配确认"保存更改。`);
                  } else {
                    console.log('✨ 没有作文需要AI排版');
                    alert('✅ 所有作文格式良好，无需AI排版优化！');
                  }
                } catch (error) {
                  console.error('❌ 批量AI排版检测失败:', error);
                } finally {
                  setBatchFormattingInProgress(false);
                }
              }}
              disabled={batchFormattingInProgress}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white border-purple-600"
            >
              {batchFormattingInProgress ? (
                <>
                  <div className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin" />
                  批量检测中...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  批量AI排版检测（仅对当前页）（1积分）
                </>
              )}
            </Button>
          )}

          <Button
            onClick={handleNextWithSave}
            disabled={assignments.length === 0}
            className="px-8"
          >
            下一步：姓名匹配确认
          </Button>
        </div>
      </div>
    </div>
  );
};

// 紫色按钮样式已应用
export default ApplicationContentConfirmation;