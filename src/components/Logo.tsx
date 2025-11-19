import Image from "next/image";

export function Logo({ size = "normal" }: { size?: "small" | "normal" | "large" }) {
  const sizeClasses = {
    small: "w-6 h-6",
    normal: "w-8 h-8",
    large: "w-12 h-12"
  };

  return (
    <div className={`relative ${sizeClasses[size]} rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg overflow-hidden`}>
      {/* 英文字母 E */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-white font-bold" style={{
          fontSize: size === "small" ? "10px" : size === "normal" ? "14px" : "18px",
          fontFamily: "'Inter', sans-serif",
          letterSpacing: "-0.5px"
        }}>
          ENG
        </span>
      </div>

      {/* AI图标装饰 */}
      <div className="absolute top-0.5 right-0.5 w-2 h-2 bg-yellow-400 rounded-full opacity-80"></div>
      <div className="absolute bottom-0.5 left-0.5 w-1.5 h-1.5 bg-green-400 rounded-full opacity-80"></div>
    </div>
  );
}

export function LogoWithText({ size = "normal" }: { size?: "small" | "normal" | "large" }) {
  const textSizes = {
    small: "text-sm",
    normal: "text-lg md:text-xl",
    large: "text-2xl"
  };

  return (
    <div className="flex items-center gap-2 md:gap-3">
      <Logo size={size} />
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <h1 className={`${textSizes[size]} font-bold text-foreground truncate`} style={{ fontFamily: "'Inter', sans-serif" }}>
            英语AI教学工具
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            v0.1
          </span>
          {size === "large" && (
            <span className="text-xs text-muted-foreground">
              • Professional English Teaching Assistant
            </span>
          )}
        </div>
      </div>
    </div>
  );
}