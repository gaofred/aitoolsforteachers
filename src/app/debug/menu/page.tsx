"use client";

import { useState, useEffect } from 'react';
import { UserMenu } from '@/components/auth/UserMenu';
import { useUser } from '@/lib/user-context';

export default function DebugMenuPage() {
  const { currentUser } = useUser();
  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    // 调试用户状态
    setDebugInfo({
      currentUser,
      hasUser: !!currentUser,
      userId: currentUser?.id,
      userName: currentUser?.name,
      userEmail: currentUser?.email,
      userRole: currentUser?.role,
      timestamp: new Date().toISOString()
    });

    console.log('🔍 调试页面 - 用户状态:', {
      currentUser,
      hasUser: !!currentUser,
      userId: currentUser?.id,
      userName: currentUser?.name,
      userEmail: currentUser?.email,
      userRole: currentUser?.role
    });
  }, [currentUser]);

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">用户菜单调试页面</h1>

      {/* 调试信息 */}
      <div className="bg-gray-100 p-4 rounded-lg mb-6">
        <h2 className="text-lg font-semibold mb-3">调试信息</h2>
        <pre className="text-sm bg-white p-3 rounded border overflow-auto">
          {JSON.stringify(debugInfo, null, 2)}
        </pre>
      </div>

      {/* 用户状态 */}
      <div className="bg-blue-50 p-4 rounded-lg mb-6">
        <h2 className="text-lg font-semibold mb-3">用户状态</h2>
        <div className="space-y-2">
          <p><strong>用户存在:</strong> {currentUser ? '是' : '否'}</p>
          <p><strong>用户ID:</strong> {currentUser?.id || '无'}</p>
          <p><strong>用户名:</strong> {currentUser?.name || '无'}</p>
          <p><strong>邮箱:</strong> {currentUser?.email || '无'}</p>
          <p><strong>角色:</strong> {currentUser?.role || '无'}</p>
        </div>
      </div>

      {/* 用户菜单 */}
      <div className="bg-green-50 p-4 rounded-lg mb-6">
        <h2 className="text-lg font-semibold mb-3">用户菜单组件</h2>
        <div className="border-2 border-dashed border-green-300 p-4 rounded">
          {currentUser ? (
            <div>
              <p className="text-sm text-green-600 mb-3">✅ 用户已登录，显示用户菜单:</p>
              <UserMenu />
            </div>
          ) : (
            <p className="text-sm text-red-600">❌ 用户未登录，无法显示用户菜单</p>
          )}
        </div>
      </div>

      {/* 测试导航 */}
      <div className="bg-yellow-50 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-3">测试导航</h2>
        <div className="space-x-4">
          <button
            onClick={() => window.location.href = '/invite'}
            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
          >
            直接跳转到邀请页面
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            返回主页
          </button>
        </div>
      </div>
    </div>
  );
}