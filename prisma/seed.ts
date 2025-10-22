import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('开始数据库种子数据初始化...')

  // 创建管理员用户
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com'
  const hashedPassword = await bcrypt.hash('admin123', 12)

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash: hashedPassword,
      name: '管理员',
      role: 'ADMIN',
    },
  })

  // 为管理员创建积分记录
  await prisma.userPoints.upsert({
    where: { userId: admin.id },
    update: {},
    create: {
      userId: admin.id,
      points: 10000, // 管理员拥有大量积分
    },
  })

  // 为管理员创建专业会员资格
  await prisma.membership.upsert({
    where: { userId: admin.id },
    update: {},
    create: {
      userId: admin.id,
      membershipType: 'PRO',
      expiresAt: new Date('2030-12-31'), // 长期有效
    },
  })

  // 创建一些示例兑换码
  const redemptionCodes = [
    {
      code: 'PREMIUM30',
      type: 'MEMBERSHIP_DAYS' as const,
      value: 30, // 30天高级会员
      description: '30天高级会员体验',
      expiresAt: new Date('2025-12-31'),
    },
    {
      code: 'POINTS100',
      type: 'POINTS' as const,
      value: 100, // 100积分
      description: '100积分奖励',
      expiresAt: new Date('2025-12-31'),
    },
    {
      code: 'PRO365',
      type: 'MEMBERSHIP_DAYS' as const,
      value: 365, // 365天专业会员
      description: '1年专业会员',
      expiresAt: new Date('2025-12-31'),
    },
    {
      code: 'POINTS500',
      type: 'POINTS' as const,
      value: 500, // 500积分
      description: '500积分大礼包',
      expiresAt: new Date('2025-12-31'),
    },
  ]

  for (const codeData of redemptionCodes) {
    await prisma.redemptionCode.upsert({
      where: { code: codeData.code },
      update: {},
      create: codeData,
    })
  }

  console.log('数据库种子数据初始化完成!')
  console.log(`管理员账号: ${adminEmail}`)
  console.log('管理员密码: admin123')
  console.log('已创建兑换码:')
  redemptionCodes.forEach(code => {
    console.log(`- ${code.code}: ${code.description}`)
  })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('种子数据初始化失败:', e)
    await prisma.$disconnect()
    process.exit(1)
  })