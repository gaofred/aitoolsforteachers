import { prisma } from '@/lib/prisma';

export interface PointTransaction {
  id: string;
  type: 'REDEEM' | 'GENERATE' | 'REFUND' | 'BONUS' | 'PURCHASE' | 'MEMBERSHIP';
  amount: number;
  description: string;
  relatedId?: string;
  metadata?: any;
  createdAt: Date;
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
    const userPoints = await prisma.userPoints.findUnique({
      where: { userId }
    });
    return userPoints?.points || 0;
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
      await prisma.$transaction(async (tx) => {
        // 检查用户是否有足够点数
        const userPoints = await tx.userPoints.findUnique({
          where: { userId }
        });

        if (!userPoints || userPoints.points < amount) {
          throw new Error('点数不足');
        }

        // 扣除点数
        await tx.userPoints.update({
          where: { userId },
          data: { points: userPoints.points - amount }
        });

        // 记录交易
        await tx.pointTransaction.create({
          data: {
            userId,
            type: 'GENERATE',
            amount: -amount, // 负数表示扣除
            description,
            relatedId,
            metadata
          }
        });
      });
      return true;
    } catch (error) {
      console.error('扣除点数失败:', error);
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
      await prisma.$transaction(async (tx) => {
        // 获取当前点数
        const userPoints = await tx.userPoints.findUnique({
          where: { userId }
        });

        const currentPoints = userPoints?.points || 0;

        // 增加点数
        await tx.userPoints.upsert({
          where: { userId },
          create: { userId, points: amount },
          update: { points: currentPoints + amount }
        });

        // 记录交易
        await tx.pointTransaction.create({
          data: {
            userId,
            type,
            amount,
            description,
            relatedId,
            metadata
          }
        });
      });
      return true;
    } catch (error) {
      console.error('增加点数失败:', error);
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
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      prisma.pointTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.pointTransaction.count({
        where: { userId }
      })
    ]);

    return {
      transactions: transactions.map(t => ({
        ...t,
        relatedId: t.relatedId || undefined
      })),
      total
    };
  }

  /**
   * 获取AI工具配置
   */
  static async getAIToolConfig(toolType: string): Promise<AIToolConfig | null> {
    const config = await prisma.aIToolConfig.findUnique({
      where: { toolType }
    });
    return config ? {
      ...config,
      proCost: config.proCost || undefined
    } : null;
  }

  /**
   * 获取所有AI工具配置
   */
  static async getAllAIToolConfigs(): Promise<AIToolConfig[]> {
    const configs = await prisma.aIToolConfig.findMany({
      where: { isActive: true },
      orderBy: { category: 'asc' }
    });
    return configs.map(c => ({
      ...c,
      proCost: c.proCost || undefined
    }));
  }

  /**
   * 计算工具使用费用
   */
  static async calculateToolCost(
    toolType: string,
    isProUser: boolean = false
  ): Promise<number> {
    const config = await this.getAIToolConfig(toolType);
    if (!config) return 0;

    if (config.isProOnly && !isProUser) {
      throw new Error('此功能仅限Pro用户使用');
    }

    return isProUser && config.proCost ? config.proCost : config.standardCost;
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
      const membership = await prisma.membership.findUnique({
        where: { userId }
      });

      const isProUser = membership?.membershipType === 'PRO' || membership?.membershipType === 'PREMIUM';

      // 计算费用
      const cost = await this.calculateToolCost(toolType, isProUser);

      // 检查点数是否足够
      const userPoints = await this.getUserPoints(userId);
      if (userPoints < cost) {
        return { success: false, error: '点数不足' };
      }

      // 扣除点数并创建生成记录
      const result = await prisma.$transaction(async (tx) => {
        // 扣除点数
        await tx.userPoints.update({
          where: { userId },
          data: { points: userPoints - cost }
        });

        // 记录交易
        await tx.pointTransaction.create({
          data: {
            userId,
            type: 'GENERATE',
            amount: -cost,
            description: `使用${toolName}`,
            relatedId: undefined,
            metadata: { toolType, modelType }
          }
        });

        // 创建AI生成记录
        const generation = await tx.aIGeneration.create({
          data: {
            userId,
            toolType,
            toolName,
            inputData,
            outputData,
            modelType,
            pointsCost: cost,
            status: 'COMPLETED'
          }
        });

        return generation;
      });

      return { success: true, generationId: result.id };
    } catch (error) {
      console.error('使用AI工具失败:', error);
      return { success: false, error: error instanceof Error ? error.message : '未知错误' };
    }
  }

  /**
   * 兑换兑换码
   */
  static async redeemCode(userId: string, code: string): Promise<{ success: boolean, message: string }> {
    try {
      const result = await prisma.$transaction(async (tx) => {
        // 查找兑换码
        const redemptionCode = await tx.redemptionCode.findUnique({
          where: { code }
        });

        if (!redemptionCode) {
          throw new Error('兑换码不存在');
        }

        if (redemptionCode.isUsed) {
          throw new Error('兑换码已被使用');
        }

        if (redemptionCode.expiresAt && redemptionCode.expiresAt < new Date()) {
          throw new Error('兑换码已过期');
        }

        // 标记兑换码为已使用
        await tx.redemptionCode.update({
          where: { id: redemptionCode.id },
          data: {
            isUsed: true,
            usedBy: userId,
            usedAt: new Date()
          }
        });

        // 根据兑换码类型处理
        if (redemptionCode.type === 'POINTS') {
          // 增加点数
          const userPoints = await tx.userPoints.findUnique({
            where: { userId }
          });

          const currentPoints = userPoints?.points || 0;

          await tx.userPoints.upsert({
            where: { userId },
            create: { userId, points: redemptionCode.value },
            update: { points: currentPoints + redemptionCode.value }
          });

          // 记录交易
          await tx.pointTransaction.create({
            data: {
              userId,
              type: 'REDEEM',
              amount: redemptionCode.value,
              description: `兑换码兑换: ${code}`,
              relatedId: redemptionCode.id,
              metadata: { code }
            }
          });

          return { type: 'points', value: redemptionCode.value };
        } else if (redemptionCode.type === 'MEMBERSHIP_DAYS') {
          // 增加会员天数
          const membership = await tx.membership.findUnique({
            where: { userId }
          });

          const currentExpiresAt = membership?.expiresAt || new Date();
          const newExpiresAt = new Date(currentExpiresAt.getTime() + redemptionCode.value * 24 * 60 * 60 * 1000);

          await tx.membership.upsert({
            where: { userId },
            create: {
              userId,
              membershipType: 'PREMIUM',
              expiresAt: newExpiresAt
            },
            update: {
              membershipType: 'PREMIUM',
              expiresAt: newExpiresAt
            }
          });

          // 记录交易
          await tx.pointTransaction.create({
            data: {
              userId,
              type: 'MEMBERSHIP',
              amount: 0,
              description: `兑换码兑换会员: ${code}`,
              relatedId: redemptionCode.id,
              metadata: { code, days: redemptionCode.value }
            }
          });

          return { type: 'membership', value: redemptionCode.value };
        }

        throw new Error('无效的兑换码类型');
      });

      if (result.type === 'points') {
        return { success: true, message: `兑换成功！获得 ${result.value} 点数` };
      } else {
        return { success: true, message: `兑换成功！获得 ${result.value} 天会员` };
      }
    } catch (error) {
      console.error('兑换失败:', error);
      return { success: false, message: error instanceof Error ? error.message : '兑换失败' };
    }
  }
}




