// @ts-nocheck
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface PointTransaction {
  id: string;
  type: 'REDEEM' | 'GENERATE' | 'REFUND' | 'BONUS' | 'PURCHASE' | 'MEMBERSHIP';
  amount: number;
  description: string;
  relatedId?: string;
  metadata?: any;
  createdAt: string;
}

export interface AIToolConfig {
  id: string;
  toolType: string;
  toolName: string;
  description: string;
  category: string;
  standardCost: number;
  proCost?: number;
  isProOnly: boolean;
  isActive: boolean;
}

export class PointsService {
  /**
   * 获取用户当前点数
   */
  static async getUserPoints(userId: string): Promise<number> {
    const { data: userPoints, error } = await supabase
      .from('user_points')
      .select('points')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('获取用户点数失败:', error);
      return 0;
    }

    return (userPoints as any)?.points || 0;
  }

  /**
   * 扣除用户点数
   */
  static async deductPoints(
    userId: string,
    amount: number,
    description: string,
    relatedId?: string,
    metadata?: any
  ): Promise<boolean> {
    try {
      // 使用 Supabase 的存储过程来处理点数扣除和交易记录
      const { data, error } = await supabase.rpc('add_user_points', {
        p_user_id: userId,
        p_amount: -amount,
        p_type: 'GENERATE',
        p_description: description,
        p_related_id: relatedId
      });

      if (error) {
        console.error('扣除点数失败:', error);
        return false;
      }

      return data;
    } catch (error) {
      console.error('扣除点数异常:', error);
      return false;
    }
  }

  /**
   * 增加用户点数
   */
  static async addPoints(
    userId: string,
    amount: number,
    type: 'REDEEM' | 'BONUS' | 'PURCHASE' | 'MEMBERSHIP',
    description: string,
    relatedId?: string,
    metadata?: any
  ): Promise<boolean> {
    try {
      // 使用 Supabase 的存储过程来处理点数增加和交易记录
      const { data, error } = await supabase.rpc('add_user_points', {
        p_user_id: userId,
        p_amount: amount,
        p_type: type,
        p_description: description,
        p_related_id: relatedId
      });

      if (error) {
        console.error('增加点数失败:', error);
        return false;
      }

      return data;
    } catch (error) {
      console.error('增加点数异常:', error);
      return false;
    }
  }

  /**
   * 获取用户点数交易记录
   */
  static async getPointTransactions(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ transactions: PointTransaction[], total: number }> {
    try {
      const offset = (page - 1) * limit;

      // 获取交易记录
      const { data: transactions, error: transactionsError } = await supabase
        .from('point_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      // 获取总数
      const { count, error: countError } = await supabase
        .from('point_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (transactionsError || countError) {
        console.error('获取交易记录失败:', { transactionsError, countError });
        return { transactions: [], total: 0 };
      }

      return {
        transactions: (transactions || []).map(t => ({
          id: t.id,
          type: t.type,
          amount: t.amount,
          description: t.description,
          relatedId: t.related_id,
          metadata: t.metadata,
          createdAt: t.created_at
        })),
        total: count || 0
      };
    } catch (error) {
      console.error('获取交易记录异常:', error);
      return { transactions: [], total: 0 };
    }
  }
}







