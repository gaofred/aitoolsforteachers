"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Upload, Plus, Download, FileText, Clipboard, CheckCircle, AlertCircle, X, Users, Calculator, Coins } from "lucide-react";
import * as XLSX from 'xlsx';
import type { ApplicationBatchTask, Student } from "../types";

interface StudentNameInputProps {
  task: ApplicationBatchTask | null;
  setTask: (task: ApplicationBatchTask | null) => void;
  onNext: () => void;
}

interface ImportPreview {
  names: string[];
  duplicates: string[];
  total: number;
  valid: number;
}

const StudentNameInput: React.FC<StudentNameInputProps> = ({
  task,
  setTask,
  onNext
}) => {
  const [newStudentName, setNewStudentName] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [showPasteInput, setShowPasteInput] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const students = task?.students || [];

  // 计算点数消耗：每个学生1点数
  const calculatePoints = (studentCount: number) => {
    return studentCount * 1;
  };

  // 当前点数消耗
  const currentPointsCost = calculatePoints(students.length);
  const addStudent = () => {
    if (!newStudentName.trim() || !task) return;

    const newStudent: Student = {
      id: `student_${Date.now()}_${Math.random()}`,
      name: newStudentName.trim(),
      createdAt: new Date()
    };

    setTask({
      ...task,
      students: [...students, newStudent]
    });
    setNewStudentName("");
  };

  // 删除学生
  const removeStudent = (studentId: string) => {
    if (!task) return;
    setTask({
      ...task,
      students: students.filter(s => s.id !== studentId)
    });
  };

  // 清空所有学生
  const clearAllStudents = () => {
    if (!task) return;
    setTask({
      ...task,
      students: []
    });
  };

  // 处理文件上传
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // 提取姓名（假设在第一列）
        const names = jsonData
          .map((row: any) => row[0])
          .filter((name: any) => name && typeof name === 'string')
          .map((name: string) => name.trim())
          .filter((name: string) => name.length > 0);

        processImportedNames(names);
      } catch (error) {
        console.error('文件解析失败:', error);
        alert('文件格式不正确，请上传有效的Excel文件');
      } finally {
        setIsImporting(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // 处理粘贴文本
  const handlePasteImport = () => {
    const names = pasteText
      .split(/[\n,，]/)
      .map(name => name.trim())
      .filter(name => name.length > 0);

    processImportedNames(names);
    setPasteText("");
    setShowPasteInput(false);
  };

  // 处理导入的姓名
  const processImportedNames = (names: string[]) => {
    const existingNames = new Set(students.map(s => s.name));
    const duplicates: string[] = [];
    const validNames: string[] = [];

    names.forEach(name => {
      if (existingNames.has(name)) {
        duplicates.push(name);
      } else {
        validNames.push(name);
        existingNames.add(name);
      }
    });

    setImportPreview({
      names: validNames,
      duplicates,
      total: names.length,
      valid: validNames.length
    });
  };

  // 确认导入
  const confirmImport = () => {
    if (!importPreview || !task) return;

    const newStudents: Student[] = importPreview.names.map(name => ({
      id: `student_${Date.now()}_${Math.random()}`,
      name,
      createdAt: new Date()
    }));

    setTask({
      ...task,
      students: [...students, ...newStudents]
    });

    setImportPreview(null);
  };

  // 取消导入
  const cancelImport = () => {
    setImportPreview(null);
  };

  // 下载模板
  const downloadTemplate = () => {
    const template = [
      ['学生姓名'],
      ['张三'],
      ['李四'],
      ['王五']
    ];

    const ws = XLSX.utils.aoa_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "学生名单");
    XLSX.writeFile(wb, "学生名单模板.xlsx");
  };

  return (
    <div className="space-y-6">
      {/* 目前批改能实现的功能 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-blue-600 text-xs font-bold">✓</span>
          </div>
          <div>
            <h3 className="text-sm font-medium text-blue-800 mb-2">目前批改能实现的功能</h3>
            <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
              <li>自动识别应用文中的学生姓名</li>
              <li>对应用文进行AI智能批改，提供详细的评分和反馈</li>
              <li>提供修改意见、逐句批改</li>
              <li>在学生原有作文基础上生成匹配的高分范文</li>
              <li>支持批量处理，提高批改效率</li>
              <li>支持批改结果一键导出（学生姓名及具体得分、每个学生单独的批改结果的word文件和全班批改结果的word文件）</li>
              <li>支持全班共性问题分析【语法错误、词汇运用问题、内容与逻辑及问题、高分词汇与句式结构、词汇拓展等】</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 点数消耗提示 */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-300 rounded-xl p-5 shadow-lg">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
            <Coins className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-purple-800 mb-3 flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              点数消耗说明
            </h3>

            <div className="bg-white rounded-lg p-4 border border-purple-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">当前学生人数：</span>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span className="text-2xl font-bold text-blue-600">{students.length}</span>
                  <span className="text-sm text-gray-600">人</span>
                </div>
              </div>

              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-gray-700">点数消耗：</span>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-bold text-purple-600">{currentPointsCost}</span>
                  <span className="text-sm text-gray-600">点数</span>
                </div>
              </div>

              <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-purple-600"></div>
                  <span className="text-sm font-medium text-purple-800">计费规则</span>
                </div>
                <p className="text-xs text-purple-700 leading-relaxed">
                  <strong>1个点数 = 1个学生</strong>，系统会在完成批改后根据实际处理的学生数量扣除点数。
                  请确保您的账户中有足够的点数余额。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 注意事项 */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-amber-600 text-xs font-bold">!</span>
          </div>
          <div>
            <h3 className="text-sm font-medium text-amber-800 mb-2">注意事项</h3>
            <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
              <li>无需固定模板。只要保证学生的作文在一张图片上即可</li>
              <li>文字识别率较高。不过尽量让学生写名字时，别连笔</li>
              <li>答题卡尽量有姓名：XXX字样。如 姓名:李萍萍。 这样AI可以更好识别</li>
            </ul>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">导入学生姓名 (可选)</h2>
        <p className="text-gray-600 text-sm">
          添加需要批改应用文的学生姓名，支持手动添加、批量粘贴或Excel导入。
          如暂时不需要，可以直接跳过此步骤，后续可以通过OCR识别自动获取学生姓名。
        </p>
      </div>

      {/* 导入预览弹窗 */}
      {importPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">导入预览</h3>
              <button onClick={cancelImport} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm">将导入 {importPreview.valid} 个有效姓名</span>
              </div>

              {importPreview.duplicates.length > 0 && (
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm">跳过 {importPreview.duplicates.length} 个重复姓名</span>
                </div>
              )}

              {importPreview.names.length > 0 && (
                <div className="max-h-32 overflow-y-auto bg-gray-50 rounded p-2">
                  <div className="text-xs text-gray-600 mb-1">将导入的姓名：</div>
                  <div className="flex flex-wrap gap-1">
                    {importPreview.names.map((name, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button onClick={confirmImport} className="flex-1">
                确认导入
              </Button>
              <Button variant="outline" onClick={cancelImport} className="flex-1">
                取消
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 操作区域 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">添加学生</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 手动添加 */}
          <div className="flex gap-2">
            <Input
              placeholder="输入学生姓名"
              value={newStudentName}
              onChange={(e) => setNewStudentName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addStudent()}
              className="flex-1"
            />
            <Button onClick={addStudent} disabled={!newStudentName.trim()}>
              <Plus className="w-4 h-4 mr-2" />
              添加
            </Button>
          </div>

          {/* 批量操作 */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => setShowPasteInput(!showPasteInput)}
              className="flex items-center gap-2"
            >
              <Clipboard className="w-4 h-4" />
              批量粘贴
            </Button>

            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              {isImporting ? '导入中...' : 'Excel导入'}
            </Button>

            <Button
              variant="outline"
              onClick={downloadTemplate}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              下载模板
            </Button>

            {students.length > 0 && (
              <Button
                variant="outline"
                onClick={clearAllStudents}
                className="flex items-center gap-2 text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
                清空全部
              </Button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* 批量粘贴输入框 */}
          {showPasteInput && (
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="mb-2">
                <label className="text-sm font-medium text-gray-700">
                  批量粘贴姓名（每行一个或用逗号分隔）
                </label>
              </div>
              <Textarea
                placeholder="张三&#10;李四&#10;王五"
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                className="mb-2"
                rows={4}
              />
              <div className="flex gap-2">
                <Button onClick={handlePasteImport} disabled={!pasteText.trim()}>
                  导入
                </Button>
                <Button variant="outline" onClick={() => setShowPasteInput(false)}>
                  取消
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 学生列表 */}
      {students.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              <span>学生列表 ({students.length}人)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {students.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"
                >
                  <span className="text-sm font-medium">{student.name}</span>
                  <button
                    onClick={() => removeStudent(student.id)}
                    className="text-red-500 hover:text-red-700 ml-2"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 操作按钮 */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={onNext}
          className="text-gray-600 hover:text-gray-800"
        >
          跳过此步骤
        </Button>
        <Button
          onClick={onNext}
          disabled={students.length === 0}
          className="px-8"
        >
          下一步：输入应用文题目
        </Button>
      </div>
    </div>
  );
};

export default StudentNameInput;


