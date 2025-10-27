import { redirect } from "next/navigation";

// 专门处理邀请码重定向的服务器组件
export default async function InviteRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ invite_code?: string }>;
}) {
  const { invite_code: inviteCode } = await searchParams;

  // 如果有邀请码，直接重定向到注册页面
  if (inviteCode) {
    const signupUrl = `/auth/signup?invite_code=${encodeURIComponent(inviteCode)}`;
    console.log('邀请码重定向:', inviteCode, '->', signupUrl);
    redirect(signupUrl);
  }

  // 如果没有邀请码，重定向到邀请主页
  redirect('/invite');
}