"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthRedirect } from "@/lib/auth-redirect";
import { useUser } from "@/lib/user-context";
import { Gift, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function TestRedirectPage() {
  const { currentUser } = useUser();
  const { redirectToLogin } = useAuthRedirect();

  if (!currentUser) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardContent className="p-12 text-center">
            <Gift className="h-16 w-16 text-purple-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              测试重定向功能
            </h2>
            <p className="text-gray-600 mb-6">
              这是一个测试页面，用于验证登录重定向功能是否正常工作。
            </p>
            <div className="space-y-4">
              <Button
                onClick={() => redirectToLogin()}
                className="bg-gradient-to-r from-blue-600 to-purple-600"
              >
                测试登录重定向
              </Button>
              <div className="text-sm text-gray-500">
                点击后应该跳转到登录页面，登录成功后返回此页面
              </div>
            </div>
            <div className="mt-8">
              <Link href="/" className="text-purple-600 hover:text-purple-700 hover:underline">
                <ArrowLeft className="inline w-4 h-4 mr-1" />
                返回主页
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-purple-600" />
            重定向测试成功！
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="font-semibold text-green-800 mb-2">✅ 登录状态正常</h3>
            <p className="text-green-700">
              用户: {currentUser.name || currentUser.email}
            </p>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-2">🔍 重定向测试结果</h3>
            <p className="text-blue-700">
              如果您是从登录页面重定向回来的，说明重定向功能工作正常！
            </p>
          </div>

          <div className="flex gap-4">
            <Link href="/invite">
              <Button variant="outline">
                <Gift className="w-4 h-4 mr-2" />
                测试邀请页面
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                返回主页
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}