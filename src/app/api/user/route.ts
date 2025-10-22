import { NextResponse } from "next/server"

// 临时API路由 - 返回模拟数据
export async function GET() {
  return NextResponse.json({
    user: {
      id: "demo-user-id",
      email: "demo@example.com",
      name: "演示用户",
      role: "USER",
      points: 25,
      membershipType: "FREE",
      membershipExpiresAt: null,
      createdAt: new Date(),
    }
  })
}