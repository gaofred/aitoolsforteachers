"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Edit, Save, X, User, Wand2 } from "lucide-react";
import type { ApplicationBatchTask } from "../types";

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

      setTask({ ...task, assignments: updatedAssignments });
    }

    setEditingAssignments({ ...editingAssignments, [assignmentId]: false });
  };

  const handleCancel = (assignmentId: string) => {
    setEditingAssignments({ ...editingAssignments, [assignmentId]: false });
    const { [assignmentId]: _, ...rest } = editedTexts;
    setEditedTexts(rest);
  };

  // 智能姓名提取功能
  const extractNameFromText = async (assignmentId: string, text: string) => {
    console.log('🔍 开始智能提取学生姓名...', { assignmentId, textLength: text.length });

    try {
      const response = await fetch('/api/ai/name-extraction', {
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

          setTask({ ...task, assignments: updatedAssignments });
          alert(`已提取学生姓名: ${data.name}`);
        }
      } else {
        console.log('❌ 姓名提取失败:', data.error);
        alert('未能提取到学生姓名，请手动输入');
      }
    } catch (error) {
      console.error('姓名提取错误:', error);
      alert('姓名提取失败，请手动输入');
    }
  };

  // 批量智能提取姓名
  const batchExtractNames = async () => {
    console.log('🔄 开始批量智能提取姓名...');

    if (!task || assignments.length === 0) {
      alert('没有可提取姓名的作文');
      return;
    }

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

        setTask({ ...task, assignments: updatedAssignments });

        const successCount = data.results.filter((r: any) => r.name).length;
        alert(`批量姓名提取完成！成功提取 ${successCount}/${assignments.length} 个学生姓名`);
      } else {
        console.log('❌ 批量姓名提取失败:', data.error);
        alert('批量姓名提取失败，请手动输入');
      }
    } catch (error) {
      console.error('批量姓名提取错误:', error);
      alert('批量姓名提取失败，请手动输入');
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
          请检查OCR识别的作文内容，如有错误可点击编辑进行修正。支持智能提取学生姓名功能。
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
            {currentAssignments.map((assignment, index) => {
              const globalIndex = assignments.findIndex(a => a.id === assignment.id) + 1;
              return (
              <Card key={assignment.id} className="border border-gray-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      作文 {globalIndex}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {assignment.ocrResult.editedText && (
                        <Badge variant="secondary" className="text-xs">
                          已编辑
                        </Badge>
                      )}
                      {!editingAssignments[assignment.id] && (
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
                        assignment.ocrResult.originalText
                      )}
                      className="flex items-center gap-1"
                      variant="outline"
                    >
                      <Wand2 className="w-3 h-3" />
                      提取姓名
                    </Button>
                  </div>

                  {/* 作文内容 */}
                  <div>
                    <div className="font-medium text-gray-700 mb-2 text-sm">作文内容:</div>
                    {editingAssignments[assignment.id] ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editedTexts[assignment.id] || ''}
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
                            variant="outline"
                            size="sm"
                            onClick={() => handleCancel(assignment.id)}
                            className="flex items-center gap-1"
                          >
                            <X className="w-3 h-3" />
                            取消
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-50 p-4 rounded border border-gray-300 text-sm text-gray-800 whitespace-pre-wrap break-words max-h-96 overflow-y-auto">
                        {assignment.ocrResult.editedText || assignment.ocrResult.content || '未识别到作文内容'}
                      </div>
                    )}
                  </div>

                  {/* 完整原文显示 */}
                  <details className="text-sm">
                    <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                      查看完整OCR原文
                    </summary>
                    <div className="mt-2 bg-gray-50 p-3 rounded border border-gray-300 text-gray-700 whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
                      {assignment.ocrResult.originalText}
                    </div>
                  </details>
                </CardContent>
              </Card>
              );
            })}
          </div>
        </>
      )}

      {/* 统计信息 */}
      {assignments.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-blue-700">
                共识别 {assignments.length} 份作文
              </span>
              <span className="text-blue-600">
                {assignments.filter(a => a.ocrResult.editedText).length} 份已编辑
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 操作按钮 */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev}>
          上一步
        </Button>
        <Button
          onClick={onNext}
          disabled={assignments.length === 0}
          className="px-8"
        >
          下一步：姓名匹配确认
        </Button>
      </div>
    </div>
  );
};

export default ApplicationContentConfirmation;

