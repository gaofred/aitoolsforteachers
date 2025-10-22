import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function initDatabase() {
  try {
    console.log('🚀 开始初始化数据库...')

    // 检查数据库连接
    await prisma.$connect()
    console.log('✅ 数据库连接成功')

    // 推送架构（创建表）
    console.log('📊 创建数据库表...')
    // 这里我们依赖 db:push 命令，但也可以在这里执行
    console.log('ℹ️  请运行 npm run db:push 来创建表结构')

    // 检查是否已有管理员
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com'
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail }
    })

    if (!existingAdmin) {
      console.log('👤 创建管理员账号...')
      const hashedPassword = await bcrypt.hash('admin123', 12)

      const admin = await prisma.user.create({
        data: {
          email: adminEmail,
          passwordHash: hashedPassword,
          name: '管理员',
          role: 'ADMIN',
        },
        include: {
          points: true,
          membership: true
        }
      })

      // 为管理员创建积分记录
      await prisma.userPoints.create({
        data: {
          userId: admin.id,
          points: 10000,
        }
      })

      // 为管理员创建专业会员资格
      await prisma.membership.create({
        data: {
          userId: admin.id,
          membershipType: 'PRO',
          expiresAt: new Date('2030-12-31'),
        }
      })

      console.log(`✅ 管理员账号创建成功: ${adminEmail}`)
      console.log('🔑 默认密码: admin123')
    } else {
      console.log('ℹ️  管理员账号已存在')
    }

    // 创建示例兑换码
    const redemptionCodes = [
      { code: 'PREMIUM30', type: 'MEMBERSHIP_DAYS' as const, value: 30, description: '30天高级会员体验' },
      { code: 'POINTS100', type: 'POINTS' as const, value: 100, description: '100积分奖励' },
      { code: 'PRO365', type: 'MEMBERSHIP_DAYS' as const, value: 365, description: '1年专业会员' },
      { code: 'POINTS500', type: 'POINTS' as const, value: 500, description: '500积分大礼包' },
    ]

    console.log('🎫 创建示例兑换码...')
    for (const codeData of redemptionCodes) {
      await prisma.redemptionCode.upsert({
        where: { code: codeData.code },
        update: {},
        create: {
          ...codeData,
          expiresAt: new Date('2025-12-31'),
        },
      })
    }

    console.log('✅ 示例兑换码创建完成')
    console.log('🎉 数据库初始化完成！')

  } catch (error) {
    console.error('❌ 数据库初始化失败:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

initDatabase()