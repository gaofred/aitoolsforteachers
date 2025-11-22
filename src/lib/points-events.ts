// 点数变化事件系统
export type PointsEventType =
  | 'DEDUCT_POINTS'
  | 'ADD_POINTS'
  | 'POINTS_REFUND'
  | 'REDEEM_CODE';

export interface PointsEvent {
  type: PointsEventType;
  userId: string;
  amount: number;
  newBalance: number;
  description: string;
  timestamp: number;
}

// 点数变化监听器列表
type PointsListener = (event: PointsEvent) => void;

class PointsEventManager {
  private listeners: PointsListener[] = [];

  /**
   * 添加点数变化监听器
   */
  addListener(listener: PointsListener): () => void {
    this.listeners.push(listener);

    // 返回取消监听的函数
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * 触发点数变化事件
   */
  emit(event: PointsEvent, options: { forceRefresh?: boolean, clearCache?: boolean } = {}): void {
    console.log('💰 点数变化事件:', event, options);

    const { forceRefresh = false, clearCache = true } = options;

    // 可选：清除本地存储的点数缓存，强制从API获取最新数据
    if (clearCache && typeof window !== 'undefined') {
      try {
        localStorage.removeItem('english_teaching_user_points');
        localStorage.removeItem('english_teaching_user_last_update');
        console.log('🗑️ 已清除点数本地缓存');
      } catch (error) {
        console.warn('⚠️ 清除点数缓存失败:', error);
      }
    }

    // 通知所有监听器
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('点数事件监听器错误:', error);
      }
    });

    // 触发全局事件，供其他组件监听
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pointsChange', {
        detail: { ...event, forceRefresh, clearCache }
      }));
    }
  }

  /**
   * 创建点数扣除事件
   */
  static createDeductEvent(
    userId: string,
    amount: number,
    newBalance: number,
    description: string
  ): PointsEvent {
    return {
      type: 'DEDUCT_POINTS',
      userId,
      amount: -amount, // 扣除用负数
      newBalance,
      description,
      timestamp: Date.now()
    };
  }

  /**
   * 创建点数增加事件
   */
  static createAddEvent(
    userId: string,
    amount: number,
    newBalance: number,
    description: string
  ): PointsEvent {
    return {
      type: 'ADD_POINTS',
      userId,
      amount,
      newBalance,
      description,
      timestamp: Date.now()
    };
  }

  /**
   * 创建兑换码事件
   */
  static createRedeemEvent(
    userId: string,
    amount: number,
    newBalance: number,
    description: string
  ): PointsEvent {
    return {
      type: 'REDEEM_CODE',
      userId,
      amount,
      newBalance,
      description,
      timestamp: Date.now()
    };
  }
}

// 导出全局实例
export const pointsEventManager = new PointsEventManager();