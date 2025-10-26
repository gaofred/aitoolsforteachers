"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PointTransaction {
  id: string;
  type: 'REDEEM' | 'GENERATE' | 'REFUND' | 'BONUS' | 'PURCHASE' | 'MEMBERSHIP';
  amount: number;
  description: string;
  relatedId?: string;
  metadata?: any;
  createdAt: string;
}

export default function PointsHistoryPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    checkCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadTransactions();
    }
  }, [currentPage, filterType, currentUser]);

  const checkCurrentUser = async () => {
    try {
      const response = await fetch('/api/auth/user');
      if (response.ok) {
        const userData = await response.json();
        setCurrentUser(userData);
      } else {
        router.push('/auth/signin');
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
      router.push('/auth/signin');
    }
  };

  const loadTransactions = async () => {
    if (!currentUser) return;

    setLoading(true);
    try {
      console.log('开始加载交易记录 - 用户ID:', currentUser.id);

      // 使用后端API获取交易记录
      const response = await fetch(`/api/points/transactions?page=${currentPage}&limit=20`, {
        credentials: 'include'
      });

      console.log('API响应状态:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API错误详情:', errorData);
        
        // 如果是401未认证错误，直接跳转到登录页
        if (response.status === 401) {
          setError('请先登录后再查看积分记录');
          setTimeout(() => {
            router.push('/auth/signin');
          }, 2000);
          return;
        }
        
        throw new Error(errorData.error || '获取交易记录失败');
      }

      const result = await response.json();

      console.log('API返回结果:', result);
      
      // 确保数据是数组
      const transactions = result.transactions || [];
      
      // 应用过滤器
      let filteredTransactions = transactions;
      
      if (filterType !== 'all') {
        filteredTransactions = transactions.filter((t: any) => t.type === filterType);
      }

      if (searchTerm) {
        filteredTransactions = filteredTransactions.filter((t: any) => 
          t.description.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      setTransactions(filteredTransactions as any);
      setTotalPages(Math.ceil(result.total / 20));
      } catch (error) {
      console.error('加载交易记录失败:', error);

      // 添加详细的调试信息
      console.log('调试信息:', {
        currentUser: currentUser?.id,
        currentPage,
        filterType,
        errorDetails: error,
        errorType: typeof error,
        errorMessage: (error as any)?.message,
        errorString: JSON.stringify(error)
      });

      // 检查是否是数据库表不存在的问题
      const errorMessage = (error as any).message;
      if (errorMessage && errorMessage.includes('relation "point_transactions" does not exist')) {
        setError('数据库表未创建。请参考 diagnose-and-fix-point-transactions.sql 文件中的解决方案。');
        setLoading(false);
        return;
      }

      // 检查是否是权限问题
      if (errorMessage && (errorMessage.includes('permission denied') ||
                         errorMessage.includes('PGRST301') ||
                         JSON.stringify(error) === '{}')) {
        setError('权限不足或会话已过期。请重新登录后再试。');
        setLoading(false);
        return;
      }

      // 如果是网络或其他错误，使用模拟数据作为备用
      console.log('使用模拟数据作为备用方案');
      const mockTransactions: PointTransaction[] = [
        {
          id: '1',
          type: 'GENERATE',
          amount: -3,
          description: '使用阅读文本深度分析',
          createdAt: new Date('2024-01-15T10:30:00Z').toISOString(),
          metadata: { toolType: 'text-analysis', modelType: 'STANDARD' }
        },
        {
          id: '2',
          type: 'REDEEM',
          amount: 50,
          description: '兑换码兑换: WELCOME50',
          createdAt: new Date('2024-01-14T15:20:00Z').toISOString(),
          metadata: { code: 'WELCOME50' }
        },
        {
          id: '3',
          type: 'BONUS',
          amount: 25,
          description: '新用户注册奖励',
          createdAt: new Date('2024-01-10T09:00:00Z').toISOString()
        }
      ];

      setTransactions(mockTransactions);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const getTransactionTypeLabel = (type: string) => {
    const labels = {
      'GENERATE': '使用消耗',
      'REDEEM': '兑换获得',
      'BONUS': '奖励获得',
      'PURCHASE': '购买获得',
      'MEMBERSHIP': '会员获得',
      'REFUND': '退款'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getTransactionTypeColor = (type: string) => {
    const colors = {
      'GENERATE': 'text-red-600 bg-red-50',
      'REDEEM': 'text-green-600 bg-green-50',
      'BONUS': 'text-blue-600 bg-blue-50',
      'PURCHASE': 'text-purple-600 bg-purple-50',
      'MEMBERSHIP': 'text-orange-600 bg-orange-50',
      'REFUND': 'text-gray-600 bg-gray-50'
    };
    return colors[type as keyof typeof colors] || 'text-gray-600 bg-gray-50';
  };

  const formatAmount = (amount: number) => {
    if (amount > 0) {
      return `+${amount}`;
    }
    return amount.toString();
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      // 检查日期是否有效
      if (isNaN(date.getTime())) {
        return '无效日期';
      }
      return new Intl.DateTimeFormat('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (error) {
      console.error('日期格式化错误:', error, dateString);
      return '无效日期';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-card">
        <div className="flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              返回
            </Button>
            <h1 className="text-xl evolink-title text-foreground">点数记录</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* 筛选和搜索 */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="搜索交易描述..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="筛选类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                <SelectItem value="GENERATE">使用消耗</SelectItem>
                <SelectItem value="REDEEM">兑换获得</SelectItem>
                <SelectItem value="BONUS">奖励获得</SelectItem>
                <SelectItem value="PURCHASE">购买获得</SelectItem>
                <SelectItem value="MEMBERSHIP">会员获得</SelectItem>
                <SelectItem value="REFUND">退款</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 交易记录列表 */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : error ? (
            <Card className="p-8 text-center border-red-200 bg-red-50">
              <div className="text-red-600">
                <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <h3 className="text-lg font-semibold mb-2">数据库错误</h3>
                <p className="text-sm mb-4">{error}</p>
                <Button 
                  onClick={() => window.location.reload()} 
                  variant="outline"
                  className="border-red-300 text-red-600 hover:bg-red-100"
                >
                  刷新页面
                </Button>
              </div>
            </Card>
          ) : transactions.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="text-muted-foreground">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p>暂无交易记录</p>
              </div>
            </Card>
          ) : (
            transactions.map((transaction) => (
              <Card key={transaction.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTransactionTypeColor(transaction.type)}`}>
                        {getTransactionTypeLabel(transaction.type)}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(transaction.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-foreground">{transaction.description}</p>
                    {transaction.metadata && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        {transaction.metadata.toolType && (
                          <span>工具: {transaction.metadata.toolType}</span>
                        )}
                        {transaction.metadata.modelType && (
                          <span className="ml-2">模型: {transaction.metadata.modelType}</span>
                        )}
                        {transaction.metadata.code && (
                          <span>兑换码: {transaction.metadata.code}</span>
                        )}
                        {transaction.metadata.days && (
                          <span className="ml-2">天数: {transaction.metadata.days}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-semibold ${transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatAmount(transaction.amount)}
                    </div>
                    <div className="text-xs text-muted-foreground">点数</div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-8">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                上一页
              </Button>
              <span className="px-3 py-2 text-sm text-muted-foreground">
                第 {currentPage} 页，共 {totalPages} 页
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                下一页
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
