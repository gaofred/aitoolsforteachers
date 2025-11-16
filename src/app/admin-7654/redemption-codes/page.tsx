"use client";

import { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from 'next/link';

interface RedemptionCode {
  id: string;
  code: string;
  type: string;
  value: number; // 数据库字段是 value，不是 points
  description: string;
  created_at: string;
  used_at?: string;
  used_by?: string;
  is_used: boolean;
  expires_at?: string;
}

export default function RedemptionCodesPage() {
  const [codes, setCodes] = useState<RedemptionCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCode, setNewCode] = useState({
    value: 100,
    description: '',
    expires_at: ''
  });

  useEffect(() => {
    loadRedemptionCodes();
  }, []);

  const loadRedemptionCodes = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/redemption-codes');
      if (response.ok) {
        const data = await response.json();
        setCodes(data.codes || []);
      }
    } catch (error) {
      console.error('加载兑换码列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/admin/redemption-codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newCode),
      });

      if (response.ok) {
        alert('兑换码创建成功！');
        setShowCreateForm(false);
        setNewCode({ value: 100, description: '', expires_at: '' });
        loadRedemptionCodes();
      } else {
        alert('兑换码创建失败！');
      }
    } catch (error) {
      console.error('创建兑换码失败:', error);
      alert('创建兑换码失败！');
    }
  };

  const handleDeleteCode = async (codeId: string) => {
    if (!confirm('确定要删除这个兑换码吗？')) return;

    try {
      const response = await fetch(`/api/admin/redemption-codes/${codeId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('兑换码删除成功！');
        loadRedemptionCodes();
      } else {
        alert('兑换码删除失败！');
      }
    } catch (error) {
      console.error('删除兑换码失败:', error);
      alert('删除兑换码失败！');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  const isExpired = (expiresAt?: string) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const copyCode = async (text: string) => {
    try {
      // 尝试使用现代剪贴板API
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        alert('兑换码已复制到剪贴板！');
        return;
      }

      // 降级方案：使用文档.execCommand
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);

      if (successful) {
        alert('兑换码已复制到剪贴板！');
      } else {
        // 最后的降级方案：显示兑换码让用户手动复制
        prompt('请手动复制以下兑换码：', text);
      }
    } catch (error) {
      console.error('复制失败:', error);
      // 显示兑换码让用户手动复制
      prompt('请手动复制以下兑换码：', text);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">兑换码管理</h1>
        <div className="flex space-x-4">
          <Button onClick={() => setShowCreateForm(true)}>
            创建新兑换码
          </Button>
          <Button variant="outline" onClick={loadRedemptionCodes}>
            刷新数据
          </Button>
        </div>
      </div>

      {/* 创建兑换码表单 */}
      {showCreateForm && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">创建新兑换码</h3>
          <form onSubmit={handleCreateCode} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  点数
                </label>
                <Input
                  type="number"
                  value={newCode.value}
                  onChange={(e) => setNewCode({ ...newCode, value: Number(e.target.value) })}
                  placeholder="100"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  描述
                </label>
                <Input
                  value={newCode.description}
                  onChange={(e) => setNewCode({ ...newCode, description: e.target.value })}
                  placeholder="兑换码描述"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  过期时间（可选）
                </label>
                <Input
                  type="datetime-local"
                  value={newCode.expires_at}
                  onChange={(e) => setNewCode({ ...newCode, expires_at: e.target.value })}
                />
              </div>
            </div>
            <div className="flex space-x-4">
              <Button type="submit">创建兑换码</Button>
              <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                取消
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* 兑换码列表 */}
      <Card className="p-6">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-processed-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  兑换码
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  点数
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  描述
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  创建时间
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  使用时间
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {codes.map((code) => (
                <tr key={code.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-mono font-medium text-gray-900">
                      {code.code}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 font-medium">
                      {code.value}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {code.description}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      code.is_used 
                        ? 'bg-red-100 text-red-800'
                        : isExpired(code.expires_at)
                        ? 'bg-gray-100 text-gray-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {code.is_used ? '已使用' : isExpired(code.expires_at) ? '已过期' : '可用'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(code.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {code.used_at ? formatDate(code.used_at) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyCode(code.code)}
                      >
                        复制
                      </Button>
                      {!code.is_used && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteCode(code.id)}
                        >
                          删除
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {codes.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">没有兑换码</p>
          </div>
        )}
      </Card>

      {/* 统计信息 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{codes.length}</p>
            <p className="text-sm text-gray-500">总兑换码数</p>
          </div>
        </Card>
        <Card className="p-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              {codes.filter(c => !c.is_used && !isExpired(c.expires_at)).length}
            </p>
            <p className="text-sm text-gray-500">可用兑换码</p>
          </div>
        </Card>
        <Card className="p-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">
              {codes.filter(c => c.is_used).length}
            </p>
            <p className="text-sm text-gray-500">已使用</p>
          </div>
        </Card>
        <Card className="p-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-600">
              {codes.filter(c => isExpired(c.expires_at)).length}
            </p>
            <p className="text-sm text-gray-500">已过期</p>
          </div>
        </Card>
      </div>
    </div>
  );
}








