"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, User, Eye, EyeOff, Maximize2 } from "lucide-react";
import type { ContinuationWritingBatchTask, Student } from "../types";

interface NameMatchingConfirmationProps {
  task: ContinuationWritingBatchTask | null;
  setTask: (task: ContinuationWritingBatchTask | null) => void;
  onNext: () => void;
  onPrev: () => void;
  editedTexts?: {[key: string]: string};
}

const NameMatchingConfirmation: React.FC<NameMatchingConfirmationProps> = ({
  task,
  setTask,
  onNext,
  onPrev,
  editedTexts = {}
}) => {
  const [manualMatches, setManualMatches] = useState<{[key: string]: string}>({});
  const [expandedPreviews, setExpandedPreviews] = useState<{[key: string]: boolean}>({});

  if (!task) return null;

  const assignments = task.assignments || [];
  const students = task.students || [];

  // 自动匹配逻辑
  const getAutoMatch = (ocrName: string): Student | null => {
    // 完全匹配
    let match = students.find(s => s.name === ocrName);
    if (match) return match;

    // 模糊匹配（包含关系）
    match = students.find(s => s.name.includes(ocrName) || ocrName.includes(s.name));
    if (match) return match;

    return null;
  };

  // 获取匹配状态
  const getMatchStatus = (assignmentId: string) => {
    const assignment = assignments.find(a => a.id === assignmentId);
    if (!assignment) return { type: 'none', student: null };

    // 使用已经提取的学生姓名
    const currentName = assignment.student?.name || '';

    // 如果已经有姓名且不是默认值，则认为已匹配
    if (currentName && currentName !== '未识别' && currentName !== '姓名') {
      return { type: 'extracted', student: { ...assignment.student, name: currentName } };
    }

    // 手动匹配
    const manualMatch = manualMatches[assignmentId];
    if (manualMatch) {
      return { type: 'manual', student: students.find(s => s.id === manualMatch) };
    }

    // 自动匹配
    const autoMatch = getAutoMatch(currentName);
    if (autoMatch) {
      return { type: 'auto', student: autoMatch };
    }

    return { type: 'none', student: null };
  };

  // 处理手动匹配
  const handleManualMatch = (assignmentId: string, studentId: string) => {
    setManualMatches(prev => ({
      ...prev,
      [assignmentId]: studentId
    }));
  };

  // 切换预览展开状态
  const togglePreview = (assignmentId: string) => {
    setExpandedPreviews(prev => ({
      ...prev,
      [assignmentId]: !prev[assignmentId]
    }));
  };

  // 确认匹配并更新任务
  const confirmMatches = () => {
    const updatedAssignments = assignments.map(assignment => {
      const matchStatus = getMatchStatus(assignment.id);
      if (matchStatus.student) {
        return {
          ...assignment,
          student: matchStatus.student
        };
      }
      return assignment;
    });

    setTask({
      ...task,
      assignments: updatedAssignments
    });
  };

  // 获取统计信息
  const stats = {
    total: assignments.length,
    matched: assignments.filter(a => getMatchStatus(a.id).student).length,
    unmatched: assignments.filter(a => !getMatchStatus(a.id).student).length
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">学生姓名匹配确认 (可选)</h2>
        <p className="text-gray-600 text-sm">
          确认学生作业与姓名的对应关系。系统已自动匹配，您可以手动调整匹配结果。
          如暂时不需要，可以直接跳过此步骤。
        </p>
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-sm text-gray-600">总作业数</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.matched}</div>
            <div className="text-sm text-gray-600">已匹配</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">{stats.unmatched}</div>
            <div className="text-sm text-gray-600">未匹配</div>
          </CardContent>
        </Card>
      </div>

      {/* 匹配列表 */}
      <div className="space-y-4">
        {assignments.map((assignment) => {
          const matchStatus = getMatchStatus(assignment.id);
          const displayText = editedTexts[assignment.id] || assignment.ocrResult.editedText || assignment.ocrResult.content;
          const isExpanded = expandedPreviews[assignment.id];

          return (
            <Card key={assignment.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* 状态指示器 */}
                  <div className="flex-shrink-0 mt-1">
                    {matchStatus.student ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-orange-600" />
                    )}
                  </div>

                  {/* 主要内容 */}
                  <div className="flex-1">
                    {/* 匹配状态 */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-500" />
                        <span className="font-medium">
                          OCR识别姓名: {assignment.student.name}
                        </span>
                      </div>

                      {matchStatus.student && (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          {matchStatus.type === 'extracted' && '已提取'}
                          {matchStatus.type === 'auto' && '自动匹配'}
                          {matchStatus.type === 'manual' && '手动匹配'}
                        </Badge>
                      )}

                      {matchStatus.student && (
                        <div className="text-green-700 font-medium">
                          → {matchStatus.student.name}
                        </div>
                      )}
                    </div>

                    {/* 手动匹配选择器 */}
                    {!matchStatus.student && students.length > 0 && (
                      <div className="mb-3">
                        <Select
                          value={manualMatches[assignment.id] || ''}
                          onValueChange={(value) => handleManualMatch(assignment.id, value)}
                        >
                          <SelectTrigger className="w-full sm:w-64">
                            <SelectValue placeholder="请选择匹配的学生" />
                          </SelectTrigger>
                          <SelectContent>
                            {students.map((student) => (
                              <SelectItem key={student.id} value={student.id}>
                                {student.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* 作文内容预览 */}
                    <div className="relative">
                      <div
                        className={`p-3 bg-gray-50 rounded-lg text-sm leading-relaxed ${
                          isExpanded ? '' : 'max-h-24 overflow-hidden'
                        }`}
                      >
                        {displayText}
                      </div>
                      {displayText.length > 150 && (
                        <button
                          onClick={() => togglePreview(assignment.id)}
                          className="text-blue-600 hover:text-blue-800 text-sm mt-2 flex items-center gap-1"
                        >
                          {isExpanded ? (
                            <>
                              <EyeOff className="w-3 h-3" />
                              收起
                            </>
                          ) : (
                            <>
                              <Eye className="w-3 h-3" />
                              <Maximize2 className="w-3 h-3" />
                              展开全文
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 如果没有匹配的学生列表 */}
      {students.length === 0 && assignments.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              <div>
                <h3 className="font-medium text-orange-800">未找到学生名单</h3>
                <p className="text-sm text-orange-700">
                  系统将使用OCR识别的学生姓名进行后续处理。
                </p>
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
          <Button
            variant="outline"
            onClick={onNext}
            className="text-gray-600 hover:text-gray-800"
          >
            跳过此步骤
          </Button>
          <Button
            onClick={() => {
              confirmMatches();
              onNext();
            }}
            disabled={assignments.length === 0}
            className="px-8"
          >
            下一步：AI批改
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NameMatchingConfirmation;