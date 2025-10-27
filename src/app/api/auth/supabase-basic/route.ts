import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { supabase } from '@/lib/supabase'
import { processInviteForNewUserServer } from '@/lib/invite-tracking-server'
import { z } from 'zod'

const registerSchema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
  password: z.string().min(6, "密码至少需要6个字符"),
  name: z.string().min(1, "请输入姓名").optional(),
  skipEmailVerification: z.boolean().optional().default(false),
  inviteCode: z.string().optional() // 邀请码参数
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = registerSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: "输入数据无效", details: validation.error.issues.map(e => e.message).join(", ") },
        { status: 400 }
      )
    }

    const { email, password, name, skipEmailVerification, inviteCode } = validation.data

    const supabase = createServerSupabaseClient()

    // 注册并自动登录（跳过邮箱验证）
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: name || email.split("@")[0]
        },
        emailRedirectTo: undefined // 禁用邮箱重定向
      }
    })

    if (error) {
      console.error('Supabase基础注册失败:', error)

      // 提供更详细的错误信息
      const errorMessage = `Supabase注册失败: ${error.message || error}`

      return NextResponse.json(
        {
          error: errorMessage,
          details: error,
          suggestion: "请检查 Supabase 项目的 Authentication 设置。可能需要在 Supabase Dashboard 中检查邮箱验证配置。"
        },
        { status: 400 }
      )
    }

    // 注册成功后，创建用户的业务数据记录
    if (data.user?.id) {
      try {
        console.log('开始创建用户业务数据记录，用户ID:', data.user.id);

        // 1. 先创建用户业务记录（如果不存在）
        const { error: userError } = await supabase
          .from('users')
          .upsert({
            id: data.user.id,
            email: data.user.email,
            name: data.user.email?.split('@')[0], // 使用邮箱前缀作为默认名称
            provider: 'email', // 默认provider，稍后可以更新
            role: 'USER',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          } as any, {
            onConflict: 'id'
          } as any);

        if (userError) {
          console.error('创建用户记录失败:', userError);
        } else {
          console.log('用户记录创建成功');
        }

        // 2. 然后创建用户积分记录（如果不存在）
        const { error: pointsError } = await supabase
          .from('user_points')
          .upsert({
            user_id: data.user.id,
            points: 25, // 新用户赠送25积分
            last_updated: new Date().toISOString()
          } as any, {
            onConflict: 'user_id'
          } as any);

        if (pointsError) {
          console.error('创建用户积分记录失败:', pointsError);
        } else {
          console.log('用户积分记录创建成功');
        }

        // 3. 最后创建用户会员记录（如果不存在）
        const { error: membershipError } = await supabase
          .from('memberships')
          .upsert({
            user_id: data.user.id,
            membership_type: 'FREE',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          } as any, {
            onConflict: 'user_id'
          } as any);

        if (membershipError) {
          console.error('创建用户会员记录失败:', membershipError);
        } else {
          console.log('用户会员记录创建成功');
        }

        console.log('用户业务数据记录创建完成');

        // 处理邀请奖励（如果有邀请码）
        if (inviteCode && data.user?.id) {
          console.log('检测到邀请码，开始处理邀请奖励:', inviteCode);
          
          // 创建一个包含invite_code的请求URL用于processInviteForNewUserServer
          const inviteRequestUrl = new URL('/api/auth/supabase-basic', process.env.NEXTAUTH_URL || 'http://localhost:3007');
          inviteRequestUrl.searchParams.set('invite_code', inviteCode);
          
          const mockRequest = new Request(inviteRequestUrl.toString());
          
          await processInviteForNewUserServer(data.user.id, mockRequest).catch((error) => {
            console.error('处理邀请奖励失败:', error);
          });
        }

      } catch (createError) {
        console.error('创建用户业务数据记录异常:', createError);
        // 不阻断注册流程，只记录错误
      }
    }

    // 注册成功后，自动登录用户
    console.log('开始自动登录新用户...');
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (signInError) {
      console.error('自动登录失败:', signInError);
      return NextResponse.json({
        error: "注册成功但自动登录失败，请手动登录",
        details: signInError.message,
        user: {
          id: data.user?.id,
          email: data.user?.email,
          name: data.user?.user_metadata?.display_name
        }
      }, { status: 400 });
    }

    console.log('新用户自动登录成功！');

    return NextResponse.json({
      message: "注册成功并已自动登录！",
      user: {
        id: data.user?.id,
        email: data.user?.email,
        name: data.user?.user_metadata?.display_name,
        initialPoints: 25,
        note: "新用户赠送25积分，首次每日签到再获得25积分，第一天共50积分"
      }
    })

  } catch (error) {
    console.error('注册错误:', error)
    return NextResponse.json(
      { error: "注册失败: " + (error instanceof Error ? error.message : "未知错误") },
      { status: 500 }
    )
  }
}