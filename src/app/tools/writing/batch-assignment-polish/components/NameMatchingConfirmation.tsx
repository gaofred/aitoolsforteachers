"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { Alert, AlertDescription } from "@/components/ui/alert"; // 暂时移除
import { CheckCircle, AlertCircle, User, Search, RefreshCw } from "lucide-react";
import type { StudentAssignment, Student, NameMatch } from "../types";

interface NameMatchingConfirmationProps {
  assignments: StudentAssignment[];
  students: Student[];
  onAssignmentsChange: (assignments: StudentAssignment[]) => void;
  onMatchComplete: () => void;
}

export const NameMatchingConfirmation: React.FC<NameMatchingConfirmationProps> = ({
  assignments,
  students,
  onAssignmentsChange,
  onMatchComplete
}) => {
  const [nameMatches, setNameMatches] = useState<NameMatch[]>([]);
  const [confirmedMatches, setConfirmedMatches] = useState<Set<string>>(new Set());
  const [manualMatches, setManualMatches] = useState<Map<string, string>>(new Map());

  // 计算字符串相似度（编辑距离算法）
  const calculateSimilarity = (str1: string, str2: string): number => {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix = Array(len2 + 1).fill(null).map(() => Array(len1 + 1).fill(null));

    for (let i = 0; i <= len1; i++) matrix[0][i] = i;
    for (let j = 0; j <= len2; j++) matrix[j][0] = j;

    for (let j = 1; j <= len2; j++) {
      for (let i = 1; i <= len1; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }

    const maxLen = Math.max(len1, len2);
    return maxLen === 0 ? 1 : (maxLen - matrix[len2][len1]) / maxLen;
  };

  // 自动匹配学生姓名
  const autoMatchNames = () => {
    const matches: NameMatch[] = assignments.map(assignment => {
      const ocrName = assignment.ocrResult.studentName;
      let bestMatch: Student | null = null;
      let bestSimilarity = 0;

      // 尝试找到最匹配的学生
      students.forEach(student => {
        const similarity = calculateSimilarity(
          ocrName.toLowerCase().replace(/\s/g, ''),
          student.name.toLowerCase().replace(/\s/g, '')
        );

        if (similarity > bestSimilarity && similarity > 0.3) { // 相似度阈值
          bestSimilarity = similarity;
          bestMatch = student;
        }
      });

      return {
        ocrResult: assignment.ocrResult,
        matchedStudent: bestMatch,
        confidence: bestSimilarity,
        confirmed: bestSimilarity > 0.8 // 高相似度自动确认
      };
    });

    setNameMatches(matches);

    // 自动确认高相似度的匹配
    const autoConfirmed = new Set<string>();
    matches.forEach((match, index) => {
      if (match.confirmed) {
        autoConfirmed.add(`match_${index}`);
      }
    });
    setConfirmedMatches(autoConfirmed);
  };

  useEffect(() => {
    if (assignments.length > 0 && students.length > 0) {
      autoMatchNames();
    }
  }, [assignments, students]);

  // 手动选择匹配
  const handleManualMatch = (matchIndex: string, studentId: string) => {
    setManualMatches(prev => new Map(prev).set(matchIndex, studentId));

    const match = nameMatches[parseInt(matchIndex.replace('match_', ''))];
    if (match) {
      const student = students.find(s => s.id === studentId);
      if (student) {
        const updatedMatches = [...nameMatches];
        updatedMatches[parseInt(matchIndex.replace('match_', ''))] = {
          ...match,
          matchedStudent: student,
          confidence: 1.0,
          confirmed: true
        };
        setNameMatches(updatedMatches);
        setConfirmedMatches(prev => new Set(prev).add(matchIndex));
      }
    }
  };

  // 确认匹配
  const confirmMatch = (matchIndex: string) => {
    const index = parseInt(matchIndex.replace('match_', ''));
    const match = nameMatches[index];

    if (match && match.matchedStudent) {
      const updatedMatches = [...nameMatches];
      updatedMatches[index] = { ...match, confirmed: true };
      setNameMatches(updatedMatches);
      setConfirmedMatches(prev => new Set(prev).add(matchIndex));
    }
  };

  // 取消确认
  const unconfirmMatch = (matchIndex: string) => {
    setConfirmedMatches(prev => {
      const newSet = new Set(prev);
      newSet.delete(matchIndex);
      return newSet;
    });

    const index = parseInt(matchIndex.replace('match_', ''));
    const match = nameMatches[index];
    if (match) {
      const updatedMatches = [...nameMatches];
      updatedMatches[index] = { ...match, confirmed: false };
      setNameMatches(updatedMatches);
    }
  };

  // 获取匹配状态颜色
  const getMatchStatusColor = (match: NameMatch, isConfirmed: boolean) => {
    if (!match.matchedStudent) return 'bg-gray-100 border-gray-300';
    if (isConfirmed) return 'bg-green-50 border-green-300';
    if (match.confidence > 0.8) return 'bg-blue-50 border-blue-300';
    if (match.confidence > 0.5) return 'bg-yellow-50 border-yellow-300';
    return 'bg-red-50 border-red-300';
  };

  // 获取相似度颜色
  const getSimilarityColor = (similarity: number) => {
    if (similarity > 0.8) return 'text-green-600';
    if (similarity > 0.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  // 获取未匹配的学生
  const getUnmatchedStudents = (currentMatch: NameMatch) => {
    const matchedStudentIds = nameMatches
      .filter(m => m.matchedStudent && m.confirmed)
      .map(m => m.matchedStudent!.id);

    return students.filter(s => !matchedStudentIds.includes(s.id));
  };

  // 完成匹配并更新作业
  const completeMatching = () => {
    const updatedAssignments = assignments.map((assignment, index) => {
      const match = nameMatches[index];
      if (match && match.matchedStudent && confirmedMatches.has(`match_${index}`)) {
        return {
          ...assignment,
          student: {
            ...match.matchedStudent,
            originalName: match.ocrResult.studentName
          }
        };
      }
      return assignment;
    });

    onAssignmentsChange(updatedAssignments);
    onMatchComplete();
  };

  // 重新匹配
  const rematchAll = () => {
    setConfirmedMatches(new Set());
    setManualMatches(new Map());
    autoMatchNames();
  };

  const stats = {
    total: nameMatches.length,
    autoMatched: nameMatches.filter(m => m.confidence > 0.8).length,
    confirmed: confirmedMatches.size,
    unmatched: nameMatches.filter(m => !m.matchedStudent).length
  };

  return (
    <div className="space-y-6">
      {/* 统计信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span>姓名匹配确认</span>
            <Button
              variant="outline"
              onClick={rematchAll}
              size="sm"
              className="text-blue-600 border-blue-200 hover:bg-blue-50"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              重新匹配
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-600">总作业数</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.autoMatched}</div>
              <div className="text-sm text-gray-600">自动匹配</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.confirmed}</div>
              <div className="text-sm text-gray-600">已确认</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.unmatched}</div>
              <div className="text-sm text-gray-600">未匹配</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 匹配列表 */}
      <div className="space-y-4">
        {nameMatches.map((match, index) => (
          <Card
            key={index}
            className={`border-2 ${getMatchStatusColor(match, confirmedMatches.has(`match_${index}`))}`}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-gray-600" />
                    <span className="font-medium">作业 #{index + 1}</span>
                  </div>

                  {match.matchedStudent ? (
                    <Badge
                      variant={confirmedMatches.has(`match_${index}`) ? "default" : "secondary"}
                      className={
                        confirmedMatches.has(`match_${index}`) ? "bg-green-500" : ""
                      }
                    >
                      {confirmedMatches.has(`match_${index}`) ? "已确认" : "待确认"}
                    </Badge>
                  ) : (
                    <Badge variant="destructive">未匹配</Badge>
                  )}

                  {match.matchedStudent && (
                    <span className={`text-sm font-medium ${getSimilarityColor(match.confidence)}`}>
                      相似度: {(match.confidence * 100).toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>

              {/* OCR识别结果 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-1">
                    OCR识别姓名
                  </div>
                  <div className="p-2 bg-gray-50 rounded border border-gray-200">
                    <span className="font-medium">{match.ocrResult.studentName}</span>
                  </div>
                </div>

                {/* 匹配结果 */}
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-1">
                    匹配学生
                  </div>
                  {match.matchedStudent ? (
                    <div className="p-2 bg-white rounded border border-gray-200">
                      <span className="font-medium text-green-700">
                        {match.matchedStudent.name}
                      </span>
                    </div>
                  ) : (
                    <div className="p-2 bg-red-50 rounded border border-red-200">
                      <span className="text-red-600">未找到匹配学生</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 句子信息 */}
              <div className="mb-3">
                <div className="text-sm font-medium text-gray-700 mb-1">
                  识别的句子
                </div>
                <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded border border-gray-200">
                  {match.ocrResult.sentences.map((sentence, idx) => (
                    <div key={idx} className="mb-1">
                      {idx + 1}. {sentence}
                    </div>
                  ))}
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  {match.matchedStudent && !confirmedMatches.has(`match_${index}`) && (
                    <Button
                      size="sm"
                      onClick={() => confirmMatch(`match_${index}`)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      确认匹配
                    </Button>
                  )}

                  {confirmedMatches.has(`match_${index}`) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => unconfirmMatch(`match_${index}`)}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      取消确认
                    </Button>
                  )}
                </div>

                {/* 手动选择学生 */}
                {!match.matchedStudent || !confirmedMatches.has(`match_${index}`) ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">手动选择:</span>
                    <Select
                      value=""
                      onValueChange={(value) => handleManualMatch(`match_${index}`, value)}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="选择学生" />
                      </SelectTrigger>
                      <SelectContent>
                        {getUnmatchedStudents(match).map(student => (
                          <SelectItem key={student.id} value={student.id}>
                            {student.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 使用说明 */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <h4 className="font-semibold text-blue-800 mb-2">匹配说明</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• <strong>自动匹配</strong>：系统根据姓名相似度自动匹配学生</li>
            <li>• <strong>相似度说明</strong>：绿色(&gt;80%) 高度匹配，黄色(50-80%) 可能匹配，红色(&lt;50%) 低匹配</li>
            <li>• <strong>确认匹配</strong>：请检查每个匹配结果，确认正确后点击"确认匹配"</li>
            <li>• <strong>手动选择</strong>：如果自动匹配不正确，可以手动选择对应的学生</li>
            <li>• <strong>未匹配</strong>：如果找不到对应学生，可以手动选择或检查学生名单</li>
          </ul>
        </CardContent>
      </Card>

      {/* 完成按钮 */}
      {stats.confirmed > 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-green-800">匹配准备完成</h4>
                <p className="text-sm text-green-700">
                  已确认 {stats.confirmed} 个匹配，可以进入下一步润色处理
                </p>
              </div>
              <Button
                onClick={completeMatching}
                className="bg-green-600 hover:bg-green-700"
                size="lg"
              >
                <CheckCircle className="w-5 h-5 mr-2" />
                完成匹配，开始润色
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 警告提示 */}
      {stats.unmatched > 0 && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded text-yellow-800">
          <AlertCircle className="inline h-4 w-4 mr-2" />
          还有 {stats.unmatched} 个作业未匹配学生，请手动选择或检查学生名单。
        </div>
      )}
    </div>
  );
};