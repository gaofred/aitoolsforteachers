import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testConnection() {
  try {
    console.log('🔍 测试数据库连接...')

    // 测试基本连接
    await prisma.$connect()
    console.log('✅ 数据库连接成功！')

    // 测试查询
    const result = await prisma.$queryRaw`SELECT version()`
    console.log('📊 PostgreSQL版本:', result)

    // 检查表是否存在
    const tables = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `
    console.log('📋 当前数据库表:', tables)

  } catch (error) {
    console.error('❌ 数据库连接失败:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

testConnection()