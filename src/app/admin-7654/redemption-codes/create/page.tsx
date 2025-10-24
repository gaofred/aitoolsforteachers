"use client";

import { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Link from 'next/link';

export default function CreateRedemptionCodePage() {
  const [formData, setFormData] = useState({
    points: 100,
    description: '',
    expires_at: '',
    count: 1
  });
  const [loading, setLoading] = useState(false);
  const [createdCodes, setCreatedCodes] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/admin/redemption-codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        setCreatedCodes(data.codes || []);
        alert('兑换码创建成功！');
      } else {
        alert('兑换码创建失败！');
      }
    } catch (error) {
      console.error('创建兑换码失败:', error);
      alert('创建兑换码失败！');
    } finally {
      setLoading(false);
    }
  };

  const copyAllCodes = () => {
    const codesText = createdCodes.join('\n');
    navigator.clipboard.writeText(codesText);
    alert('所有兑换码已复制到剪贴板！');
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    alert('兑换码已复制到剪贴板！');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">创建兑换码</h1>
        <Link href="/admin-7654/redemption-codes">
          <Button variant="outline">返回列表</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 创建表单 */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">创建新兑换码</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                点数 *
              </label>
              <Input
                type="number"
                value={formData.points}
                onChange={(e) => setFormData({ ...formData, points: Number(e.target.value) })}
                placeholder="100"
                min="1"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                描述 *
              </label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="兑换码描述，例如：新用户奖励、活动奖励等"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                过期时间（可选）
              </label>
              <Input
                type="datetime-local"
                value={formData.expires_at}
                onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
              />
              <p className="text-xs text-gray-500 mt-1">
                留空表示永不过期
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                生成数量 *
              </label>
              <Input
                type="number"
                value={formData.count}
                onChange={(e) => setFormData({ ...formData, count: Number(e.target.value) })}
                placeholder="1"
                min="1"
                max="100"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                最多一次生成100个兑换码
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '创建中...' : '创建兑换码'}
            </Button>
          </form>
        </Card>

        {/* 创建结果 */}
        {createdCodes.length > 0 && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">创建的兑换码</h3>
              <Button onClick={copyAllCodes} size="sm">
                复制全部
              </Button>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {createdCodes.map((code, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <code className="font-mono text-sm">{code}</code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyCode(code)}
                  >
                    复制
                  </Button>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-blue-50 rounded-md">
              <p className="text-sm text-blue-800">
                <strong>提示：</strong>请妥善保存这些兑换码，它们只能使用一次。
              </p>
            </div>
          </Card>
        )}
      </div>

      {/* 使用说明 */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">使用说明</h3>
        <div className="space-y-3 text-sm text-gray-600">
          <div className="flex items-start space-x-2">
            <span className="text-blue-600">•</span>
            <p>兑换码创建后立即生效，用户可以在个人中心使用</p>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-blue-600">•</span>
            <p>每个兑换码只能使用一次，使用后自动失效</p>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-blue-600">•</span>
            <p>可以设置过期时间，过期后兑换码自动失效</p>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-blue-600">•</span>
            <p>建议为兑换码添加有意义的描述，便于管理</p>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-blue-600">•</span>
            <p>批量创建时，每个兑换码都是唯一的</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

