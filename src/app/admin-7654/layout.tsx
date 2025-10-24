"use client";

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import AdminNavigation from '@/components/admin/AdminNavigation';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/admin/auth');
      if (response.ok) {
        const data = await response.json();
        setAuthenticated(data.authenticated);
        if (!data.authenticated && !pathname.includes('/login')) {
          router.push('/admin-7654/login');
        }
      } else if (!pathname.includes('/login')) {
        router.push('/admin-7654/login');
      }
    } catch (error) {
      console.error('检查管理员身份失败:', error);
      if (!pathname.includes('/login')) {
        router.push('/admin-7654/login');
      }
    } finally {
      setLoading(false);
    }
  };

  // 如果是登录页面，直接渲染children，不需要认证检查
  if (pathname.includes('/login')) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!authenticated) {
    return null; // 重定向到登录页面
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </div>
    </div>
  );
}
