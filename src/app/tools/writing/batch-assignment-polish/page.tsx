"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Home } from "lucide-react";
// import { useRouter } from "next/navigation";
// import { useUser } from "@/lib/user-context";

const BatchAssignmentPolish = () => {
  // const router = useRouter();
  // const { currentUser } = useUser();
  const currentUser = null; // 临时设置

  if (!currentUser) {
    // router.push('/auth/signin');
    return null;
  }

  return (
    <div className="container mx-auto p-6">
      {/* 头部信息 */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => console.log('导航到首页')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 px-3 py-2 rounded hover:bg-gray-100"
          >
            <Home className="w-4 h-4" />
            <span>首页</span>
          </button>
          <div className="h-6 w-px bg-gray-300"></div>
          <h1 className="text-2xl font-bold text-gray-900">
            批量润色学生英文句子
          </h1>
        </div>
        <p className="text-gray-600 pl-12">
          智能OCR识别 + AI润色修改，高效处理学生作业
        </p>
      </div>

      {/* 主要内容 */}
      <Card>
        <CardHeader>
          <CardTitle>功能维护中</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">
              批量润色功能正在维护升级中，暂时无法使用。
            </p>
            <p className="text-sm text-gray-500">
              请稍后再试，或联系管理员获取更多信息。
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BatchAssignmentPolish;