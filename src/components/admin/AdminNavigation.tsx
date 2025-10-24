"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";

const navigation = [
  { name: '仪表板', href: '/admin-7654', icon: '📊' },
  { name: '用户管理', href: '/admin-7654/users', icon: '👥' },
  { name: '兑换码管理', href: '/admin-7654/redemption-codes', icon: '🎫' },
];

export default function AdminNavigation() {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    // 获取当前登录用户信息
    fetch('/api/admin/auth')
      .then(response => response.json())
      .then(data => {
        if (data.authenticated) {
          setCurrentUser(data.user);
        }
      })
      .catch(error => {
        console.error('获取用户信息失败:', error);
      });
  }, []);

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/admin-7654" className="text-xl font-bold text-gray-900">
                管理员控制台
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      isActive
                        ? 'border-blue-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    <span className="mr-2">{item.icon}</span>
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {currentUser && (
              <span className="text-sm text-gray-600">
                欢迎, {currentUser.username}
              </span>
            )}
            <Link href="/">
              <Button variant="outline" size="sm">
                返回首页
              </Button>
            </Link>
            <Button 
              variant="outline" 
              size="sm"
              onClick={async () => {
                try {
                  await fetch('/api/admin/auth', { method: 'DELETE' });
                  window.location.href = '/admin-7654/login';
                } catch (error) {
                  console.error('退出登录失败:', error);
                }
              }}
            >
              退出登录
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
