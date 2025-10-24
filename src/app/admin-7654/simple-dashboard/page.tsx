"use client";

import { useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  name?: string;
  created_at: string;
  points: number;
  membership_type?: string;
}

interface RedemptionCode {
  id: string;
  code: string;
  points: number;
  description: string;
  created_at: string;
  is_used: boolean;
}

export default function SimpleAdminDashboard() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [codes, setCodes] = useState<RedemptionCode[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTransactions: 0,
    totalPoints: 0,
    activeUsers: 0
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/admin/auth');
      if (response.ok) {
        const data = await response.json();
        if (data.authenticated) {
          setCurrentUser(data.user);
          loadDashboardData();
        } else {
          window.location.href = '/admin-7654/simple-login';
        }
      } else {
        window.location.href = '/admin-7654/simple-login';
      }
    } catch (error) {
      console.error('检查认证失败:', error);
      window.location.href = '/admin-7654/simple-login';
    }
  };

  const loadDashboardData = async () => {
    try {
      // 加载统计数据
      const statsResponse = await fetch('/api/admin/stats');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      // 加载用户数据
      const usersResponse = await fetch('/api/admin/users');
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setUsers(usersData.users || []);
      }

      // 加载兑换码数据
      const codesResponse = await fetch('/api/admin/redemption-codes');
      if (codesResponse.ok) {
        const codesData = await codesResponse.json();
        setCodes(codesData.codes || []);
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth', { method: 'DELETE' });
      window.location.href = '/admin-7654/simple-login';
    } catch (error) {
      console.error('退出登录失败:', error);
    }
  };

  const createRedemptionCode = async () => {
    const points = prompt('请输入点数:');
    const description = prompt('请输入描述:');
    
    if (points && description) {
      try {
        const response = await fetch('/api/admin/redemption-codes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            points: Number(points),
            description: description,
            count: 1
          }),
        });

        if (response.ok) {
          alert('兑换码创建成功！');
          loadDashboardData();
        } else {
          alert('兑换码创建失败！');
        }
      } catch (error) {
        console.error('创建兑换码失败:', error);
        alert('创建兑换码失败！');
      }
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#f9fafb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          fontSize: '18px',
          color: '#6b7280'
        }}>
          加载中...
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f9fafb',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* 顶部导航 */}
      <div style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '16px 0'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h1 style={{
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#111827',
            margin: 0
          }}>
            管理员控制台
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {currentUser && (
              <span style={{ fontSize: '14px', color: '#6b7280' }}>
                欢迎, {currentUser.username}
              </span>
            )}
            <button
              onClick={handleLogout}
              style={{
                padding: '8px 16px',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              退出登录
            </button>
          </div>
        </div>
      </div>

      {/* 标签导航 */}
      <div style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 20px',
          display: 'flex',
          gap: '32px'
        }}>
          {[
            { id: 'dashboard', label: '仪表板' },
            { id: 'users', label: '用户管理' },
            { id: 'codes', label: '兑换码管理' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '16px 0',
                border: 'none',
                backgroundColor: 'transparent',
                borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
                color: activeTab === tab.id ? '#3b82f6' : '#6b7280',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: activeTab === tab.id ? '500' : '400'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 内容区域 */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '32px 20px'
      }}>
        {activeTab === 'dashboard' && (
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '24px', color: '#111827' }}>
              系统统计
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '20px',
              marginBottom: '32px'
            }}>
              <div style={{
                backgroundColor: 'white',
                padding: '24px',
                borderRadius: '8px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#3b82f6' }}>
                  {stats.totalUsers}
                </div>
                <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
                  总用户数
                </div>
              </div>
              <div style={{
                backgroundColor: 'white',
                padding: '24px',
                borderRadius: '8px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#10b981' }}>
                  {stats.totalTransactions}
                </div>
                <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
                  总交易数
                </div>
              </div>
              <div style={{
                backgroundColor: 'white',
                padding: '24px',
                borderRadius: '8px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#f59e0b' }}>
                  {stats.totalPoints}
                </div>
                <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
                  总点数
                </div>
              </div>
              <div style={{
                backgroundColor: 'white',
                padding: '24px',
                borderRadius: '8px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#8b5cf6' }}>
                  {stats.activeUsers}
                </div>
                <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
                  活跃用户
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '24px', color: '#111827' }}>
              用户管理
            </h2>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f9fafb' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                      用户信息
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                      点数
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                      会员类型
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                      注册时间
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                          {user.name || '未设置姓名'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>
                          {user.email}
                        </div>
                      </td>
                      <td style={{ padding: '12px', fontSize: '14px', color: '#111827' }}>
                        {user.points || 0}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          backgroundColor: user.membership_type === 'premium' ? '#fef3c7' : '#e5e7eb',
                          color: user.membership_type === 'premium' ? '#92400e' : '#374151'
                        }}>
                          {user.membership_type === 'premium' ? '高级会员' : '普通用户'}
                        </span>
                      </td>
                      <td style={{ padding: '12px', fontSize: '14px', color: '#6b7280' }}>
                        {new Date(user.created_at).toLocaleDateString('zh-CN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'codes' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', margin: 0 }}>
                兑换码管理
              </h2>
              <button
                onClick={createRedemptionCode}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                创建兑换码
              </button>
            </div>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f9fafb' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                      兑换码
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                      点数
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                      描述
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                      状态
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                      创建时间
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {codes.map((code) => (
                    <tr key={code.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px', fontFamily: 'monospace', fontSize: '14px', color: '#111827' }}>
                        {code.code}
                      </td>
                      <td style={{ padding: '12px', fontSize: '14px', color: '#111827' }}>
                        {code.points}
                      </td>
                      <td style={{ padding: '12px', fontSize: '14px', color: '#111827' }}>
                        {code.description}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          backgroundColor: code.is_used ? '#fee2e2' : '#d1fae5',
                          color: code.is_used ? '#991b1b' : '#065f46'
                        }}>
                          {code.is_used ? '已使用' : '可用'}
                        </span>
                      </td>
                      <td style={{ padding: '12px', fontSize: '14px', color: '#6b7280' }}>
                        {new Date(code.created_at).toLocaleDateString('zh-CN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
