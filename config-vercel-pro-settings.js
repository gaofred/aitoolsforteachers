/**
 * Vercel Pro计划配置
 * 升级Pro后使用这些高质量设置
 *
 * 升级步骤:
 * 1. 访问 https://vercel.com/dashboard
 * 2. 选择项目 → Settings → Billing
 * 3. 升级到 Pro Plan ($20/月)
 * 4. 部署新代码
 */

// Vercel Pro 优化的压缩设置
export const VERCEL_PRO_COMPRESSION_SETTINGS = {
  // 批量应用文OCR设置
  batchApplicationOCR: {
    maxSizeMB: 6,           // Pro计划支持50MB限制
    maxWidthOrHeight: 3072, // 高分辨率保证文字清晰
    quality: 0.95,          // 高质量压缩
  },

  // 作文OCR测试页面设置
  essayOCRUploader: {
    maxSizeMB: 8,           // 更大文件支持
    maxWidthOrHeight: 4096, // 最高分辨率
    quality: 0.98,          // 最佳质量
  }
};

// 应用到 BatchImageUploader.tsx
export const BATCH_COMPRESSION_CONFIG = {
  maxSizeMB: 6,
  maxWidthOrHeight: 3072,
  quality: 0.95
};

// 应用到 EssayOCRUploader.tsx
export const ESSAY_COMPRESSION_CONFIG = {
  maxSizeMB: 8,
  maxWidthOrHeight: 4096,
  quality: 0.98
};

// 升级后替换的代码模板
export const PRO_PLAN_UPGRADE_TEMPLATE = `
// 在 BatchImageUploader.tsx 中替换第96-101行
const compressedFile = await compressImageForOCR(image.originalFile, {
  maxSizeMB: 6,           // Vercel Pro 支持50MB限制
  maxWidthOrHeight: 3072, // 高分辨率保证文字清晰
  quality: 0.95,          // 高质量压缩
});

// 在 EssayOCRUploader.tsx 中替换第101-105行
const compressedFile = await compressImageForOCR(image.originalFile, {
  maxSizeMB: 8,           // Pro计划支持更大文件
  maxWidthOrHeight: 4096, // 最高分辨率
  quality: 0.98,          // 最佳质量
});
`;

console.log('🚀 Vercel Pro配置已准备就绪！');
console.log('💰 升级Pro计划: https://vercel.com/dashboard');
console.log('📈 Pro计划优势:');
console.log('   - 请求体限制: 4.5MB → 50MB');
console.log('   - 超时时间: 10秒 → 60秒');
console.log('   - 更好的性能和稳定性');