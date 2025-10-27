"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Upload, Plus, Download } from "lucide-react";
import type { Student } from "../types";

interface StudentNameInputProps {
  students: Student[];
  onStudentsChange: (students: Student[]) => void;
}

export const StudentNameInput: React.FC<StudentNameInputProps> = ({
  students,
  onStudentsChange
}) => {
  const [newStudentName, setNewStudentName] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 添加单个学生
  const addStudent = () => {
    if (!newStudentName.trim()) return;

    const newStudent: Student = {
      id: `student_${Date.now()}_${Math.random()}`,
      name: newStudentName.trim(),
      confirmed: true
    };

    onStudentsChange([...students, newStudent]);
    setNewStudentName("");
  };

  // 删除学生
  const removeStudent = (studentId: string) => {
    onStudentsChange(students.filter(s => s.id !== studentId));
  };

  // 批量导入（CSV格式）
  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());

      const newStudents: Student[] = lines.map((line, index) => {
        const name = line.trim().replace(/["']/g, ''); // 移除引号
        return {
          id: `student_${Date.now()}_${index}`,
          name: name || `学生${index + 1}`,
          confirmed: true
        };
      }).filter(student => student.name && !student.name.includes('学生'));

      onStudentsChange([...students, ...newStudents]);
    } catch (error) {
      console.error('文件导入失败:', error);
      alert('文件导入失败，请确保文件格式正确（CSV格式，每行一个姓名）');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // 导出学生名单
  const exportStudents = () => {
    const csvContent = students.map(s => s.name).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `学生名单_${new Date().toLocaleDateString()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 清空所有学生
  const clearAll = () => {
    if (students.length > 0 && confirm('确定要清空所有学生姓名吗？')) {
      onStudentsChange([]);
    }
  };

  // 添加示例学生
  const addSampleStudents = () => {
    const sampleNames = [
      "张三", "李四", "王五", "赵六", "陈七",
      "刘八", "周九", "吴十", "郑十一", "孙十二"
    ];

    const sampleStudents: Student[] = sampleNames.map((name, index) => ({
      id: `student_sample_${Date.now()}_${index}`,
      name: name,
      confirmed: true
    }));

    onStudentsChange([...students, ...sampleStudents]);
  };

  return (
    <div className="space-y-6">
      {/* 添加单个学生 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">手动添加学生</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="输入学生姓名"
              value={newStudentName}
              onChange={(e) => setNewStudentName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addStudent()}
              className="flex-1"
            />
            <Button onClick={addStudent} disabled={!newStudentName.trim()}>
              <Plus className="w-4 h-4 mr-1" />
              添加
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 批量导入 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">批量导入</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFileImport}
                className="hidden"
                id="file-import"
              />
              <label
                htmlFor="file-import"
                className="flex-1"
              >
                <Button
                  variant="outline"
                  className="w-full cursor-pointer"
                  disabled={isImporting}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {isImporting ? '导入中...' : '选择CSV/Excel文件'}
                </Button>
              </label>

              <Button
                variant="outline"
                onClick={addSampleStudents}
                className="whitespace-nowrap"
              >
                <Plus className="w-4 h-4 mr-2" />
                添加示例
              </Button>

              <Button
                variant="outline"
                onClick={exportStudents}
                disabled={students.length === 0}
                className="whitespace-nowrap"
              >
                <Download className="w-4 h-4 mr-2" />
                导出名单
              </Button>

              <Button
                variant="outline"
                onClick={clearAll}
                disabled={students.length === 0}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 whitespace-nowrap"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                清空
              </Button>
            </div>

            <div className="text-sm text-gray-600">
              <p>支持格式：CSV或TXT文件，每行一个学生姓名</p>
              <p>示例：张三,李四,王五（每行一个或用逗号分隔）</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 学生列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span>学生名单</span>
            <Badge variant="secondary">
              {students.length} 名学生
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {students.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>暂无学生信息</p>
              <p className="text-sm mt-2">请手动添加或批量导入学生姓名</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {students.map((student, index) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-500 w-6">
                      {index + 1}.
                    </span>
                    <span className="font-medium">{student.name}</span>
                    {student.confirmed && (
                      <Badge variant="default" className="text-xs">
                        已确认
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeStudent(student.id)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 使用说明 */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <h4 className="font-semibold text-blue-800 mb-2">使用说明</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• 手动添加：适合少量学生，逐个输入姓名</li>
            <li>• 批量导入：支持CSV/TXT文件，每行一个姓名</li>
            <li>• 示例数据：快速添加10个示例学生进行测试</li>
            <li>• 导出功能：将当前学生名单导出为CSV文件</li>
            <li>• 姓名将用于OCR识别后的作业匹配，请确保准确性</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};