import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    const { email, password, name } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: "邮箱和密码为必填项" },
        { status: 400 }
      )
    }

    // 检查用户是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "该邮箱已被注册" },
        { status: 400 }
      )
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 12)

    // 创建用户
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        name: name || email.split('@')[0], // 默认使用邮箱前缀作为用户名
      },
      include: {
        points: true,
        membership: true
      }
    })

    // 为新用户创建积分记录
    await prisma.userPoints.create({
      data: {
        userId: user.id,
        points: 25, // 新用户赠送25积分
      }
    })

    // 为新用户创建免费会员记录
    await prisma.membership.create({
      data: {
        userId: user.id,
        membershipType: 'FREE',
      }
    })

    // 创建积分交易记录
    await prisma.pointTransaction.create({
      data: {
        userId: user.id,
        type: 'BONUS',
        amount: 25,
        description: '新用户注册奖励',
      }
    })

    return NextResponse.json({
      message: "注册成功",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      }
    })

  } catch (error) {
    console.error("注册错误:", error)
    return NextResponse.json(
      { error: "注册失败，请稍后重试" },
      { status: 500 }
    )
  }
}