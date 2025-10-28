"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { createClient } from '@/lib/supabase';

export default function TestRedeemPage() {
  const [code, setCode] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const supabase = mounted ? createClient() : null;

  // 检查用户登录状态
  const checkUser = async () => {
    if (!supabase) return null;
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    return user;
  };

  // 测试兑换码
  const testRedeem = async () => {
    setLoading(true);
    setResult(null);

    try {
      const currentUser = await checkUser();
      if (!currentUser) {
        setResult({ success: false, error: '用户未登录，请先登录' });
        return;
      }

      console.log('🧪 测试兑换码:', code);
      console.log('👤 用户ID:', currentUser.id);

      const response = await fetch('/api/redemption-codes/use', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: code.trim() }),
      });

      const data = await response.json();
      console.log('📤 兑换结果:', data);

      setResult(data);

    } catch (error) {
      console.error('❌ 兑换失败:', error);
      setResult({ success: false, error: `网络错误: ${error instanceof Error ? error.message : '未知错误'}` });
    } finally {
      setLoading(false);
    }
  };

  // 获取用户点数信息
  const getUserPoints = async () => {
    try {
      const currentUser = await checkUser();
      if (!currentUser) return null;

      const response = await fetch('/api/auth/user');
      const data = await response.json();

      if (data.user_points) {
        return {
          points: data.user_points.points,
          is_member: data.user_points.is_member,
          membership_expires_at: data.user_points.membership_expires_at,
          daily_points: data.user_points.daily_points
        };
      }
      return null;
    } catch (error) {
      console.error('获取用户点数失败:', error);
      return null;
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 flex items-center justify-center">
        <div className="text-gray-600">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">兑换码测试页面</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 兑换码测试表单 */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">测试兑换码</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  兑换码
                </label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="请输入兑换码"
                  className="font-mono"
                />
              </div>

              <Button
                onClick={testRedeem}
                disabled={loading || !code.trim()}
                className="w-full"
              >
                {loading ? '兑换中...' : '测试兑换'}
              </Button>

              {/* 用户状态 */}
              <div className="mt-6 p-4 bg-gray-50 rounded-md">
                <h3 className="font-medium mb-2">用户状态</h3>
                {user ? (
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>✅ 已登录: {user.email}</div>
                    <div>用户ID: {user.id}</div>
                  </div>
                ) : (
                  <div className="text-sm text-red-600">❌ 未登录</div>
                )}
              </div>
            </div>
          </Card>

          {/* 测试结果 */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">测试结果</h2>

            {result ? (
              <div className="space-y-4">
                <div className={`p-4 rounded-md ${
                  result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}>
                  <div className={`font-medium ${
                    result.success ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {result.success ? '✅ 兑换成功' : '❌ 兑换失败'}
                  </div>
                  <div className={`text-sm mt-1 ${
                    result.success ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {result.message || result.error}
                  </div>
                </div>

                {result.data && (
                  <div className="p-4 bg-blue-50 rounded-md">
                    <h3 className="font-medium text-blue-800 mb-2">详细信息:</h3>
                    <pre className="text-xs text-blue-600 whitespace-pre-wrap">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-gray-500 text-center py-8">
                请输入兑换码进行测试
              </div>
            )}
          </Card>
        </div>

        {/* 测试兑换码列表 */}
        <Card className="mt-6 p-6">
          <h2 className="text-xl font-semibold mb-4">可用测试兑换码</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="p-3 bg-gray-50 rounded-md">
              <div className="font-medium text-gray-900">点数兑换码</div>
              <div className="font-mono text-blue-600 mt-1">YJ44BB3I</div>
              <div className="text-gray-500 mt-1">100点数</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-md">
              <div className="font-medium text-gray-900">会员天数兑换码</div>
              <div className="font-mono text-green-600 mt-1">L0FYH7UY</div>
              <div className="text-gray-500 mt-1">Premium会员7天</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-md">
              <div className="font-medium text-gray-900">会员套餐兑换码</div>
              <div className="font-mono text-purple-600 mt-1">RBWTQDA1</div>
              <div className="text-gray-500 mt-1">Pro会员30天</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}