"use client";

import { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from 'next/link';

type RedemptionCodeType = 'POINTS' | 'MEMBERSHIP_DAYS' | 'MEMBERSHIP';

export default function CreateRedemptionCodePage() {
  const [formData, setFormData] = useState({
    type: 'POINTS' as RedemptionCodeType,
    points: 100,
    membership_type: 'PREMIUM' as 'PREMIUM' | 'PRO',
    membership_days: 30,
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
            {/* 兑换码类型选择 */}
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-3">
                兑换码类型 *
              </Label>
              <RadioGroup
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value as RedemptionCodeType })}
                className="flex flex-col space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="POINTS" id="points" />
                  <Label htmlFor="points" className="font-normal cursor-pointer">
                    <span className="font-medium">点数兑换码</span>
                    <span className="text-gray-500 ml-2">用户兑换后获得指定点数</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="MEMBERSHIP_DAYS" id="membership-days" />
                  <Label htmlFor="membership-days" className="font-normal cursor-pointer">
                    <span className="font-medium">会员天数兑换码</span>
                    <span className="text-gray-500 ml-2">用户兑换后获得指定天数的会员</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="MEMBERSHIP" id="membership" />
                  <Label htmlFor="membership" className="font-normal cursor-pointer">
                    <span className="font-medium">会员套餐兑换码</span>
                    <span className="text-gray-500 ml-2">用户兑换后获得完整会员套餐</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* 根据类型显示不同配置 */}
            {formData.type === 'POINTS' && (
              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-1">
                  点数 *
                </Label>
                <Input
                  type="number"
                  value={formData.points}
                  onChange={(e) => setFormData({ ...formData, points: Number(e.target.value) })}
                  placeholder="100"
                  min="1"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  用户兑换后获得的点数
                </p>
              </div>
            )}

            {(formData.type === 'MEMBERSHIP_DAYS' || formData.type === 'MEMBERSHIP') && (
              <>
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-1">
                    会员类型 *
                  </Label>
                  <Select
                    value={formData.membership_type}
                    onValueChange={(value) => setFormData({ ...formData, membership_type: value as 'PREMIUM' | 'PRO' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PREMIUM">
                        <div>
                          <div className="font-medium">Premium会员</div>
                          <div className="text-sm text-gray-500">每日500点数</div>
                        </div>
                      </SelectItem>
                      <SelectItem value="PRO">
                        <div>
                          <div className="font-medium">Pro会员</div>
                          <div className="text-sm text-gray-500">每日800点数</div>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    用户兑换后获得的会员类型
                  </p>
                </div>

                {formData.type === 'MEMBERSHIP_DAYS' && (
                  <div>
                    <Label className="block text-sm font-medium text-gray-700 mb-1">
                      会员天数 *
                    </Label>
                    <Input
                      type="number"
                      value={formData.membership_days}
                      onChange={(e) => setFormData({ ...formData, membership_days: Number(e.target.value) })}
                      placeholder="30"
                      min="1"
                      max="1000"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      会员有效天数（1-1000天）
                    </p>
                  </div>
                )}

                <div className="p-3 bg-blue-50 rounded-md">
                  <p className="text-sm text-blue-800">
                    <strong>注意：</strong>
                    {formData.type === 'MEMBERSHIP_DAYS'
                      ? '会员天数兑换码用户兑换后立即获得会员身份和对应点数（PREMIUM:500点，PRO:800点）'
                      : '会员套餐兑换码用户兑换后获得完整30天会员身份和对应点数（PREMIUM:500点，PRO:800点）'
                    }
                  </p>
                </div>
              </>
            )}

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
        <div className="space-y-4 text-sm text-gray-600">
          <div className="space-y-3">
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

          {/* 不同类型兑换码说明 */}
          <div className="border-t pt-4">
            <h4 className="font-medium text-gray-900 mb-3">兑换码类型说明</h4>

            <div className="space-y-4">
              {/* 点数兑换码 */}
              <div className="p-3 bg-gray-50 rounded-md">
                <div className="flex items-center mb-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                  <span className="font-medium text-gray-900">点数兑换码</span>
                </div>
                <p className="text-gray-600 mb-2">用户兑换后直接获得指定数量的点数，可用于AI功能消费。</p>
                <div className="text-xs text-gray-500">
                  <strong>适用场景：</strong>新用户奖励、活动奖励、补偿发放等
                </div>
              </div>

              {/* 会员天数兑换码 */}
              <div className="p-3 bg-gray-50 rounded-md">
                <div className="flex items-center mb-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <span className="font-medium text-gray-900">会员天数兑换码</span>
                </div>
                <p className="text-gray-600 mb-2">用户兑换后获得指定天数的会员身份，每日自动重置点数。</p>
                <div className="text-xs text-gray-500 space-y-1">
                  <div><strong>适用场景：</strong>会员体验活动、限时福利、特殊奖励</div>
                  <div><strong>立即生效：</strong>兑换后立即获得会员身份和当日点数（PREMIUM:500点，PRO:800点）</div>
                </div>
              </div>

              {/* 会员套餐兑换码 */}
              <div className="p-3 bg-gray-50 rounded-md">
                <div className="flex items-center mb-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                  <span className="font-medium text-gray-900">会员套餐兑换码</span>
                </div>
                <p className="text-gray-600 mb-2">用户兑换后获得完整30天会员套餐，享受全部会员特权。</p>
                <div className="text-xs text-gray-500 space-y-1">
                  <div><strong>适用场景：</strong>高级奖励、推广活动、合作伙伴福利</div>
                  <div><strong>包含内容：</strong>30天会员身份 + 每日点数重置（PREMIUM:500点，PRO:800点）</div>
                </div>
              </div>
            </div>
          </div>

          {/* 注意事项 */}
          <div className="border-t pt-4">
            <h4 className="font-medium text-gray-900 mb-2">注意事项</h4>
            <div className="space-y-2 text-xs text-gray-500">
              <div>• 会员兑换码用户兑换后会立即重置当日点数到对应会员标准</div>
              <div>• 会员身份到期后自动转为免费用户，点数重置为25点/天</div>
              <div>• 请根据实际需求选择合适的兑换码类型，避免资源浪费</div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

