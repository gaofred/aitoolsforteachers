import { compressImageWithCanvas, supportsCanvasCompression, CanvasCompressionOptions } from './canvas-compressor';

// 尝试导入 compressorjs 作为备用方案
let Compressor: any = null;
try {
  Compressor = require('compressorjs');
  console.log('✅ compressorjs 备用方案加载成功:', typeof Compressor);
} catch (error) {
  console.log('⚠️ compressorjs 不可用，将使用Canvas压缩:', error);
}

export interface CompressionOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  quality?: number;
  useWebWorker?: boolean;
  preferCanvas?: boolean; // 优先使用Canvas压缩
}

/**
 * 压缩图片，确保OCR识别质量
 * @param file - 要压缩的图片文件
 * @param options - 压缩选项
 * @returns Promise<File> 压缩后的文件
 */
export async function compressImageForOCR(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const defaultOptions: CompressionOptions = {
    maxSizeMB: 0.3, // 目标300KB，确保不超过Vercel限制
    maxWidthOrHeight: 800, // 更激进的分辨率降低
    quality: 0.3, // 更激进的质量降低
    useWebWorker: false, // 禁用Web Worker，避免兼容性问题
    preferCanvas: true, // 优先使用Canvas压缩
  };

  const finalOptions = { ...defaultOptions, ...options };

  console.log('🔧 智能压缩配置:', {
    原始文件: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
    最终配置: finalOptions,
  });

  // 优先使用Canvas压缩方案（浏览器原生，更稳定）
  if (finalOptions.preferCanvas && supportsCanvasCompression()) {
    console.log('🎨 使用Canvas压缩方案（浏览器原生）...');
    console.log('📊 压缩前文件信息:', {
      文件名: file.name,
      原始大小: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
      目标大小: `${finalOptions.maxSizeMB}MB`,
      目标质量: finalOptions.quality,
      最大尺寸: finalOptions.maxWidthOrHeight
    });
    try {
      const canvasOptions: CanvasCompressionOptions = {
        maxSizeMB: finalOptions.maxSizeMB,
        maxWidthOrHeight: finalOptions.maxWidthOrHeight,
        quality: finalOptions.quality,
        mimeType: 'image/jpeg'
      };

      const result = await compressImageWithCanvas(file, canvasOptions);
      console.log('✅ Canvas压缩成功！压缩后大小:', `${(result.size / 1024 / 1024).toFixed(2)}MB`);
      return result;
    } catch (error) {
      console.error('❌ Canvas压缩失败，尝试备用方案:', error);
    }
  }

  // 备用方案：使用compressorjs
  if (Compressor) {
    console.log('🔧 使用compressorjs备用方案...');
    return new Promise((resolve, reject) => {
      new (Compressor as any)(file, {
        ...finalOptions,
        success(result) {
          console.log('✅ compressorjs压缩成功:', {
            原始大小: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
            压缩后: `${(result.size / 1024 / 1024).toFixed(2)}MB`,
            压缩率: `${((1 - result.size / file.size) * 100).toFixed(1)}%`,
          });
          resolve(result as File);
        },
        error(err) {
          console.error('❌ compressorjs压缩失败:', err);
          reject(new Error(`图片压缩失败: ${err.message}`));
        },
      });
    });
  }

  // 所有方案都失败，返回原文件
  console.warn('⚠️ 所有压缩方案都不可用，返回原文件');
  return file;
}

/**
 * 批量压缩图片
 * @param files - 图片文件数组
 * @param options - 压缩选项
 * @param onProgress - 进度回调 (index, total, compressedFile)
 * @returns Promise<File[]> 压缩后的文件数组
 */
export async function compressImagesForOCR(
  files: File[],
  options: CompressionOptions = {},
  onProgress?: (index: number, total: number, compressedFile: File) => void
): Promise<File[]> {
  const compressedFiles: File[] = [];
  const defaultOptions = { preferCanvas: true, ...options };

  console.log(`📦 开始批量压缩 ${files.length} 张图片，使用Canvas优先方案...`);

  for (let i = 0; i < files.length; i++) {
    try {
      const compressedFile = await compressImageForOCR(files[i], defaultOptions);
      compressedFiles.push(compressedFile);

      if (onProgress) {
        onProgress(i + 1, files.length, compressedFile);
      }
    } catch (error) {
      console.error(`❌ 批量压缩第 ${i + 1} 张图片失败:`, error);
      // 如果压缩失败，使用原文件
      compressedFiles.push(files[i]);

      if (onProgress) {
        onProgress(i + 1, files.length, files[i]);
      }
    }
  }

  // 统计压缩结果
  const totalOriginalSize = files.reduce((sum, file) => sum + file.size, 0);
  const totalCompressedSize = compressedFiles.reduce((sum, file) => sum + file.size, 0);
  const overallCompressionRate = ((1 - totalCompressedSize / totalOriginalSize) * 100).toFixed(1);

  console.log(`📊 批量压缩完成:`, {
    总数: `${files.length}张`,
    原始总大小: `${(totalOriginalSize / 1024 / 1024).toFixed(2)}MB`,
    压缩后总大小: `${(totalCompressedSize / 1024 / 1024).toFixed(2)}MB`,
    总压缩率: `${overallCompressionRate}%`
  });

  return compressedFiles;
}

/**
 * 检查图片是否需要压缩
 * @param file - 图片文件
 * @param options - 压缩选项
 * @returns Promise<boolean> 是否需要压缩
 */
export function needsCompression(
  file: File,
  options: CompressionOptions = {}
): Promise<boolean> {
  const { maxSizeMB = 0.8, maxWidthOrHeight = 1600 } = options;

  // 检查文件大小 - 800KB以上就开始压缩
  const fileSizeMB = file.size / (1024 * 1024);
  if (fileSizeMB > maxSizeMB) {
    console.log(`图片 ${file.name} 需要压缩: ${fileSizeMB.toFixed(2)}MB > ${maxSizeMB}MB`);
    return Promise.resolve(true);
  }

  // 检查是否在浏览器环境
  if (typeof window === 'undefined' || typeof Image === 'undefined' || typeof URL === 'undefined') {
    // 服务端环境，无法检查图片尺寸，基于文件大小判断
    return Promise.resolve(false);
  }

  // 检查图片尺寸（需要创建Image对象来获取）
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.onload = () => {
        const needsResize = img.width > maxWidthOrHeight || img.height > maxWidthOrHeight;
        resolve(needsResize);
        // 清理内存
        if (img.src && img.src.startsWith('blob:')) {
          URL.revokeObjectURL(img.src);
        }
      };
      img.onerror = () => resolve(false);
      img.src = URL.createObjectURL(file);
    } catch (error) {
      console.error('检查图片尺寸失败:', error);
      resolve(false);
    }
  });
}

/**
 * 预压缩图片（在文件上传前检查）
 * @param file - 图片文件
 * @returns Promise<File> 压缩后的文件
 */
export async function preCompressImage(file: File): Promise<File> {
  try {
    const shouldCompress = await needsCompression(file);

    if (shouldCompress) {
      console.log(`压缩图片: ${file.name}, 原始大小: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
      const compressed = await compressImageForOCR(file);
      console.log(`压缩完成: ${compressed.name}, 压缩后大小: ${(compressed.size / 1024 / 1024).toFixed(2)}MB`);
      return compressed;
    }

    return file;
  } catch (error) {
    console.error('预压缩失败，使用原文件:', error);
    return file;
  }
}

/**
 * 自适应多轮压缩，确保文件大小达标
 * @param file - 要压缩的图片文件
 * @param targetSizeMB - 目标文件大小（MB）
 * @param maxAttempts - 最大尝试次数
 * @returns Promise<File> 压缩后的文件
 */
export async function adaptiveCompressImage(
  file: File,
  targetSizeMB: number = 0.5,
  maxAttempts: number = 3
): Promise<File> {
  console.log(`🎯 开始自适应压缩，目标: ${targetSizeMB}MB，原文件: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
  console.log(`🎯 自适应压缩 - 文件详情:`, {
    文件名: file.name,
    文件类型: file.type,
    原始大小: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
    目标大小: `${targetSizeMB}MB`,
    最大尝试次数: maxAttempts
  });

  let currentFile = file;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`🔄 第${attempt}轮压缩...`);

    // 计算当前轮次的压缩参数
    const currentSizeMB = currentFile.size / 1024 / 1024;

    // 如果已经达到目标，直接返回
    if (currentSizeMB <= targetSizeMB) {
      console.log(`✅ 压缩目标达成！当前大小: ${(currentSizeMB).toFixed(2)}MB`);
      return currentFile;
    }

    // 动态调整压缩参数
    const qualityReduction = 0.8 - (attempt - 1) * 0.2; // 0.6, 0.4, 0.2
    const resolutionReduction = 1200 - (attempt - 1) * 300; // 1200, 900, 600

    const compressionOptions = {
      maxSizeMB: targetSizeMB,
      maxWidthOrHeight: Math.max(600, resolutionReduction),
      quality: Math.max(0.2, qualityReduction),
      preferCanvas: true
    };

    try {
      currentFile = await compressImageForOCR(currentFile, compressionOptions);
      console.log(`第${attempt}轮压缩结果: ${(currentFile.size / 1024 / 1024).toFixed(2)}MB`);
    } catch (error) {
      console.error(`第${attempt}轮压缩失败:`, error);
      break;
    }
  }

  const finalSizeMB = currentFile.size / 1024 / 1024;
  const success = finalSizeMB <= targetSizeMB;

  console.log(`🎯 自适应压缩完成:`, {
    原始大小: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
    最终大小: `${finalSizeMB.toFixed(2)}MB`,
    目标大小: `${targetSizeMB}MB`,
    压缩率: `${((1 - currentFile.size / file.size) * 100).toFixed(1)}%`,
    结果: success ? '✅ 成功' : '⚠️ 未达目标但已尽力'
  });

  return currentFile;
}

/**
 * 获取压缩方案信息
 */
export function getCompressionInfo() {
  return {
    canvas: {
      available: supportsCanvasCompression(),
      description: '浏览器原生Canvas压缩，无需依赖，兼容性好'
    },
    compressorjs: {
      available: !!Compressor,
      description: '第三方压缩库，功能丰富但需要加载'
    },
    sharp: {
      available: false, // 服务端方案
      description: '服务端高质量压缩，需要Node.js环境'
    }
  };
}