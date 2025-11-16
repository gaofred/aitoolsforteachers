"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Upload, Plus, Download, FileText, Clipboard, CheckCircle, AlertCircle, X } from "lucide-react";
import * as XLSX from 'xlsx';
import type { Student } from "../types";

interface StudentNameInputProps {
  students: Student[];
  onStudentsChange: (students: Student[]) => void;
}

interface ImportPreview {
  names: string[];
  duplicates: string[];
  total: number;
  valid: number;
}

export const StudentNameInput: React.FC<StudentNameInputProps> = ({
  students,
  onStudentsChange
}) => {
  const [newStudentName, setNewStudentName] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [showPasteInput, setShowPasteInput] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
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

  // 解析文本内容，提取学生姓名
  const parseNamesFromText = (text: string): string[] => {
    const names: string[] = [];
    
    // 按行分割
    const lines = text.split(/\r?\n/);
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      // 检查是否是CSV格式（包含逗号、分号或制表符）
      if (trimmed.includes(',') || trimmed.includes(';') || trimmed.includes('\t')) {
        // CSV格式：按分隔符分割
        const parts = trimmed.split(/[,;\t]/).map(part => part.trim().replace(/^["']|["']$/g, ''));
        names.push(...parts.filter(part => part.length > 0));
      } else {
        // 单行格式：直接添加
        const name = trimmed.replace(/^["']|["']$/g, '');
        if (name.length > 0) {
          names.push(name);
        }
      }
    }
    
    // 去重并过滤无效名称
    const uniqueNames = Array.from(new Set(names))
      .filter(name => {
        // 过滤掉明显无效的名称
        const invalidPatterns = [
          /^学生\d+$/,  // "学生1", "学生2" 等
          /^\d+$/,      // 纯数字
          /^[a-zA-Z]$/, // 单个字母
          /^(姓名|名字|学生姓名|name|student)$/i, // 表头
        ];
        return !invalidPatterns.some(pattern => pattern.test(name));
      })
      .filter(name => name.length >= 2 && name.length <= 20); // 姓名长度限制
    
    return uniqueNames;
  };

  // 预览导入结果
  const previewImport = (names: string[]): ImportPreview => {
    const existingNames = new Set(students.map(s => s.name));
    const duplicates: string[] = [];
    const valid: string[] = [];
    
    names.forEach(name => {
      if (existingNames.has(name)) {
        duplicates.push(name);
      } else {
        valid.push(name);
      }
    });
    
    return {
      names: valid,
      duplicates,
      total: names.length,
      valid: valid.length
    };
  };

  // 确认导入
  const confirmImport = (preview: ImportPreview) => {
    const newStudents: Student[] = preview.names.map((name, index) => ({
      id: `student_${Date.now()}_${index}_${Math.random()}`,
      name: name.trim(),
      confirmed: true
    }));
    
    onStudentsChange([...students, ...newStudents]);
    setImportPreview(null);
    setPasteText("");
    setShowPasteInput(false);
    
    // 显示成功消息
    const message = `成功导入 ${preview.valid} 个学生姓名${preview.duplicates.length > 0 ? `，跳过 ${preview.duplicates.length} 个重复项` : ''}`;
    alert(message);
  };

  // 文件导入处理
  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 检查文件类型
    const fileName = file.name.toLowerCase();
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
    const isCsv = fileName.endsWith('.csv') || fileName.endsWith('.txt');
    
    if (!isExcel && !isCsv) {
      alert('不支持的文件格式，请选择 CSV、TXT 或 Excel 文件');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setIsImporting(true);
    try {
      let names: string[] = [];
      
      if (isExcel) {
        // Excel文件处理
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        
        // 读取第一个工作表
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // 将工作表转换为JSON数组
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];
        
        // 提取所有非空单元格的值作为姓名
        const allValues: string[] = [];
        data.forEach(row => {
          row.forEach(cell => {
            if (cell && typeof cell === 'string') {
              allValues.push(cell.trim());
            } else if (cell && typeof cell === 'number') {
              allValues.push(String(cell).trim());
            }
          });
        });
        
        names = allValues.filter(name => name.length > 0);
      } else {
        // CSV/TXT文件处理
        const text = await file.text();
        names = parseNamesFromText(text);
      }
      
      if (names.length === 0) {
        alert('文件中没有找到有效的学生姓名，请检查文件格式');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        setIsImporting(false);
        return;
      }
      
      // 显示预览
      const preview = previewImport(names);
      setImportPreview(preview);
      
    } catch (error) {
      console.error('文件导入失败:', error);
      alert(`文件导入失败：${error instanceof Error ? error.message : '未知错误'}\n\n请确保文件格式正确。支持的格式：\n- Excel (.xlsx, .xls)\n- CSV (.csv)\n- 文本文件 (.txt)`);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // 文本粘贴导入
  const handlePasteImport = () => {
    if (!pasteText.trim()) {
      alert('请先粘贴学生姓名');
      return;
    }
    
    const names = parseNamesFromText(pasteText);
    
    if (names.length === 0) {
      alert('没有找到有效的学生姓名，请检查格式');
      return;
    }
    
    const preview = previewImport(names);
    setImportPreview(preview);
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
    <div className="space-y-4 sm:space-y-6">
      {/* 添加单个学生 */}
      <Card>
        <CardHeader className="p-3 sm:p-4 md:p-6">
          <CardTitle className="text-base sm:text-lg">手动添加学生</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 md:p-6">
          <div className="flex gap-2">
            <Input
              placeholder="输入学生姓名"
              value={newStudentName}
              onChange={(e) => setNewStudentName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addStudent()}
              className="flex-1 text-sm sm:text-base"
            />
            <Button onClick={addStudent} disabled={!newStudentName.trim()} className="text-sm">
              <Plus className="w-4 h-4 mr-0 sm:mr-1" />
              <span className="hidden sm:inline">添加</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 批量导入 */}
      <Card>
        <CardHeader className="p-3 sm:p-4 md:p-6">
          <CardTitle className="text-base sm:text-lg">批量导入</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 md:p-6">
          <div className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt,.xlsx,.xls"
                onChange={handleFileImport}
                className="hidden"
                id="file-import"
              />
              <Button
                variant="outline"
                className="cursor-pointer text-sm"
                disabled={isImporting}
                onClick={() => {
                  if (fileInputRef.current && !isImporting) {
                    fileInputRef.current.click();
                  }
                }}
              >
                <Upload className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden xs:inline">{isImporting ? '导入中...' : '选择文件'}</span>
                <span className="xs:hidden">{isImporting ? '导入' : '文件'}</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => setShowPasteInput(!showPasteInput)}
                className="text-sm"
              >
                <Clipboard className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden xs:inline">文本粘贴</span>
                <span className="xs:hidden">粘贴</span>
              </Button>

              <Button
                variant="outline"
                onClick={addSampleStudents}
                className="text-sm"
              >
                <Plus className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden xs:inline">添加示例</span>
                <span className="xs:hidden">示例</span>
              </Button>

              <Button
                variant="outline"
                onClick={exportStudents}
                disabled={students.length === 0}
                className="text-sm"
              >
                <Download className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden xs:inline">导出名单</span>
                <span className="xs:hidden">导出</span>
              </Button>

              <Button
                variant="outline"
                onClick={clearAll}
                disabled={students.length === 0}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 text-sm col-span-2 sm:col-span-1"
              >
                <Trash2 className="w-4 h-4 mr-1 sm:mr-2" />
                清空
              </Button>
            </div>

            {/* 文本粘贴输入框 */}
            {showPasteInput && (
              <div className="space-y-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">粘贴学生姓名</label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowPasteInput(false);
                      setPasteText("");
                    }}
                    className="h-6 w-6 p-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <Textarea
                  placeholder="每行一个姓名，或用逗号/分号分隔。例如：&#10;张三&#10;李四&#10;王五&#10;或：张三,李四,王五"
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handlePasteImport}
                    disabled={!pasteText.trim()}
                    className="flex-1"
                    size="sm"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    解析并预览
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPasteText("");
                      setImportPreview(null);
                    }}
                    size="sm"
                  >
                    清空
                  </Button>
                </div>
              </div>
            )}

            {/* 导入预览 */}
            {importPreview && (
              <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="font-semibold text-blue-800">导入预览</h5>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setImportPreview(null)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>将导入 <strong className="text-green-700">{importPreview.valid}</strong> 个新学生</span>
                  </div>
                  {importPreview.duplicates.length > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <AlertCircle className="w-4 h-4 text-orange-600" />
                      <span>跳过 <strong className="text-orange-700">{importPreview.duplicates.length}</strong> 个重复项</span>
                    </div>
                  )}
                  <div className="text-xs text-gray-600">
                    总计：{importPreview.total} 个 → 有效：{importPreview.valid} 个
                  </div>
                </div>

                {/* 预览列表 */}
                {importPreview.names.length > 0 && (
                  <div className="mb-3">
                    <div className="text-xs font-medium text-gray-700 mb-2">将导入的学生：</div>
                    <div className="max-h-32 overflow-y-auto bg-white rounded border border-gray-200 p-2">
                      <div className="flex flex-wrap gap-1">
                        {importPreview.names.slice(0, 20).map((name, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {name}
                          </Badge>
                        ))}
                        {importPreview.names.length > 20 && (
                          <Badge variant="outline" className="text-xs">
                            ...还有 {importPreview.names.length - 20} 个
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 重复项提示 */}
                {importPreview.duplicates.length > 0 && (
                  <div className="mb-3">
                    <div className="text-xs font-medium text-orange-700 mb-2">重复的学生（将跳过）：</div>
                    <div className="max-h-24 overflow-y-auto bg-orange-50 rounded border border-orange-200 p-2">
                      <div className="flex flex-wrap gap-1">
                        {importPreview.duplicates.slice(0, 10).map((name, index) => (
                          <Badge key={index} variant="outline" className="text-xs bg-orange-100 border-orange-300">
                            {name}
                          </Badge>
                        ))}
                        {importPreview.duplicates.length > 10 && (
                          <Badge variant="outline" className="text-xs bg-orange-100 border-orange-300">
                            ...还有 {importPreview.duplicates.length - 10} 个
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 操作按钮 */}
                <div className="flex gap-2">
                  <Button
                    onClick={() => confirmImport(importPreview)}
                    disabled={importPreview.valid === 0}
                    className="flex-1"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    确认导入 ({importPreview.valid}个)
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setImportPreview(null)}
                  >
                    取消
                  </Button>
                </div>
              </div>
            )}

            <div className="text-sm text-gray-600 space-y-1">
              <p><strong>支持格式：</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><span className="font-semibold text-green-600">Excel文件</span>：支持 .xlsx 和 .xls 格式，自动提取所有姓名</li>
                <li>CSV/TXT文件：每行一个姓名，或用逗号/分号分隔</li>
                <li>文本粘贴：直接粘贴姓名列表，支持多种格式</li>
                <li><strong>示例格式：</strong></li>
                <li className="ml-4 font-mono text-xs">张三<br />李四<br />王五</li>
                <li className="ml-4 font-mono text-xs">或：张三,李四,王五</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 学生列表 */}
      <Card>
        <CardHeader className="p-3 sm:p-4 md:p-6">
          <CardTitle className="text-base sm:text-lg flex items-center justify-between">
            <span>学生名单</span>
            <Badge variant="secondary" className="text-xs sm:text-sm">
              {students.length} 名学生
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 md:p-6">
          {students.length === 0 ? (
            <div className="text-center py-6 sm:py-8 text-gray-500">
              <p className="text-sm sm:text-base">暂无学生信息</p>
              <p className="text-xs sm:text-sm mt-2">请手动添加或批量导入学生姓名</p>
            </div>
          ) : (
            <div className="space-y-1.5 sm:space-y-2 max-h-64 overflow-y-auto">
              {students.map((student, index) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <span className="text-xs sm:text-sm font-medium text-gray-500 w-5 sm:w-6 flex-shrink-0">
                      {index + 1}.
                    </span>
                    <span className="text-sm sm:text-base font-medium truncate">{student.name}</span>
                    {student.confirmed && (
                      <Badge variant="default" className="text-[10px] sm:text-xs flex-shrink-0">
                        已确认
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeStudent(student.id)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 ml-2 flex-shrink-0 h-8 w-8 sm:h-auto sm:w-auto p-1 sm:p-2"
                  >
                    <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 使用说明 */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-3 sm:p-4">
          <h4 className="text-sm sm:text-base font-semibold text-blue-800 mb-2">使用说明</h4>
          
          {/* 可选提示 */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 sm:p-3 mb-3">
            <div className="flex items-center gap-2 text-yellow-800">
              <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="font-medium text-xs sm:text-sm">学生名单录入为可选项</span>
            </div>
            <p className="text-xs text-yellow-700 mt-1">
              如果暂时没有学生名单，可以直接进入下一步。后续在第六步可以手动输入学生姓名。
            </p>
          </div>

          <ul className="text-xs sm:text-sm text-blue-700 space-y-1">
            <li>• <strong>手动添加</strong>：适合少量学生，逐个输入姓名</li>
            <li>• <strong>文件导入</strong>：支持CSV/TXT/Excel文件，自动识别多种格式</li>
            <li>• <strong>文本粘贴</strong>：直接从Excel或其他文档复制粘贴姓名列表</li>
            <li>• <strong>导入预览</strong>：导入前预览结果，自动去重和验证</li>
            <li>• <strong>示例数据</strong>：快速添加10个示例学生进行测试</li>
            <li>• <strong>灵活匹配</strong>：后续可自动匹配或手动输入学生姓名</li>
          </ul>
        </CardContent>
      </Card>

      {/* 示例效果展示 */}
      <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-blue-50">
        <CardHeader className="p-3 sm:p-4 md:p-6">
          <CardTitle className="text-base sm:text-lg flex items-center justify-between">
            <span className="text-green-800">润色效果示例</span>
            <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 text-xs">
              5句
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-4 md:p-6">
          {/* 示例句子对比 - 移动端单列，桌面端双列 */}
          <div className="space-y-4 md:space-y-0 md:grid md:grid-cols-2 md:gap-4">
            {[
              {
                original: "When she finished her passionate speech and bowed deeply on the stage, thunderous applause broke out and echoed in the auditorium for a long time.",
                polished: "After delivering her passionate speech and bowing deeply on the stage, thunderous applause erupted and echoed through the auditorium for minutes on end.",
                explanation: "优化了词汇表达，使用更准确的词汇"
              },
              {
                original: "With tears in my eyes, I lingered in the airport, because I knew that I didn't know when to see you again this time.",
                polished: "Eyes brimming with tears, I lingered at the airport, for I had no idea when I would see you again this time.",
                explanation: "优化了词汇表达，使用更准确的词汇"
              },
              {
                original: "At the thought of the final exam next week, I started to organize the study notes right away.",
                polished: "The moment I thought about next week's final exam, I immediately began organizing my study notes.",
                explanation: "优化了词汇表达，使用更准确的词汇"
              },
              {
                original: "Winning the first place in the competition, my heart filled with pride as I listened to the thunderous applause.",
                polished: "Having won first place in the competition, I felt my heart fill with pride as I listened to the thunderous applause.",
                explanation: "优化了词汇表达，使用更准确的词汇"
              },
              {
                original: "The World - famous Golden Gate Bridge springs to mind when people talk about San Francisco.",
                polished: "When people talk about San Francisco, the world-famous Golden Gate Bridge immediately springs to mind.",
                explanation: "优化了词汇表达，使用更准确的词汇"
              }
            ].slice(0, 3).map((item, index) => (
              <div key={index} className="space-y-2 p-3 bg-white/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-600">示例 {index + 1}</span>
                  <Badge variant="default" className="bg-green-500 text-[10px] px-1.5 py-0">
                    优化
                  </Badge>
                </div>
                
                {/* 原句 */}
                <div className="border-l-2 border-blue-400 pl-2 py-1">
                  <div className="text-[10px] text-gray-500 mb-0.5">原句:</div>
                  <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">{item.original}</p>
                </div>
                
                {/* 润色后 */}
                <div className="border-l-2 border-green-400 pl-2 py-1">
                  <div className="text-[10px] text-gray-500 mb-0.5">润色后:</div>
                  <p className="text-xs sm:text-sm text-green-800 leading-relaxed font-medium">{item.polished}</p>
                </div>
                
                <p className="text-[10px] sm:text-xs text-blue-600 pl-2">✨ {item.explanation}</p>
              </div>
            ))}
          </div>

          <div className="text-[10px] sm:text-xs text-gray-500 text-center pt-2 border-t border-gray-200">
            💡 以上为AI润色效果示例，实际效果会根据您设置的要求进行调整
          </div>
        </CardContent>
      </Card>
    </div>
  );
};