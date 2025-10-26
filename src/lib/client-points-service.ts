// @ts-nocheck
import { supabase } from './supabase';
import { Database } from '@/types/database';

// 定义类型
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
  tool_type: string;
  tool_name: string;
  description: string;
  category: string;
  standard_cost: number;
  pro_cost?: number;
  is_pro_only: boolean;
  is_active: boolean;
}

export interface UserPoints {
  id: string;
  user_id: string;
  points: number;
  updated_at: string;
}

export class ClientPointsService {
  /**
   * 获取用户当前点数
   */
  static async getUserPoints(userId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('user_points')
        .select('points')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('获取用户点数失败:', {
          error: error,
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        return 0;
      }

      return data?.points || 0;
    } catch (error) {
      console.error('获取用户点数异常:', error);
      return 0;
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

      console.log('开始获取交易记录:', { userId, page, limit, offset });

      // 检查用户ID是否有效
      if (!userId || userId === 'undefined' || userId === 'null') {
        console.error('无效的用户ID:', userId);
        return { transactions: [], total: 0 };
      }

      // 获取交易记录
      const { data: transactions, error: transactionsError } = await supabase
        .from('point_transactions')
        .select('*, created_at as createdAt')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      console.log('交易记录查询结果:', {
        transactionsLength: transactions?.length || 0,
        hasTransactions: !!transactions,
        transactionsError: transactionsError,
        errorString: JSON.stringify(transactionsError),
        errorType: typeof transactionsError,
        errorKeys: transactionsError ? Object.keys(transactionsError) : []
      });

      if (transactionsError) {
        const errorInfo = {
          error: transactionsError,
          message: transactionsError.message || '未知错误',
          details: transactionsError.details || null,
          hint: transactionsError.hint || null,
          code: transactionsError.code || null,
          toString: transactionsError.toString?.() || '错误对象无toString方法',
          errorType: typeof transactionsError,
          keys: transactionsError ? Object.keys(transactionsError) : [],
          jsonString: JSON.stringify(transactionsError),
          isAuthError: 'code' in transactionsError && transactionsError.code === 'PGRST301',
          isPermissionError: 'message' in transactionsError && transactionsError.message?.includes('permission denied'),
          isEmptyObject: JSON.stringify(transactionsError) === '{}'
        };

        console.error('获取交易记录失败:', errorInfo);

        // 如果是权限问题，返回空结果
        if (errorInfo.isAuthError || errorInfo.isPermissionError || errorInfo.isEmptyObject) {
          console.log('检测到权限问题或空错误对象，返回空结果');
          return { transactions: [], total: 0 };
        }

        return { transactions: [], total: 0 };
      }

      // 获取总数
      const { count, error: countError } = await supabase
        .from('point_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (countError) {
        console.error('获取交易记录总数失败:', {
          error: countError,
          message: countError.message,
          details: countError.details,
          hint: countError.hint,
          code: countError.code
        });
        return {
          transactions: transactions || [],
          total: 0
        };
      }

      return {
        transactions: transactions || [],
        total: count || 0
      };
    } catch (error) {
      console.error('获取交易记录异常:', error);
      return { transactions: [], total: 0 };
    }
  }

  /**
   * 获取AI工具配置
   */
  static async getAIToolConfig(toolType: string): Promise<AIToolConfig | null> {
    try {
      const { data, error } = await supabase
        .from('ai_tool_configs')
        .select('*')
        .eq('tool_type', toolType)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('获取AI工具配置失败:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('获取AI工具配置异常:', error);
      return null;
    }
  }

  /**
   * 获取所有AI工具配置
   */
  static async getAllAIToolConfigs(): Promise<AIToolConfig[]> {
    try {
      const { data, error } = await supabase
        .from('ai_tool_configs')
        .select('*')
        .eq('is_active', true)
        .order('category');

      if (error) {
        console.error('获取AI工具配置列表失败:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('获取AI工具配置列表异常:', error);
      return [];
    }
  }

  /**
   * 计算工具使用费用
   */
  static async calculateToolCost(
    toolType: string,
    isProUser: boolean = false
  ): Promise<number> {
    try {
      const config = await this.getAIToolConfig(toolType);
      if (!config) return 0;

      if (config.is_pro_only && !isProUser) {
        throw new Error('此功能仅限Pro用户使用');
      }

      return isProUser && config.pro_cost ? config.pro_cost : config.standard_cost;
    } catch (error) {
      console.error('计算工具费用失败:', error);
      throw error;
    }
  }

  /**
   * 使用AI工具
   */
  static async useAITool(
    userId: string,
    toolType: string,
    toolName: string,
    inputData: any,
    outputData: any,
    modelType: 'STANDARD' | 'ADVANCED' | 'PREMIUM' = 'STANDARD'
  ): Promise<{ success: boolean, generationId?: string, error?: string }> {
    try {
      // 检查用户会员状态
      const { data: membership } = await supabase
        .from('memberships')
        .select('membership_type')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      const isProUser = membership?.membership_type === 'PRO' || membership?.membership_type === 'PREMIUM';

      // 计算费用
      const cost = await this.calculateToolCost(toolType, isProUser);

      // 检查点数是否足够
      const userPoints = await this.getUserPoints(userId);
      if (userPoints < cost) {
        return { success: false, error: '点数不足' };
      }

      // 使用RPC函数处理AI工具使用
      const { data, error } = await supabase.rpc('use_ai_tool', {
        p_user_id: userId,
        p_tool_type: toolType,
        p_tool_name: toolName,
        p_input_data: inputData,
        p_output_data: outputData,
        p_model_type: modelType,
        p_cost: cost
      });

      if (error) {
        console.error('使用AI工具失败:', error);
        return { success: false, error: error.message };
      }

      return { success: true, generationId: data.generation_id };
    } catch (error) {
      console.error('使用AI工具异常:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 兑换兑换码
   */
  static async redeemCode(userId: string, code: string): Promise<{
    success: boolean,
    message: string,
    type?: string,
    value?: number
  }> {
    try {
      const { data, error } = await supabase.rpc('redeem_code', {
        p_user_id: userId,
        p_code: code
      });

      if (error) {
        console.error('兑换失败:', error);
        return { success: false, message: error.message };
      }

      return {
        success: true,
        message: data.message,
        type: data.type,
        value: data.value
      };
    } catch (error) {
      console.error('兑换异常:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : '兑换失败'
      };
    }
  }

  /**
   * 获取用户信息（包括会员状态）
   */
  static async getUserInfo(userId: string) {
    try {
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError) {
        console.error('获取用户信息失败:', userError);
        return null;
      }

      const { data: membership, error: membershipError } = await supabase
        .from('memberships')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      const { data: points, error: pointsError } = await supabase
        .from('user_points')
        .select('*')
        .eq('user_id', userId)
        .single();

      return {
        user,
        membership: membership || null,
        points: points || { points: 0 }
      };
    } catch (error) {
      console.error('获取用户信息异常:', error);
      return null;
    }
  }

  /**
   * 创建AI生成记录
   */
  static async createAIGeneration(
    userId: string,
    toolType: string,
    toolName: string,
    inputData: any,
    outputData: any,
    modelType: 'STANDARD' | 'ADVANCED' | 'PREMIUM' = 'STANDARD',
    pointsCost: number
  ) {
    try {
      const { data, error } = await supabase
        .from('ai_generations')
        .insert({
          user_id: userId,
          tool_type: toolType,
          tool_name: toolName,
          input_data: inputData,
          output_data: outputData,
          model_type: modelType,
          points_cost: pointsCost,
          status: 'COMPLETED'
        })
        .select()
        .single();

      if (error) {
        console.error('创建AI生成记录失败:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('创建AI生成记录异常:', error);
      return null;
    }
  }
}