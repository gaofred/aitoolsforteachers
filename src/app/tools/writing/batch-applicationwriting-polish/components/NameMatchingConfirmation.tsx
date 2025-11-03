"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, User } from "lucide-react";
import type { ApplicationBatchTask, Student } from "../types";

interface NameMatchingConfirmationProps {
  task: ApplicationBatchTask | null;
  setTask: (task: ApplicationBatchTask | null) => void;
  onNext: () => void;
  onPrev: () => void;
}

const NameMatchingConfirmation: React.FC<NameMatchingConfirmationProps> = ({
  task,
  setTask,
  onNext,
  onPrev
}) => {
  const [manualMatches, setManualMatches] = useState<{[key: string]: string}>({});

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

    onNext();
  };

  const allMatched = assignments.every(assignment => {
    const matchStatus = getMatchStatus(assignment.id);
    return matchStatus.student !== null;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">姓名匹配确认 (可选)</h2>
        <p className="text-gray-600 text-sm">
          确认OCR识别的学生姓名与名单中的学生匹配关系。如果暂时不需要或匹配困难，可以直接跳过此步骤。
        </p>
      </div>

      {assignments.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-gray-500">
            暂无作文数据，请返回上一步
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {assignments.map((assignment, index) => {
            const matchStatus = getMatchStatus(assignment.id);
            
            return (
              <Card key={assignment.id} className="border border-gray-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-600" />
                    作文 {index + 1} - 姓名匹配
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* OCR识别的姓名 */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        OCR识别姓名
                      </label>
                      <div className="p-3 bg-gray-50 rounded border">
                        <span className="font-medium">{assignment.student?.name || assignment.ocrResult.studentName || '未识别'}</span>
                      </div>
                    </div>

                    {/* 匹配的学生 */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        匹配学生
                      </label>
                      <div className="space-y-2">
                        {matchStatus.student ? (
                          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="font-medium text-green-800">
                              {matchStatus.student.name}
                            </span>
                            <Badge variant="secondary" className="text-xs">
                              {matchStatus.type === 'extracted' ? '智能提取' :
                               matchStatus.type === 'auto' ? '自动匹配' : '手动匹配'}
                            </Badge>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded">
                            <AlertCircle className="w-4 h-4 text-red-600" />
                            <span className="text-red-800">未匹配</span>
                          </div>
                        )}

                        {/* 手动选择学生 */}
                        <Select
                          value={manualMatches[assignment.id] || ''}
                          onValueChange={(value) => handleManualMatch(assignment.id, value)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="手动选择学生" />
                          </SelectTrigger>
                          <SelectContent>
                            {students.map(student => (
                              <SelectItem key={student.id} value={student.id}>
                                {student.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* 作文预览 */}
                  <div className="pt-2 border-t">
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      作文内容预览
                    </label>
                    <div className="bg-gray-50 p-3 rounded text-sm text-gray-700 max-h-24 overflow-y-auto">
                      {(assignment.ocrResult.editedText || assignment.ocrResult.content).substring(0, 200)}
                      {(assignment.ocrResult.editedText || assignment.ocrResult.content).length > 200 && '...'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* 匹配统计 */}
      {assignments.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-blue-700">
                匹配进度: {assignments.filter(a => getMatchStatus(a.id).student).length}/{assignments.length}
              </span>
              {allMatched ? (
                <div className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span>全部匹配完成</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-orange-600">
                  <AlertCircle className="w-4 h-4" />
                  <span>还有未匹配的学生</span>
                </div>
              )}
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
            onClick={confirmMatches}
            disabled={!allMatched}
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


