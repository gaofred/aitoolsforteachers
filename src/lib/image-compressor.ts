import Compressor from 'compressorjs';
console.log('✅ compressorjs 直接导入成功:', typeof Compressor);

export interface CompressionOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  quality?: number;
  useWebWorker?: boolean;
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
  if (!Compressor) {
    console.error('❌ compressorjs 不可用，跳过图片压缩');
    return file;
  }

  const defaultOptions: CompressionOptions = {
    maxSizeMB: 0.5, // 进一步降低到500KB，确保强制压缩
    maxWidthOrHeight: 1200, // 进一步降低分辨率
    quality: 0.5, // 进一步降低质量
    useWebWorker: false, // 禁用Web Worker，避免兼容性问题
  };

  const finalOptions = { ...defaultOptions, ...options };

  console.log('🔧 压缩配置:', {
    原始文件: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
    最终配置: finalOptions,
  });

  return new Promise((resolve, reject) => {
    new (Compressor as any)(file, {
      ...finalOptions,
      success(result) {
        console.log('✅ 压缩成功:', {
          原始大小: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
          压缩后: `${(result.size / 1024 / 1024).toFixed(2)}MB`,
          压缩率: `${((1 - result.size / file.size) * 100).toFixed(1)}%`,
        });
        resolve(result as File);
      },
      error(err) {
        console.error('❌ 压缩失败:', err);
        reject(new Error(`图片压缩失败: ${err.message}`));
      },
    });
  });
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

  for (let i = 0; i < files.length; i++) {
    try {
      const compressedFile = await compressImageForOCR(files[i], options);
      compressedFiles.push(compressedFile);

      if (onProgress) {
        onProgress(i + 1, files.length, compressedFile);
      }
    } catch (error) {
      console.error(`压缩第 ${i + 1} 张图片失败:`, error);
      // 如果压缩失败，使用原文件
      compressedFiles.push(files[i]);

      if (onProgress) {
        onProgress(i + 1, files.length, files[i]);
      }
    }
  }

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