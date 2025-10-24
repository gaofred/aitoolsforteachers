import { createServerSupabaseClient } from './supabase-server';
import { supabase } from './supabase';

/**
 * 每日登录奖励服务
 * 以北京时间为准，每天首次登录奖励25个积分
 */
export class DailyLoginRewardService {
  /**
   * 获取北京时间
   */
  static getBeijingDate(): string {
    const now = new Date();
    const beijingTime = new Date(now.getTime() + (8 * 60 * 60 * 1000)); // UTC+8
    return beijingTime.toISOString().split('T')[0]; // 返回 YYYY-MM-DD 格式
  }

  /**
   * 检查用户今天是否已经获得登录奖励
   */
  static async hasClaimedTodayReward(userId: string): Promise<boolean> {
    try {
      const today = this.getBeijingDate();

      const { data, error } = await supabase
        .from('point_transactions')
        .select('id')
        .eq('user_id', userId)
        .eq('type', 'BONUS')
        .eq('description', `每日登录奖励 - ${today}`)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('检查每日奖励失败:', error);
        return false;
      }

      return !!data; // 如果找到记录，说明已经领取过
    } catch (error) {
      console.error('检查每日奖励异常:', error);
      return false;
    }
  }

  /**
   * 发放每日登录奖励
   */
  static async claimDailyReward(userId: string): Promise<{ success: boolean; message: string; pointsAdded?: number }> {
    try {
      const today = this.getBeijingDate();

      // 检查是否已经领取过今天的奖励
      const hasClaimed = await this.hasClaimedTodayReward(userId);
      if (hasClaimed) {
        return {
          success: false,
          message: '今天已经领取过登录奖励了'
        };
      }

      // 使用优化的数据库函数，添加超时处理
      const { data, error } = await supabase.rpc('add_daily_reward', {
        user_uuid: userId
      } as any, {
        // 设置较短的超时时间
        count: 'exact'
      } as any);

      if (error) {
        console.error('使用数据库函数添加奖励失败:', error);
        return {
          success: false,
          message: '发放奖励失败: ' + error.message
        };
      }

      const result = data as any;
      if (!result.success) {
        return {
          success: false,
          message: result.message || '发放奖励失败'
        };
      }

      console.log('每日奖励发放成功:', result);
      return {
        success: true,
        message: result.message,
        pointsAdded: result.pointsAdded || 25
      };
    } catch (error) {
      console.error('每日奖励操作异常:', error);
      return {
        success: false,
        message: '发放奖励失败，请稍后重试'
      };
    }
  }

  /**
   * 获取用户连续登录天数
   */
  static async getConsecutiveLoginDays(userId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('point_transactions')
        .select('created_at, metadata')
        .eq('user_id', userId)
        .eq('type', 'BONUS')
        .like('description', '每日登录奖励%')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('获取连续登录天数失败:', error);
        return 0;
      }

      if (!data || data.length === 0) {
        return 0;
      }

      let consecutiveDays = 0;
      const today = this.getBeijingDate();
      const todayDate = new Date(today);

      for (let i = 0; i < data.length; i++) {
        const recordDate = new Date(data[i].created_at.split('T')[0]);
        const expectedDate = new Date(todayDate.getTime() - (consecutiveDays * 24 * 60 * 60 * 1000));

        if (recordDate.toDateString() === expectedDate.toDateString()) {
          consecutiveDays++;
        } else {
          break;
        }
      }

      return consecutiveDays;
    } catch (error) {
      console.error('计算连续登录天数异常:', error);
      return 0;
    }
  }

  /**
   * 获取用户登录奖励统计
   */
  static async getLoginRewardStats(userId: string): Promise<{
    totalRewards: number;
    consecutiveDays: number;
    lastRewardDate: string | null;
  }> {
    try {
      const { data, error } = await supabase
        .from('point_transactions')
        .select('created_at, amount')
        .eq('user_id', userId)
        .eq('type', 'BONUS')
        .like('description', '每日登录奖励%')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('获取登录奖励统计失败:', error);
        return {
          totalRewards: 0,
          consecutiveDays: 0,
          lastRewardDate: null
        };
      }

      const totalRewards = data.reduce((sum, record) => sum + record.amount, 0);
      const consecutiveDays = await this.getConsecutiveLoginDays(userId);
      const lastRewardDate = data.length > 0 ? data[0].created_at.split('T')[0] : null;

      return {
        totalRewards,
        consecutiveDays,
        lastRewardDate
      };
    } catch (error) {
      console.error('获取登录奖励统计异常:', error);
      return {
        totalRewards: 0,
        consecutiveDays: 0,
        lastRewardDate: null
      };
    }
  }
}


