// NextAuth API Route - 临时禁用以解决构建问题
import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({ message: "NextAuth API temporarily disabled" })
}

export async function POST() {
  return NextResponse.json({ message: "NextAuth API temporarily disabled" })
}