"use client";

import { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function CreateAdminUserPage() {
  const [formData, setFormData] = useState({
    email: '17687027169@163.com',
    password: '',
    name: '管理员'
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/admin/user-management', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        setMessage(`✅ ${data.message}`);
        setTimeout(() => {
          router.push('/admin-7654/login');
        }, 2000);
      } else {
        const errorData = await response.json();
        setMessage(`❌ ${errorData.error}`);
      }
    } catch (error) {
      console.error('创建用户失败:', error);
      setMessage('❌ 创建用户失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-gray-900">
            创建管理员用户账号
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            在用户系统中创建管理员邮箱账号
          </p>
        </div>

        <Card className="py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {message && (
            <div className={`mb-6 p-4 rounded-md text-sm ${
              message.includes('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}>
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                邮箱地址 *
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="请输入邮箱地址"
                required
                disabled
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
              />
              <p className="text-xs text-gray-500 mt-1">
                邮箱已预设为管理员邮箱
              </p>
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                用户名 *
              </label>
              <Input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="请输入用户名"
                required
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                密码 *
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="请输入密码（至少6位）"
                required
                minLength={6}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md"
              />
              <p className="text-xs text-gray-500 mt-1">
                密码将用于Supabase用户系统
              </p>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !formData.password}
            >
              {loading ? '创建中...' : '创建管理员用户'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/admin-7654/login">
              <Button variant="outline" className="w-full">
                返回登录
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}