"use client";

import { useState, useEffect, useRef, startTransition } from "react";

// 直接在组件中使用条件渲染避免水合问题
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { UserMenu } from "@/components/auth/UserMenu";
import { useUser } from "@/lib/user-context";
import { LogoWithText } from "@/components/Logo";
import { EnglishMaxim } from "@/components/EnglishMaxim";
import { Gift } from "lucide-react";

import { SupabasePointsService } from "@/lib/supabase-points-service";
import { DailyLoginRewardService } from "@/lib/daily-login-reward";
import { processInviteForNewUser } from "@/lib/invite-tracking-client";

// 导航数据结构
const navigationData = [
  {
    id: "reading",
    title: "阅读教学工具",
    subtitle: "阅读理解与文本分析",
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
      </svg>
    ),
    items: [
      { id: "text-analysis", title: "阅读理解深度分析", active: true, cost: 6 },
      { id: "text-generator", title: "阅读文本生成神器", cost: 4, route: "/tools/reading/reading-generator" },
      { id: "textbook-passage-analysis", title: "课文文章分析", cost: 5, route: "/tools/reading/textbook_passage_analysis" },
      { id: "cd-adaptation", title: "CD篇改编", cost: 5, route: "/tools/reading/cd-adaptation" },
      { id: "cd-creator", title: "CD篇命题", active: true, cost: 4, route: "/tools/reading/cd-creator" },
        { id: "cloze-adaptation", title: "完形填空改编与命题", cost: 6, disabled: true },
        { id: "reading-comprehension-analysis", title: "阅读理解解析", cost: 2, route: "/tools/reading/reading-comprehension-analysis" }
    ]
  },
  {
    id: "vocabulary",
    title: "词汇学习工具",
    subtitle: "词汇学习与巩固工具",
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M6.672 1.911a1 1 0 10-1.932.518l.259.966a1 1 0 001.932-.518l-.26-.966zM2.429 4.74a1 1 0 10-.517 1.932l.966.259a1 1 0 00.517-1.932l-.966-.26zm8.814-.569a1 1 0 00-1.415-1.414l-.707.707a1 1 0 101.415 1.415l.707-.708zm-7.071 7.072l.707-.707A1 1 0 003.465 9.12l-.708.707a1 1 0 001.415 1.415zm3.2-5.171a1 1 0 00-1.3 1.3l4 10a1 1 0 001.823.075l1.38-2.759 3.018 3.02a1 1 0 001.414-1.415l-3.019-3.02 2.76-1.379a1 1 0 00-.076-1.822l-10-4z" clipRule="evenodd" />
      </svg>
    ),
    items: [
      { id: "vocabulary-practice", title: "词汇练习生成", cost: 3, disabled: true },
      { id: "word-analysis", title: "词汇分析工具", cost: 4, disabled: true },
      { id: "bcd-vocabulary-organise", title: "BCD篇阅读重点词汇整理", cost: 2, route: "/tools/vocabulary/organiseBCDvocabulary" },
      { id: "qixuanwu-vocabulary-organise", title: "七选五重点词汇整理", cost: 2, route: "/tools/vocabulary/organiseQixuanwuVocabulary" },
      { id: "cloze-vocabulary-organise", title: "完形填空重点词汇整理", cost: 6, route: "/tools/vocabulary/organise_cloze_vocabulary" },
      { id: "full-exam-vocabulary", title: "整份试卷词汇一次性整理（全国卷）", cost: 0, disabled: true }
    ]
  },
  {
    id: "grammar",
    title: "语法练习工具",
    subtitle: "语法填空与练习生成",
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
      </svg>
    ),
    items: [
      { id: "single-grammar-fill", title: "单句语法填空", cost: 2, disabled: true },
      { id: "grammar-generator", title: "单句语法填空生成器", cost: 4, disabled: true },
      { id: "grammar-questions", title: "语法填空命题", cost: 5, disabled: true }
    ]
  },
  {
    id: "writing",
    title: "写作教学工具",
    subtitle: "应用文与读后续写工具",
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
      </svg>
    ),
    items: [
      { id: "batch-assignment-polish", title: "批量润色学生作业 (开发中)", cost: 0, disabled: true, route: "/tools/writing/batch-assignment-polish" },
      { id: "application-writing", title: "应用文高分范文", cost: 4, disabled: true },
      { id: "application-lesson", title: "应用文学案", cost: 6, disabled: true },
      { id: "continuation-writing", title: "读后续写范文", cost: 5, disabled: true },
      { id: "continuation-lesson", title: "读后续写学案", cost: 7, disabled: true }
    ]
  },
  {
    id: "translation",
    title: "文本翻译工具",
    subtitle: "文本翻译与语言转换",
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
      </svg>
    ),
    items: [
      { id: "en-to-cn", title: "地道英译汉", cost: 3, disabled: true },
      { id: "multi-translation", title: "一句多译", cost: 4, disabled: true },
      { id: "cn-to-en", title: "地道汉译英", cost: 3, disabled: true }
    ]
  },
  {
    id: "media",
    title: "音频和视频工具",
    subtitle: "音频视频生成与处理",
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
      </svg>
    ),
    items: [
      { id: "listening-generator", title: "英语听力生成器", cost: 8, disabled: true }
    ]
  },
  {
    id: "image",
    title: "AI图片生成工具",
    subtitle: "智能连环画生成与编辑",
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
      </svg>
    ),
    items: [
      { id: "image-generator", title: "AI生成故事组图", cost: 14, route: "/tools/pictures/Word_to_Multiple_pictures" }
    ]
  },
  {
    id: "paper",
    title: "论文相关工具",
    subtitle: "学术论文分析与辅助",
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
      </svg>
    ),
    items: [
      { id: "paper-understand", title: "一键看懂学术论文", cost: 0, disabled: true }
    ]
  },
  {
    id: "correction",
    title: "批改类工具",
    subtitle: "作业批改与评分辅助",
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
      </svg>
    ),
    items: []
  },
  {
    id: "invite",
    title: "邀请有礼",
    subtitle: "邀请朋友获得点数奖励",
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M5 2a2 2 0 00-2 2v14l3.5-2 3.5 2 3.5-2 3.5 2V4a2 2 0 00-2-2H5zm2.5 3a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm6.207.293a1 1 0 00-1.414 0l-6 6a1 1 0 101.414 1.414l6-6a1 1 0 000-1.414zM12.5 10a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" clipRule="evenodd"/>
      </svg>
    ),
    items: [
      { id: "invite-friends", title: "邀请朋友获得奖励", active: true, cost: 0, route: "/invite" }
    ]
  },
  {
    id: "games",
    title: "互动游戏类",
    subtitle: "教学互动游戏工具",
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm3.293 1.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L7.586 10 5.293 7.707a1 1 0 010-1.414zM11 12a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/>
      </svg>
    ),
    items: []
  }
];

// 工具配置信息
const toolConfig = {
  "text-analysis": {
    title: "阅读理解深度分析",
    description: "输入英文文章，但不要包含题干和ABCD选项，Fred老师原创提示词将会生成全文解读、文章中心思想和情节走向、段落分析与衔接、篇章结构分析、逐个段落解读等详细剖析内容。",
    icon: (
      <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
      </svg>
    ),
    placeholder: "请粘贴您要分析的英语文章...",
    analysisOptions: [
      { value: "comprehensive", label: "全面分析" },
      { value: "vocabulary", label: "词汇分析" },
      { value: "grammar", label: "语法分析" },
      { value: "readability", label: "可读性分析" }
    ],
    buttonText: "开始神奇分析!",
    analysisText: "AI分析中..."
  },
  "text-generator": {
    title: "阅读文本生成神器",
    description: "输入主题和要求，AI将为您生成高质量的英语阅读文章，适合不同难度和学习目标",
    icon: (
      <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
        <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
        <path fillRule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 102 0V3h4v1a1 1 0 102 0V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/>
      </svg>
    ),
    placeholder: "请输入文章主题（如：环保、科技、教育等）或具体要求...",
    analysisOptions: [
      { value: "intermediate", label: "中级 (B1-B2)" },
      { value: "beginner", label: "初级 (A1-A2)" },
      { value: "advanced", label: "高级 (C1-C2)" }
    ],
    buttonText: "开始生成文章!",
    analysisText: "AI正在创作中..."
  },
  "cd-adaptation": {
    title: "CD篇改编",
    description: "将英文文章改编成适合中国高中生阅读的文本，符合特定字数、词汇和难度要求",
    icon: (
      <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
      </svg>
    ),
    placeholder: "请粘贴您要改编的英文文章...",
    analysisOptions: [
      { value: "basic", label: "基础版（豆包驱动）" },
      { value: "advanced", label: "进阶版（Gemini-2.5-Pro驱动）" }
    ],
    buttonText: "开始改编!",
    analysisText: "AI正在改编中..."
  },
  "bcd-vocabulary-organise": {
    title: "BCD篇阅读重点词汇整理",
    description: "输入BCD篇阅读文章，AI将为您整理出重点词汇、核心短语和固定搭配，并按照词汇等级和重要性进行分类，帮助学生高效掌握阅读材料中的核心词汇",
    icon: (
      <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M6.672 1.911a1 1 0 10-1.932.518l.259.966a1 1 0 001.932-.518l-.26-.966zM2.429 4.74a1 1 0 10-.517 1.932l.966.259a1 1 0 00.517-1.932l-.966-.26zm8.814-.569a1 1 0 00-1.415-1.414l-.707.707a1 1 0 101.415 1.415l.707-.708zm-7.071 7.072l.707-.707A1 1 0 003.465 9.12l-.708.707a1 1 0 001.415 1.415zm3.2-5.171a1 1 0 00-1.3 1.3l4 10a1 1 0 001.823.075l1.38-2.759 3.018 3.02a1 1 0 001.414-1.415l-3.019-3.02 2.76-1.379a1 1 0 00-.076-1.822l-10-4z" clipRule="evenodd" />
      </svg>
    ),
    placeholder: "请粘贴BCD篇阅读文章内容...",
    buttonText: "开始整理词汇!",
    analysisText: "AI正在整理词汇中..."
  },
  "cloze-vocabulary-organise": {
    title: "完形填空重点词汇整理",
    description: "输入完形填空文章，AI将为您整理出完形填空中的重点词汇、固定搭配、语法结构和解题关键点，帮助学生深入理解完形填空的词汇考察重点和答题技巧",
    icon: (
      <svg className="w-4 h-4 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M6.672 1.911a1 1 0 10-1.932.518l.259.966a1 1 0 001.932-.518l-.26-.966zM2.429 4.74a1 1 0 10-.517 1.932l.966.259a1 1 0 00.517-1.932l-.966-.26zm8.814-.569a1 1 0 00-1.415-1.414l-.707.707a1 1 0 101.415 1.415l.707-.708zm-7.071 7.072l.707-.707A1 1 0 003.465 9.12l-.708.707a1 1 0 001.415 1.415zm3.2-5.171a1 1 0 00-1.3 1.3l4 10a1 1 0 001.823.075l1.38-2.759 3.018 3.02a1 1 0 001.414-1.415l-3.019-3.02 2.76-1.379a1 1 0 00-.076-1.822l-10-4z" clipRule="evenodd" />
      </svg>
    ),
    placeholder: "请粘贴完形填空文章内容（包含选项的完整完形填空）...",
    buttonText: "开始整理词汇!",
    analysisText: "AI正在整理完形填空词汇中..."
  },
  "image-generator": {
    title: "AI图片生成工具",
    description: "输入描述文字，AI将为您生成高质量的图片，支持自定义图片数量和风格",
    icon: (
      <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
      </svg>
    ),
    placeholder: "请输入提示词，例如：生成一组共4张连贯插画，核心为同一庭院一角的四季变迁...",
    buttonText: "开始生成连环画!",
    analysisText: "AI正在生成连环画中..."
  },
  "reading-comprehension-analysis": {
    title: "阅读理解解析",
    description: "输入英文阅读理解文章和题目，AI将为您详细分析每个问题的类型、解题思路、答案定位和技巧点拨，帮助提升阅读理解解题能力",
    icon: (
      <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        <path d="M5 8a1 1 0 011-1h1V6a1 1 0 012 0v1h1a1 1 0 110 2H9v1a1 1 0 11-2 0V9H6a1 1 0 01-1-1z" />
      </svg>
    ),
    placeholder: "请粘贴完整的阅读理解文章和题目（包含文章内容、题目和选项）...",
    buttonText: "开始解析题目!",
    analysisText: "AI正在解析中..."
  }
};

export default function Home() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [text, setText] = useState("");
  const [selectedModel, setSelectedModel] = useState("gemini-2.5-flash");
  const [useCode, setUseCode] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<string[]>(["reading"]);
  const [activeItem, setActiveItem] = useState("text-analysis");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
    // 使用共享的用户状态
  const { currentUser, userPoints, isLoadingUser, refreshUser } = useUser();
    const [showRedeemModal, setShowRedeemModal] = useState(false); // 点数兑换弹窗状态
  const [redemptionCode, setRedemptionCode] = useState(""); // 兑换码
  const [isRedeeming, setIsRedeeming] = useState(false); // 兑换状态
  const [dailyRewardClaimed, setDailyRewardClaimed] = useState(false); // 每日奖励是否已领取
  const [showDailyReward, setShowDailyReward] = useState(false); // 是否显示每日奖励弹窗
  const [isClaimingReward, setIsClaimingReward] = useState(false); // 防重复点击状态
  const [isCopying, setIsCopying] = useState(false); // 复制状态

  // 图片识别相关状态
  const [uploadedImages, setUploadedImages] = useState<Array<{file: File, preview: string}>>([]);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // 摄像头相关状态
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 确保组件只在客户端渲染
  useEffect(() => {
    setIsMounted(true);
    checkCurrentUser();
    // 清除任何可能缓存的analysisResult
    setAnalysisResult(null);
  }, []);

  // 摄像头功能函数 - 参考reading-generator的简洁实现
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch (e) {
      console.error('摄像头访问失败:', e)
      alert('无法访问摄像头，请检查权限设置')
    }
  }

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(track => track.stop())
      videoRef.current.srcObject = null
    }
  }

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const photoData = canvas.toDataURL('image/jpeg', 0.8)
      setPhoto(photoData)
      // Stop camera after taking photo
      stopCamera()
    }
  }

  // 组件卸载时清理摄像头
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stream]);

  // Auto start camera when overlay opens - 参考reading-generator实现
  useEffect(() => {
    if (isCameraOpen && !photo) {
      startCamera()
    }
  }, [isCameraOpen])

  // 检查用户登录状态
  const checkCurrentUser = async () => {
    try {
      const response = await fetch('/api/auth/user');
      if (response.ok) {
        const userData = await response.json();
        console.log('用户登录成功:', userData);

        // 检查每日奖励状态
        checkDailyRewardStatus();
      } else {
        console.log('用户未登录或认证失败');

        // 尝试检查认证状态
        const checkResponse = await fetch('/api/auth/check');
        if (checkResponse.ok) {
          const checkData = await checkResponse.json();
          console.log('认证检查结果:', checkData);
        }
      }
    } catch (error) {
      console.error('检查用户状态失败:', error);
    }
  };

  // 处理URL参数检查（只在客户端执行）
  useEffect(() => {
    if (isMounted && typeof window !== 'undefined') {
      // 检查URL参数中是否有登录成功的标志
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('signed_in') === 'true') {
        // 清除URL参数
        window.history.replaceState({}, document.title, window.location.pathname);
        // 重新检查用户状态
        setTimeout(() => {
          checkCurrentUser();

          // 检查并处理邀请奖励（仅对首次登录的用户）
          if (currentUser) {
            processInviteForNewUser(currentUser.id).catch((error) => {
              console.error('页面加载时处理邀请奖励失败:', error);
            });
          }
        }, 1000);
      }
    }
  }, [isMounted]);

  // 检查每日奖励状态（每次请求后重新检查）
  const checkDailyRewardStatus = async () => {
    try {
      const response = await fetch('/api/daily-reward');
      if (response.ok) {
        const data = await response.json();
        console.log('每日奖励调试 - GET返回数据:', data);
        setDailyRewardClaimed(data.hasClaimedToday);
        console.log('每日奖励调试 - 设置状态，dailyRewardClaimed =', data.hasClaimedToday);

        // 如果用户已登录但未领取今日奖励，显示奖励弹窗
        if (currentUser && !data.hasClaimedToday) {
          setTimeout(() => {
            setShowDailyReward(true);
          }, 1000); // 延迟1秒显示，让页面先加载完成
        }
      } else {
        // 如果返回401，说明未认证，重置状态
        if (response.status === 401) {
          setDailyRewardClaimed(false);
        }
      }
    } catch (error) {
      console.error('检查每日奖励状态失败:', error);
      setDailyRewardClaimed(false);
    }
  };

  // 在用户状态更新后重新检查每日奖励状态
  useEffect(() => {
    if (currentUser && !isLoadingUser) {
      console.log('每日奖励调试 - 用户已登录，重新检查奖励状态');
      checkDailyRewardStatus();
    }
  }, [currentUser, isLoadingUser]);

  // 领取每日奖励
  const claimDailyReward = async () => {
    // 防重复点击检查
    if (isClaimingReward) {
      console.log('每日奖励调试 - 防重复拦截，已忽略点击');
      return;
    }

    // 如果已经领取过，直接返回
    if (dailyRewardClaimed) {
      console.log('每日奖励调试 - 已领取过，忽略点击');
      return;
    }

    setIsClaimingReward(true);
    console.log('每日奖励调试 - 开始领取，设置防重复状态');

    try {
      const response = await fetch('/api/daily-reward', {
        method: 'POST'
      });
      
      const data = await response.json();
      
      // 检查 HTTP 状态码
      if (!response.ok) {
        // API 返回错误状态码（401, 500等）
        const errorMessage = data.error || '服务器错误，请稍后重试';
        console.error('每日奖励API错误:', errorMessage);
        alert(errorMessage);
        return;
      }
      
      if (data.success) {
        console.log('每日奖励调试 - 前端收到:', {
          data,
          pointsAdded: data.pointsAdded,
          message: data.message
        });

        const pointsAdded = data.pointsAdded !== undefined ? data.pointsAdded : 25;
        console.log('每日奖励调试 - 计算后的pointsAdded:', pointsAdded);

        console.log('每日奖励调试 - 设置已领取状态');
        setDailyRewardClaimed(true);
        await refreshUser();
        setShowDailyReward(false);
        alert(data.message);
        console.log('每日奖励调试 - 状态已更新，dailyRewardClaimed = true');

        // 重新检查状态，确保与数据库同步
        setTimeout(() => {
          checkDailyRewardStatus();
        }, 500);
      } else {
        if (data.alreadyClaimed) {
          setDailyRewardClaimed(true);
          setShowDailyReward(false);
        }
        // 确保有 message 才显示
        const message = data.message || '领取奖励失败';
        alert(message);

        // 如果是已领取状态，也要重新检查确保一致性
        if (data.alreadyClaimed) {
          setTimeout(() => {
            checkDailyRewardStatus();
          }, 500);
        }
      }
    } catch (error) {
      console.error('领取每日奖励失败:', error);
      alert(`领取奖励失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      // 无论成功失败，都要重置防重复状态
      setIsClaimingReward(false);
      console.log('每日奖励调试 - 重置防重复状态');
    }
  };

  // 用户登出功能
  const handleSignOut = async () => {
    try {
      console.log('开始用户登出');

      // 清除本地状态
      await refreshUser();
      setDailyRewardClaimed(false);
      setShowDailyReward(false);

      // 清除Supabase认证状态
      // const { error } = await supabase.auth.signOut();
      console.log('Supabase登出成功');

      // 跳转到登录页面或刷新页面
      router.push('/auth/signin');

    } catch (error) {
      console.error('登出失败:', error);
      alert('登出失败，请重试');
    }
  };

  // 一键复制功能
  const copyToClipboard = async () => {
    if (!analysisResult) return;

    setIsCopying(true);
    try {
      await navigator.clipboard.writeText(analysisResult);
      alert('内容已复制到剪贴板！');
    } catch (error) {
      console.error('复制失败:', error);
      // 备用复制方法
      const textArea = document.createElement('textarea');
      textArea.value = analysisResult;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('内容已复制到剪贴板！');
    } finally {
      setIsCopying(false);
    }
  };

  // 导出txt文件功能
  const exportToTxt = () => {
    if (!analysisResult) {
      alert('没有可导出的内容！');
      return;
    }

    try {
      // 创建文件内容，移除HTML标签
      const cleanText = analysisResult
        .replace(/<[^>]*>/g, '') // 移除HTML标签
        .replace(/&nbsp;/g, ' ') // 替换空格实体
        .replace(/&lt;/g, '<') // 替换小于号实体
        .replace(/&gt;/g, '>') // 替换大于号实体
        .replace(/&amp;/g, '&') // 替换和号实体
        .replace(/&quot;/g, '"') // 替换引号实体
        .replace(/&#39;/g, "'"); // 替换单引号实体

      // 创建Blob对象
      const blob = new Blob([cleanText], { type: 'text/plain;charset=utf-8' });

      // 创建下载链接
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // 生成文件名（使用当前日期）
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      const timeStr = now.toTimeString().slice(0, 5).replace(/:/g, '');
      link.download = `阅读理解深度分析_${dateStr}_${timeStr}.txt`;

      // 触发下载
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // 清理URL对象
      URL.revokeObjectURL(url);

      alert('文件导出成功！');
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败，请重试！');
    }
  };

  
  // 图片上传处理函数 - 参考reading-generator的简洁实现
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    const arr: string[] = []
    Array.from(files).forEach(f => {
      const reader = new FileReader();
      reader.onload = o => {
        if (typeof o.target?.result === 'string') {
          arr.push(o.target.result as string);
          if (arr.length === files.length) {
            recognizeText(arr)
          }
        }
      }
      reader.readAsDataURL(f)
    })
  };

  // 移除图片函数
  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  // 图片识别处理函数 - 参考reading-generator的简洁实现
  const recognizeText = async (images: string[]) => {
    if (images.length === 0) return
    setIsRecognizing(true)
    // Show recognition alert
    alert('识图中，请稍等...')
    try {
      const texts: string[] = []
      for (const img of images) {
        const res = await fetch('/api/ai/image-recognition',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({imageBase64:img})})
        const d = await res.json()
        if (d.success && d.result) texts.push(d.result)
      }
      if(texts.length){
        setText(prev => prev + (prev ? '\n\n' : '') + texts.join('\n\n'));
        alert('识别成功！')
      } else alert('识别失败')
    }catch(e){console.error(e);alert('识别错误')}
    setIsRecognizing(false)
    clearImages();
  }

  const handleImageRecognition = async () => {
    let imagesToRecognize: string[] = [];

    // 处理上传的图片
    if (uploadedImages.length > 0) {
      const uploadPromises = uploadedImages.map(async (imageObj) => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(imageObj.file);
        });
      });
      imagesToRecognize = await Promise.all(uploadPromises);
    }

    // 处理拍照的图片
    if (photo) {
      imagesToRecognize.push(photo);
    }

    if (imagesToRecognize.length > 0) {
      recognizeText(imagesToRecognize);
    } else {
      alert('请先上传图片或拍照');
    }
  };

  // 清除所有图片
  const clearImages = () => {
    setUploadedImages([]);
    setPhoto(null);
    setIsCameraOpen(false);
    stopCamera();
  };

  
  const charCount = text.length;
  const maxChars = 10000;
  const minChars = activeItem === "text-generator" ? 5 : activeItem === "image-generator" ? 10 : 50;
  const canAnalyze = charCount >= minChars;

  // 获取当前工具的点数消耗
  const getCurrentToolCost = () => {
    for (const category of navigationData) {
      const item = category.items.find(item => item.id === activeItem);
      if (item) return item.cost;
    }
    return 3; // 默认消耗
  };

  // 获取当前工具配置
  const getCurrentToolConfig = () => {
    return toolConfig[activeItem as keyof typeof toolConfig] || toolConfig["text-analysis"];
  };

  const toolCost = getCurrentToolCost();
  const hasEnoughPoints = userPoints >= toolCost;
  const currentTool = getCurrentToolConfig();

  // 检测文本中是否包含题干和选项
  const detectQuizOptions = (inputText: string) => {
    const text = inputText.trim();
    if (!text) return false;

    // 检测题干模式：以数字开头，后跟问号的问题
    const questionPattern = /^\d+\.\s+.*\?$/im;
    // 检测选项模式：包含 A. B. C. D. 或类似格式
    const optionPattern = /^[A-D]\.\s+/im;

    try {
      const hasQuestions = questionPattern.test(text);
      const hasOptions = optionPattern.test(text);

      return hasQuestions || hasOptions;
    } catch (error) {
      console.error('检测题干选项时出错:', error);
      return false;
    }
  };

  const handleAnalyze = async () => {
    if (canAnalyze && !isAnalyzing && hasEnoughPoints) {
      // 检测是否包含题干和选项
      if (activeItem === "text-analysis" && detectQuizOptions(text)) {
        alert('⚠️ 检测到您输入的内容包含题干和ABCD选项。\n\n请删除题干和选项，只输入英文文章原文。\n\nFred老师原创提示词需要纯文本才能生成高质量的深度分析内容。');
        return;
      }

      setIsAnalyzing(true);

      try {
        if (activeItem === "text-analysis") {
          // 阅读文本深度分析功能
          console.log('🚀 开始发送文本分析请求，文本长度:', text.length);
          console.log('📝 请求文本内容:', text);

          const response = await fetch('/api/ai/text-analysis', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('sb-access-token') || ''}`
            },
            body: JSON.stringify({
              text: text,
              analysisType: "comprehensive"
            }),
          });

          console.log('📡 收到响应，状态码:', response.status);
          const data = await response.json();
          console.log('📊 响应数据:', data);

          if (data.success) {
            console.log('✅ 文本分析成功！结果长度:', data.result?.length);
            setAnalysisResult(data.result);
            await refreshUser();
            alert(`文本分析完成！消耗 ${data.pointsCost} 个点数，剩余 ${data.remainingPoints} 个点数`);
          } else {
            console.error('❌ 文本分析失败:', data.error);
            alert(data.error || '文本分析失败，请稍后重试');
            await refreshUser();
          }
        } else if (activeItem === "cd-adaptation") {
          // CD篇改编功能
          const response = await fetch('/api/ai/cd-adaptation', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              // 添加认证头，确保请求能够通过后端的认证检查
              'Authorization': `Bearer ${localStorage.getItem('sb-access-token') || ''}`
            },
            body: JSON.stringify({
              text: text,
              version: "basic"
            }),
          });

          const data = await response.json();

          if (data.success) {
            setAnalysisResult(data.result);
            await refreshUser();
            alert(`改编完成！消耗 ${data.pointsCost} 个点数，剩余 ${data.remainingPoints} 个点数`);
          } else {
            alert(data.error || '改编失败，请稍后重试');
            // 如果失败，刷新用户状态
            await refreshUser();
          }
        } else if (activeItem === "image-generator") {
          // AI图片生成功能
          console.log('🎨 开始发送图片生成请求，提示词长度:', text.length);
          console.log('📝 提示词内容:', text);

          const response = await fetch('/api/ai/image-generator', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include', // 确保发送cookies
            body: JSON.stringify({
              prompt: text.trim(),
              max_images: 4 // 默认生成4张图片
            })
          });

          console.log('📡 收到连环画生成响应，状态码:', response.status);
          const data = await response.json();
          console.log('🎨 连环画生成响应数据:', data);

          if (data.success) {
            console.log('✅ 连环画生成成功！生成了', data.images?.length || 0, '张图片');

            // 构建图片展示HTML
            const imagesHtml = data.images?.map((img: any, index: number) => `
              <div style="margin: 20px 0; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
                <div style="background: #f5f5f5; padding: 10px; border-bottom: 1px solid #ddd;">
                  <h4 style="margin: 0; color: #333;">第 ${index + 1} 张</h4>
                </div>
                <div style="padding: 10px; text-align: center;">
                  <img src="${img.url}" alt="第${index + 1}张连环画" style="max-width: 100%; height: auto; border-radius: 4px;" />
                  <div style="margin-top: 10px;">
                    <a href="${img.url}" download="连环画第${index + 1}张.jpg" style="display: inline-block; padding: 8px 16px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; font-size: 14px;">下载图片</a>
                  </div>
                </div>
              </div>
            `).join('') || '';

            setAnalysisResult(`
# 🎨 生成的连环画

**提示词：** ${text}

**生成时间：** ${new Date().toLocaleString('zh-CN')}

**图片数量：** ${data.images?.length || 0}张

${imagesHtml}

---
            `);

            // 更新用户点数
            await refreshUser();

            // 显示成功消息
            alert(`✅ 连环画生成完成！
成功生成 ${data.images?.length || 0} 张图片，消耗 ${data.pointsCost} 个点数，请刷新查看最新点数。
💡 提示：点击每张图片下方的"下载图片"按钮可以单独下载图片。`);
          } else {
            console.error('❌ 连环画生成失败:', data.error);
            alert(data.error || '连环画生成失败，请稍后重试');
            await refreshUser();
          }
        } else {
          // 其他功能的原有逻辑
          // 扣除点数（这里需要根据实际情况调整）
          // setUserPoints(prev => prev - toolCost);

          // 模拟AI处理过程
          await new Promise(resolve => setTimeout(resolve, 3000));

          if (activeItem === "text-generator") {
        // 文本生成功能
        setAnalysisResult(`
# 📝 生成的英语阅读文章

## 主题：${text}

## 文章内容

**Introduction**
In today's rapidly evolving world, ${text.toLowerCase()} has become increasingly important for our daily lives and future development. This article explores the various aspects and implications of ${text.toLowerCase()} in modern society.

**Main Body**

${text === "环保" ? `
**Environmental Protection: Our Shared Responsibility**

Environmental protection is one of the most critical challenges facing humanity today. With growing concerns about climate change, pollution, and resource depletion, individuals and communities worldwide are taking action to preserve our planet for future generations.

**Key Areas of Environmental Protection:**

**1. Reducing Carbon Footprint**
- Adopting renewable energy sources
- Promoting public transportation
- Supporting sustainable consumption patterns

**2. Conservation of Natural Resources**
- Implementing recycling programs
- Protecting forests and oceans
- Preserving biodiversity hotspots

**3. Environmental Education**
- Raising awareness about climate issues
- Teaching sustainable practices in schools
- Community engagement initiatives

**The Impact of Individual Action**
Every person can contribute to environmental protection through simple daily choices. By reducing waste, conserving energy, and supporting eco-friendly products, we can collectively make a significant difference.

**Conclusion**
Environmental protection is not just a global issue—it's a personal responsibility. By working together and making conscious choices, we can create a sustainable future for all living beings on Earth.
` : text === "科技" ? `
**Technology: Transforming Our World**

Technology has fundamentally changed how we live, work, and interact with one another. From smartphones to artificial intelligence, technological innovations continue to reshape our daily experiences and open new possibilities for human achievement.

**Key Technological Advancements:**

**1. Communication Revolution**
- Instant global connectivity
- Social media platforms
- Video conferencing tools

**2. Healthcare Innovations**
- Telemedicine services
- Advanced diagnostic tools
- Personalized treatment approaches

**3. Educational Technology**
- Online learning platforms
- Interactive educational software
- Virtual reality classrooms

**Balancing Technology and Humanity**
While technology offers numerous benefits, it's essential to maintain a healthy balance between digital and real-world interactions. Mindful use of technology can enhance our lives without replacing human connections.

**Future Perspectives**
The future holds exciting technological developments, from quantum computing to space exploration. Embracing these changes while addressing ethical considerations will be crucial for creating a better tomorrow.
` : `
**${text.charAt(0).toUpperCase() + text.slice(1)}: Exploring New Perspectives**

The concept of ${text.toLowerCase()} encompasses various dimensions that affect our understanding and engagement with the world around us. By examining different aspects and applications, we can gain deeper insights into its significance and potential impact.

**Understanding the Fundamentals**
To truly appreciate ${text.toLowerCase()}, we must consider its historical context, current relevance, and future possibilities. This comprehensive approach allows us to develop a more nuanced perspective and make informed decisions.

**Practical Applications**
The principles of ${text.toLowerCase()} can be applied across numerous fields and disciplines. Whether in education, business, or personal development, understanding these concepts can lead to better outcomes and more effective strategies.

**Looking Ahead**
As we continue to explore and expand our knowledge of ${text.toLowerCase()}, new opportunities and challenges will emerge. Staying informed and adaptable will be key to navigating this evolving landscape successfully.
`}

**Vocabulary Focus:**
- Essential terms related to ${text.toLowerCase()}
- Academic vocabulary appropriate for intermediate learners
- Context-specific expressions and idioms

**Comprehension Questions:**
1. What is the main topic of this article?
2. How does ${text.toLowerCase()} affect our daily lives?
3. What are the key points discussed in the text?
4. What conclusions can be drawn from the information presented?

**Learning Objectives:**
- Understand the main concepts related to ${text.toLowerCase()}
- Develop reading comprehension skills
- Expand vocabulary in context
- Practice critical thinking and analysis

This article is designed for intermediate learners and includes approximately 450 words, making it suitable for classroom use or self-study.
        `);
      } else {
        // 原有的文本分析功能
        setAnalysisResult(`
# 📊 阅读理解深度分析报告

## 基本信息
- **字符总数**: ${charCount}
- **单词估计**: ${Math.ceil(charCount / 5)}
- **预估阅读时间**: ${Math.ceil(charCount / 200)} 分钟
- **分析级别**: 中级

## 语言特征分析

### 词汇复杂度
- **词汇丰富度**: 良好 (85/100)
- **学术词汇占比**: 12%
- **高频词汇使用**: 适中

### 句法结构
- **平均句长**: 18-22 词
- **复合句比例**: 35%
- **被动语态使用**: 8%

### 文体特征
- **正式程度**: 中上等
- **客观性**: 较强
- **逻辑连贯性**: 良好

## 教学建议

### 适用学习者水平
- ✅ 中级学习者 (B1-B2)
- ✅ 高中学生
- ⚠️ 需要适当简化给初级学习者

### 重点教学内容
1. **词汇教学**: 重点讲解学术词汇和专业术语
2. **语法重点**: 复合句结构、时态一致性
3. **阅读技巧**: 快速浏览、关键信息提取

### 练习建议
- 词汇配对练习
- 句型转换练习
- 段落概括练习
- 批判性思维讨论

## 改进建议
- 增加过渡词提升连贯性
- 适当增加具体例子
- 考虑分段优化可读性
        `);
          }
        }
      } catch (error) {
        console.error('处理失败:', error);
        alert('处理失败，请稍后重试');
        // 恢复点数
        if (activeItem !== "cd-adaptation") {
          await refreshUser();
        }
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  const loadSampleText = () => {
    if (activeItem === "text-generator") {
      setText("环保");
    } else if (activeItem === "cd-adaptation") {
      setText(`The rapid advancement of artificial intelligence has fundamentally transformed numerous industries and aspects of our daily lives. From healthcare and education to transportation and entertainment, AI technologies are revolutionizing how we approach complex problems and make critical decisions.

Machine learning algorithms can now process vast amounts of data to identify patterns that would be impossible for humans to detect manually. In healthcare, AI systems assist doctors in diagnosing diseases more accurately and developing personalized treatment plans. Educational platforms use AI to adapt learning materials to individual student needs, creating more effective and engaging learning experiences.

However, this technological revolution also brings significant challenges. Questions about data privacy, job displacement, and algorithmic bias have become increasingly important. As AI systems become more sophisticated, we must carefully consider their ethical implications and ensure they serve humanity's best interests.

The future of AI depends on our ability to balance innovation with responsibility, creating systems that enhance human capabilities while preserving human values and dignity.`);
    } else {
      setText(`The rapid advancement of artificial intelligence has fundamentally transformed numerous industries and aspects of our daily lives. From healthcare and education to transportation and entertainment, AI technologies are revolutionizing how we approach complex problems and make critical decisions.

Machine learning algorithms can now process vast amounts of data to identify patterns that would be impossible for humans to detect manually. In healthcare, AI systems assist doctors in diagnosing diseases more accurately and developing personalized treatment plans. Educational platforms use AI to adapt learning materials to individual student needs, creating more effective and engaging learning experiences.

However, this technological revolution also brings significant challenges. Questions about data privacy, job displacement, and algorithmic bias have become increasingly important. As AI systems become more sophisticated, we must carefully consider their ethical implications and ensure they serve humanity's best interests.

The future of AI depends on our ability to balance innovation with responsibility, creating systems that enhance human capabilities while preserving human values and dignity.`);
    }
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleItemClick = (categoryId: string, itemId: string) => {
    // 检查是否有独立路由
    const item = navigationData
      .find(cat => cat.id === categoryId)
      ?.items.find(item => item.id === itemId);
    
    if (item && (item as any).route) {
      // 使用 startTransition 包装导航，避免预取错误
      startTransition(() => {
        router.push((item as any).route);
      });
      return;
    }
    
    // 否则使用原来的逻辑
    setActiveItem(itemId);
    if (!expandedCategories.includes(categoryId)) {
      setExpandedCategories(prev => [...prev, categoryId]);
    }
  };

  const handlePurchasePoints = async () => {
    // 模拟购买点数
    await refreshUser();
  };

  const handleRedeemCode = async () => {
    if (!redemptionCode.trim()) {
      alert('请输入兑换码');
      return;
    }

    if (!currentUser) {
      alert('请先登录');
      return;
    }

    setIsRedeeming(true);
    
    try {
      // 使用Supabase服务进行兑换
      const result = await SupabasePointsService.redeemCode(currentUser.id, redemptionCode);

      if (result.success) {
        // 如果是积分兑换，直接更新点数，避免查询失败
        if (result.type === 'POINTS' && result.value) {
          await refreshUser();
        }

        setRedemptionCode("");
        setShowRedeemModal(false); // 关闭弹窗
        alert(result.message);
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('兑换失败:', error);
      alert('兑换失败，请检查兑换码是否正确');
    } finally {
      setIsRedeeming(false);
    }
  };

  


  // 水合错误保护：如果组件还未挂载，显示加载状态
  if (!isMounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">正在加载...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen transition-all duration-500 bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50">
      {/* 顶部导航栏 */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-gradient-to-r from-white via-gray-50 to-white transition-all duration-300 backdrop-blur-sm shadow-sm">
        <div className="flex h-16 items-center justify-between px-2 sm:px-4 md:px-6">
          {/* 左侧：Logo + 菜单按钮 + 英语格言 */}
          <div className="flex items-center gap-2 md:gap-4">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 transition-all duration-200 hover:scale-105"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div className="hidden sm:block">
              <LogoWithText size="normal" />
            </div>
            {/* 移动端简化Logo */}
            <div className="sm:hidden w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">AI</span>
            </div>

            {/* 英语格言组件 - 放在Logo右边 */}
            <div className="ml-2 lg:max-w-2xl flex-1">
              <EnglishMaxim />
            </div>
          </div>

          {/* 右侧：作者链接 + 点数兑换 + 点数记录 + 点数显示 + 用户按钮 */}
        <div className="flex items-center gap-1 md:gap-3">

          {/* 作者链接 */}
          <a
            href="https://mp.weixin.qq.com/s/gOy3tjONqVQhfPpXupc8Dw"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-600 hover:text-purple-600 transition-colors duration-200 hidden sm:inline-flex items-center gap-1"
          >
            <span>作者：英语教师佛瑞德</span>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>

          {/* 邀请有礼按钮 - 移动端使用图标模式 */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/invite')}
            className="border-purple-200 text-purple-600 hover:bg-purple-50 hover:text-purple-700"
          >
            <Gift className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">邀请有礼</span>
          </Button>

          {/* 每日奖励按钮 - 移动端使用图标模式 */}
          {currentUser && !dailyRewardClaimed && (
            <Button
              variant="default"
              size="sm"
              onClick={claimDailyReward}
              disabled={isClaimingReward}
              className={`bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white border-0 animate-pulse ${
                isClaimingReward ? 'opacity-50 cursor-not-allowed animate-none' : ''
              }`}
            >
              <span className="hidden sm:inline mr-2">{isClaimingReward ? '领取中...' : '每日奖励'}</span>
              <svg className="w-4 h-4 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
              </svg>
            </Button>
          )}

          {/* 点数兑换按钮 - 移动端使用图标模式 */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowRedeemModal(true)}
            className="border-border text-foreground hover:bg-secondary"
          >
            <span className="hidden sm:inline mr-2">点数兑换</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </Button>

            {/* 点数记录按钮 - 移动端使用图标模式 */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/points-history')}
              className="border-border text-foreground hover:bg-secondary"
            >
              <span className="hidden sm:inline mr-2">点数记录</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </Button>

  
            {/* 点数显示 - 移动端紧凑模式 */}
            <div className="flex items-center gap-1 sm:gap-2 bg-secondary rounded-lg px-2 sm:px-3 py-2 border border-border">
              <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-gradient-to-r from-primary to-blue-600 flex items-center justify-center">
                <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/>
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"/>
                </svg>
              </div>
              <span className="text-xs sm:text-sm font-semibold text-foreground">{userPoints}</span>
            </div>

         {/* 用户认证区域 */}
         {isLoadingUser ? (
           <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse" />
         ) : currentUser ? (
              <UserMenu />
         ) : (
           <div className="flex items-center gap-1 sm:gap-2">
             <span className="hidden sm:inline text-xs text-muted-foreground">
               请先登录使用AI功能
             </span>
             <Button
               size="sm"
               onClick={() => router.push('/auth/signin')}
               className="evolink-button"
             >
               <span className="hidden sm:inline">登录</span>
               <svg className="w-4 h-4 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
               </svg>
             </Button>
           </div>
         )}
          </div>
        </div>
      </header>

      <div className="flex">
        {/* 侧边栏 */}
        <aside className={`${
          sidebarCollapsed ? 'w-16' : 'w-64'
        } transition-all duration-300 border-r border-gray-200 bg-gradient-to-b from-white via-gray-50 to-gray-100 flex flex-col h-[calc(100vh-4rem)] sticky top-16 hidden md:flex z-40 flex-shrink-0`}>
          {!sidebarCollapsed && (
            <>
              {/* 分类导航 */}
              <div className="flex-1 overflow-hidden p-4 h-full max-h-[calc(100vh-200px)]">
                <nav className="space-y-1">
                  {navigationData.map((category) => (
                    <div key={category.id} className="mb-1">
                      <button
                        onClick={() => toggleCategory(category.id)}
                        className="w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-200 hover:bg-gray-100 group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-muted-foreground group-hover:text-purple-600 transition-colors duration-200">
                              {category.icon}
                            </span>
                            <div>
                              <h3 className="font-medium text-foreground text-sm">{category.title}</h3>
                            </div>
                          </div>
                          <svg
                            className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
                              expandedCategories.includes(category.id) ? 'rotate-90' : ''
                            }`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </button>

                      {/* 二级菜单 */}
                      <div className={`ml-6 mt-1 space-y-1 overflow-hidden transition-all duration-300 ${
                        expandedCategories.includes(category.id) ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                      }`}>
                        {category.items.map((item) => {
                          const isAvailable = !(item as any).disabled;
                          return (
                          <button
                            key={item.id}
                            onClick={() => isAvailable && handleItemClick(category.id, item.id)}
                            disabled={!isAvailable}
                            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-all duration-200 flex items-center justify-between group ${
                              isAvailable
                                ? 'bg-gradient-to-r from-purple-100 to-purple-50 text-purple-700 font-medium border border-purple-200 shadow-sm'
                                : 'text-gray-400 bg-gray-100 cursor-not-allowed opacity-60'
                            }`}
                          >
                            <span>{item.title}</span>
                            <span className={`text-xs px-2 py-1 rounded-full transition-all duration-200 ${
                              isAvailable
                                ? 'bg-purple-200 text-purple-700'
                                : 'bg-gray-300 text-gray-500'
                            }`}>
                              {isAvailable ? `${item.cost}点` : '敬请期待'}
                            </span>
                          </button>
                        );
                      })}
                      </div>
                    </div>
                  ))}
                </nav>
              </div>

              {/* 底部升级订阅区域 */}
              <div className="p-3 border-t border-border">
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-3 border border-amber-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">⭐</span>
                      <div className="evolink-heading text-foreground text-xs">专业版</div>
                    </div>
                    <Button size="sm" className="evolink-button text-xs px-3 h-8">
                      升级
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">解锁全部功能</p>
                </div>
              </div>
            </>
          )}

          {/* 折叠状态 */}
          {sidebarCollapsed && (
            <div className="flex flex-col items-center py-4 space-y-3">
              {navigationData.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSidebarCollapsed(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 text-muted-foreground transition-all duration-200 hover:scale-105"
                  title={category.title}
                >
                  {category.icon}
                </button>
              ))}
              
              {/* 折叠状态下的功能按钮 */}
              <div className="border-t border-border w-full pt-3">
                <button
                  className="p-2 rounded-lg hover:bg-amber-50 text-amber-600 transition-all duration-200 hover:scale-105 w-full"
                  title="升级专业版"
                >
                  ⭐
                </button>
              </div>
            </div>
          )}
        </aside>

        {/* 移动端侧边栏覆盖层 */}
        {!sidebarCollapsed && (
          <div className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setSidebarCollapsed(true)}>
            <aside className="w-64 bg-white h-full shadow-xl transform transition-transform duration-300">
              {/* 移动端侧边栏内容与桌面端相同 */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-semibold text-gray-900">功能导航</h2>
                  <button onClick={() => setSidebarCollapsed(true)} className="p-2 rounded-lg hover:bg-gray-100">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                {/* 导航内容 */}
                <nav className="space-y-1">
                  {navigationData.map((category) => (
                    <div key={category.id} className="mb-1">
                      <button
                        onClick={() => toggleCategory(category.id)}
                        className="w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-200 hover:bg-gray-100 group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-muted-foreground group-hover:text-purple-600 transition-colors duration-200">
                              {category.icon}
                            </span>
                            <div>
                              <h3 className="font-medium text-foreground text-sm">{category.title}</h3>
                            </div>
                          </div>
                          <svg
                            className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
                              expandedCategories.includes(category.id) ? 'rotate-90' : ''
                            }`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </button>

                      <div className={`ml-6 mt-1 space-y-1 overflow-hidden transition-all duration-300 ${
                        expandedCategories.includes(category.id) ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                      }`}>
                        {category.items.map((item) => {
                          const isAvailable = !(item as any).disabled;
                          return (
                          <button
                            key={item.id}
                            onClick={() => {
                              if (isAvailable) {
                                handleItemClick(category.id, item.id);
                                setSidebarCollapsed(true);
                              }
                            }}
                            disabled={!isAvailable}
                            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-all duration-200 flex items-center justify-between group ${
                              isAvailable
                                ? 'bg-gradient-to-r from-purple-100 to-purple-50 text-purple-700 font-medium border border-purple-200 shadow-sm'
                                : 'text-gray-400 bg-gray-100 cursor-not-allowed opacity-60'
                            }`}
                          >
                            <span>{item.title}</span>
                            <span className={`text-xs px-2 py-1 rounded-full transition-all duration-200 ${
                              isAvailable
                                ? 'bg-purple-200 text-purple-700'
                                : 'bg-gray-300 text-gray-500'
                            }`}>
                              {isAvailable ? `${item.cost}点` : '敬请期待'}
                            </span>
                          </button>
                        );
                      })}
                      </div>
                    </div>
                  ))}
                </nav>
              </div>
            </aside>
          </div>
        )}

        {/* 主内容区 */}
        <main className="flex-1 bg-white transition-all duration-300 lg:min-h-0">
          <div className="min-h-[calc(100vh-4rem)] flex flex-col lg:flex-row lg:overflow-hidden gap-0 lg:h-[calc(100vh-4rem)]">
            {/* 左半部分：工具配置区 */}
            <div className="w-full lg:w-5/12 bg-white lg:border-r border-gray-200 flex flex-col lg:overflow-hidden min-h-[60vh]">
              {/* 工具信息卡片 */}
              <div className="p-2 md:p-3 border-b border-gray-200">
                <div className="flex items-start gap-2">
                  <div className="w-8 h-8 rounded bg-gradient-to-br from-purple-100 to-purple-50 flex items-center justify-center flex-shrink-0 mt-1 border border-purple-200">
                    {currentTool.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1 mb-0.5">
                      <h2 className="text-base font-semibold text-gray-900">
                        {currentTool.title}
                      </h2>
                      <span className="bg-gradient-to-r from-purple-100 to-purple-50 text-purple-700 text-xs px-1.5 py-0.5 rounded-full border border-purple-200 font-medium">
                        {toolCost} 点数
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-tight">
                      {currentTool.description}
                    </p>
                  </div>
                  <button className="p-1 rounded hover:bg-gray-100 transition-colors duration-200">
                    <svg className="w-4 h-4 text-muted-foreground" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* 参数配置区 */}
              <div className="flex-1 p-3 md:p-4 lg:p-6 overflow-y-auto lg:max-h-[calc(100vh-12rem)] lg:min-h-0">
                <div className="space-y-4 md:space-y-6">
                  
                  {/* 文本输入 */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      {activeItem === "text-generator" ? "输入要求" :
                       activeItem === "cd-questions" ? "开始改编" : "文章内容"}
                    </label>
                    
                    {/* CD篇改编的特殊提示 */}
                    {activeItem === "cd-adaptation" && (
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3 mb-3">
                        <div className="flex items-start gap-2">
                          <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <svg className="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-blue-900 mb-1">💡 使用提示</h4>
                            <div className="text-xs text-blue-700 space-y-1">
                              <p>• 请粘贴完整的英文文章内容</p>
                              <p>• 支持各种类型的英文文章（新闻、学术、科普等）</p>
                              <p>• AI将自动改编为适合中国高中生阅读的版本</p>
                              <p>• 改编后的文章将符合课标词汇和语法要求</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="relative">
                      <Textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder={currentTool.placeholder}
                        className={`${activeItem === "cd-adaptation" ? "min-h-[450px] md:min-h-[550px]" : "min-h-[350px] md:min-h-[450px]"} text-sm border-gray-300 focus:border-purple-500 focus:ring-purple-500 resize-none transition-all duration-200`}
                        maxLength={maxChars}
                      />
                      {/* OCR小按钮 */}
                      <div className="absolute top-2 right-2 flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-70 hover:opacity-100"
                          onClick={() => imageInputRef.current?.click()}
                          title="上传图片"
                        >
                          📁
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-70 hover:opacity-100"
                          onClick={() => setIsCameraOpen(true)}
                          title="拍照识别"
                        >
                          📷
                        </Button>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          ref={imageInputRef}
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </div>
                      <div className="absolute bottom-2 right-2 text-xs text-muted-foreground bg-white px-2 py-1 rounded border">
                        {charCount}/{maxChars}
                      </div>
                    </div>

                    {/* 文本分析功能的特殊提示 */}
                    {activeItem === "text-analysis" && (
                      <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex items-start space-x-2">
                          <span className="text-amber-600 text-lg">📝</span>
                          <div className="text-xs text-amber-700">
                            <p className="font-medium mb-1">重要提醒：</p>
                            <ul className="list-disc list-inside space-y-1 text-amber-600">
                              <li>请只输入英文文章原文，不要包含题干和ABCD选项</li>
                              <li>Fred老师原创提示词需要纯文本才能生成最佳分析效果</li>
                              <li>如果检测到题干选项，系统会自动提醒您修改</li>
                            </ul>
                            <div className="mt-2 pt-2 border-t border-amber-200">
                              <p className="text-amber-700 font-medium">
                                <span className="text-amber-600">⚠️</span> 该功能只适用于全国卷、北京卷、天津卷、上海卷等风格的阅读题
                              </p>
                              <p className="text-amber-600 mt-1">
                                不适合段落较多的课文文章，如需剖析课文，请访问
                                <a
                                  href="/tools/reading/textbook_passage_analysis"
                                  className="text-blue-600 hover:text-blue-800 underline ml-1"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  课本文章分析
                                </a>
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                                      </div>

  
                  {/* CD篇改编的图片识别功能 */}
                  {activeItem === "cd-adaptation" && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        图片文字识别 (最多3张)
                      </label>
                      
                      {/* 图片上传区域 */}
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
                        <div className="flex flex-col items-center justify-center space-y-3">
                          <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full">
                            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div className="text-center">
                            <p className="text-sm text-gray-600 mb-2">点击上传图片或拖拽图片到此处</p>
                            <p className="text-xs text-gray-500">支持 JPG、PNG、GIF 格式，每张图片不超过 10MB</p>
                            <p className="text-xs text-blue-600 mt-1">📝 功能：识别图片中的文字内容</p>
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleImageUpload}
                            className="hidden"
                            id="image-upload"
                            ref={imageInputRef}
                          />
                          <label
                            htmlFor="image-upload"
                            className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 text-sm font-medium"
                          >
                            选择图片
                          </label>
                        </div>
                        
                        {/* 已上传的图片预览 */}
                        {uploadedImages.length > 0 && (
                          <div className="mt-4">
                            <div className="grid grid-cols-3 gap-2">
                              {uploadedImages.map((image, index) => (
                                <div key={index} className="relative group">
                                  <img
                                    src={image.preview}
                                    alt={`Uploaded image ${index + 1}`}
                                    className="w-full h-20 object-cover rounded-lg border border-gray-200"
                                  />
                                  <button
                                    onClick={() => removeImage(index)}
                                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition-colors duration-200"
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                            </div>
                            
                            {/* 识别按钮 */}
                            <div className="mt-3 flex justify-end">
                              <button
                                onClick={handleImageRecognition}
                                disabled={isRecognizing || uploadedImages.length === 0}
                                className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors duration-200 text-sm font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                              >
                                {isRecognizing ? (
                                  <>
                                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    文字识别中... ({uploadedImages.length}张)
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                    识别文字 ({uploadedImages.length}张)
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  </div>
              </div>

              {/* 底部操作区 */}
              <div className="p-3 md:p-4 lg:p-6 border-t border-gray-200 bg-gray-50">
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      {canAnalyze ? (
                        hasEnoughPoints ? (
                          <div className="flex items-center gap-1 text-green-600">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span className="font-medium">准备就绪</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-orange-600">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <span>需要 {toolCost} 点数</span>
                          </div>
                        )
                      ) : (
                        <div className="flex items-center gap-1 text-gray-500">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                          <span>需要至少 {minChars} 个字符</span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={loadSampleText}
                      className="flex items-center gap-1 text-purple-600 hover:text-purple-700 font-medium transition-colors duration-200"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      加载示例
                    </button>
                  </div>

                  {!hasEnoughPoints && canAnalyze && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-amber-700 text-sm">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span>点数不足，需要 {toolCost} 点数</span>
                        <button
                          onClick={handlePurchasePoints}
                          className="ml-auto text-amber-600 hover:text-amber-700 font-medium underline"
                        >
                          立即充值
                        </button>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={handleAnalyze}
                    disabled={!canAnalyze || isAnalyzing || !hasEnoughPoints}
                    className={`w-full h-12 font-medium text-base transition-all duration-300 ${
                      canAnalyze && !isAnalyzing && hasEnoughPoints
                        ? 'evolink-button'
                        : 'bg-secondary text-muted-foreground cursor-not-allowed'
                    }`}
                  >
                    {isAnalyzing ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {currentTool.analysisText}
                      </>
                    ) : canAnalyze ? (hasEnoughPoints ? currentTool.buttonText : `需要 ${toolCost} 点数`) : (activeItem === "text-generator" ? '输入生成要求' : activeItem === "cd-questions" ? '开始改编' : activeItem === "image-generator" ? '输入提示词' : '输入文章内容')}
                  </Button>
                </div>
              </div>
            </div>

            {/* 右半部分：结果展示区 */}
            <div className="flex-1 flex flex-col lg:overflow-hidden bg-gray-50 min-h-[40vh]">
              {/* 结果展示内容 */}
              <div className="flex-1 overflow-y-auto">
                {!analysisResult && !isAnalyzing ? (
                  <div className="h-full flex items-center justify-center p-4 md:p-6 lg:p-8">
                    <div className="text-center max-w-md animate-fade-in">
                      <div className="w-24 h-24 rounded-full bg-card flex items-center justify-center mx-auto mb-6 border border-border shadow-lg">
                        <svg className="w-12 h-12 text-primary" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.5 4a.5.5 0 01.5.5v4a.5.5 0 01-.5.5h-9a.5.5 0 01-.5-.5v-4a.5.5 0 01.5-.5h9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <h3 className="text-xl evolink-heading text-foreground mb-3">
                        {activeItem === "cd-adaptation" ? "准备开始改编" : activeItem === "image-generator" ? "准备开始生成连环画" : "准备开始分析"}
                      </h3>
                      <p className="text-muted-foreground leading-relaxed">
                        {activeItem === "cd-adaptation" ? (
                          <>在左侧输入您要改编的英文文章，选择大语言模型，点击"开始改编"按钮，
                          AI将为您生成适合中国高中生阅读的改编版本。</>
                        ) : activeItem === "image-generator" ? (
                          <>在左侧输入详细的提示词，描述您想要生成的连环画内容，点击"开始生成连环画"按钮，
                          AI将为您生成一组精美的连贯插画。</>
                        ) : (
                          <>在左侧输入您的英语文章，选择分析参数，点击"开始神奇分析"按钮，
                          AI将为您生成详细的语言分析报告。</>
                        )}
                      </p>
                    </div>
                  </div>
                ) : isAnalyzing ? (
                  <div className="h-full flex items-center justify-center p-4 md:p-6 lg:p-8">
                    <div className="text-center animate-pulse">
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-100 to-purple-50 flex items-center justify-center mx-auto mb-6 border border-purple-200 shadow-lg">
                        <svg className="animate-spin w-12 h-12 text-purple-600" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </div>
                      <h3 className="text-xl font-semibold text-foreground mb-3">AI正在深度分析中</h3>
                      <div className="text-center space-y-2">
                        <p className="text-muted-foreground">
                          Fred老师正在进行详细的文本分析...
                        </p>
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                          <p className="text-amber-800 text-sm font-medium">
                            ⏱️ 预计需要约3分钟，请耐心等待
                          </p>
                          <p className="text-amber-700 text-xs mt-1">
                            AI正在生成全文解读、文章中心思想、段落分析等详细内容
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 md:p-4 lg:p-6 animate-slide-up flex flex-col lg:h-[calc(100vh-6rem)] min-h-[50vh]">
                    {/* 结果展示区域 */}
                    <div className="flex-1 min-h-0">
                      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6 lg:p-8 h-full overflow-hidden">
                        <div className="max-w-none max-h-[calc(100vh-10rem)] overflow-y-auto text-sm leading-relaxed" style={{ fontSize: '0.875rem', lineHeight: '1.6' }}>
                          {activeItem === "image-generator" ? (
                            // AI图片生成工具 - 直接渲染HTML
                            <div dangerouslySetInnerHTML={{
                              __html: analysisResult || ''
                            }} />
                          ) : (
                            // 其他工具 - 保持原有的格式化逻辑
                            <div dangerouslySetInnerHTML={{
                              __html: (analysisResult || '')
                                .replace(/\n/g, '<br>')
                                .replace(/# (.*)/g, '<div style="color: #1f2937; font-size: 0.875rem; font-weight: 700; margin-bottom: 0.75rem; line-height: 1.6;">$1</div>')
                                .replace(/## (.*)/g, '<div style="color: #374151; font-size: 0.875rem; font-weight: 600; margin: 1rem 0 0.5rem 0; line-height: 1.6;">$1</div>')
                                .replace(/### (.*)/g, '<div style="color: #6b7280; font-size: 0.875rem; font-weight: 600; margin: 0.75rem 0 0.25rem 0; line-height: 1.6;">$1</div>')
                                .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #1f2937; font-weight: 600;">$1</strong>')
                                .replace(/- (.*)/g, '<div style="margin: 0.25rem 0; padding-left: 1rem; line-height: 1.6;">• $1</div>')
                                .replace(/(\d+)\. (.*)/g, '<div style="margin: 0.25rem 0; padding-left: 1rem; line-height: 1.6;">$1. $2</div>')
                                .replace(/✅/g, '<span style="color: #10b981;">✅</span>')
                                .replace(/⚠️/g, '<span style="color: #f59e0b;">⚠️</span>')
                            }} />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 复制和导出按钮 - 固定在底部 */}
                    {["text-analysis", "cd-adaptation", "text-generator"].includes(activeItem) && (
                      <div className="mt-3 md:mt-4 flex flex-wrap gap-2 md:gap-3 justify-center flex-shrink-0">
                        <Button
                          onClick={copyToClipboard}
                          disabled={isCopying}
                          className="evolink-button flex items-center gap-2"
                        >
                          {isCopying ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              复制中...
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              一键复制
                            </>
                          )}
                        </Button>

                        <Button
                          onClick={exportToTxt}
                          className="evolink-button flex items-center gap-2 bg-green-600 hover:bg-green-700"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          导出TXT
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

  
      {/* 点数兑换弹窗 */}
      {showRedeemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl border border-border p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">点数兑换</h3>
              <button
                onClick={() => setShowRedeemModal(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">🎁</span>
                  <div className="text-sm text-muted-foreground">
                    输入兑换码可获得免费点数
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Input
                    value={redemptionCode}
                    onChange={(e) => setRedemptionCode(e.target.value)}
                    placeholder="请输入兑换码"
                    className="flex-1 border-blue-300 focus:border-primary focus:ring-primary"
                    disabled={isRedeeming}
                  />
                  <Button
                    onClick={handleRedeemCode}
                    disabled={isRedeeming || !redemptionCode.trim()}
                    className="evolink-button px-6"
                  >
                    {isRedeeming ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        兑换中
                      </>
                    ) : (
                      '兑换'
                    )}
                  </Button>
                </div>
              </div>
              
              <div className="text-xs text-muted-foreground text-center">
                兑换成功后点数将自动添加到您的账户
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OCR overlay - 参考reading-generator的简洁实现 */}
      {isCameraOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-4 space-y-4">
            {photo ? (
              <img src={photo} alt="photo" className="w-full" />
            ) : (
              <video ref={videoRef} autoPlay playsInline className="w-full h-48 object-cover" />
            )}
            <canvas ref={canvasRef} className="hidden" />
            <div className="flex justify-between">
              {!photo && <Button onClick={takePhoto} size="sm">拍照</Button>}
              {photo && <Button onClick={() => recognizeText([photo])} size="sm" disabled={isRecognizing}>{isRecognizing ? '识别中' : 'OCR识别'}</Button>}
              <Button variant="outline" size="sm" onClick={() => { setIsCameraOpen(false); stopCamera(); setPhoto(null); }}>关闭</Button>
            </div>
          </div>
        </div>
      )}
      {/* OCR recognizing overlay */}
      {isRecognizing && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]">
          <div className="bg-white px-6 py-4 rounded-lg shadow-lg text-center space-y-3">
            <div className="flex justify-center">
              <svg className="animate-spin h-6 w-6 text-purple-600" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
            </div>
            <p className="text-sm text-gray-700">识图中，请稍等...</p>
          </div>
        </div>
      )}

      {/* 移动端浮动邀请按钮 */}
      <div className="fixed bottom-6 right-6 md:hidden z-40">
        <button
          onClick={() => router.push('/invite')}
          className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 flex items-center gap-2"
        >
          <Gift className="w-5 h-5" />
          <span className="text-sm font-medium">邀请有礼</span>
        </button>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes slide-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }

        .animate-slide-up {
          animation: slide-up 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}
