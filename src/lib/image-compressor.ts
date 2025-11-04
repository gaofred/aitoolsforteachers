// 动态导入 compressorjs 以避免构建时依赖问题
const importCompressor = async () => {
  try {
    const module = await import('compressorjs');
    return module.default;
  } catch (error) {
    console.warn('compressorjs 加载失败，将跳过图片压缩:', error);
    return null;
  }
};

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
  const Compressor = await importCompressor();

  if (!Compressor) {
    console.log('compressorjs 不可用，跳过图片压缩');
    return file;
  }

  const defaultOptions: CompressionOptions = {
    maxSizeMB: 2, // 最大2MB，确保OCR处理效率
    maxWidthOrHeight: 2048, // 最大尺寸，保持文字清晰度
    quality: 0.95, // 高质量压缩，确保文字识别准确
    useWebWorker: true, // 使用Web Worker避免阻塞UI
  };

  const finalOptions = { ...defaultOptions, ...options };

  return new Promise((resolve, reject) => {
    new (Compressor as any)(file, {
      ...finalOptions,
      success(result) {
        resolve(result as File);
      },
      error(err) {
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
 * @returns boolean 是否需要压缩
 */
export function needsCompression(
  file: File,
  options: CompressionOptions = {}
): boolean {
  const { maxSizeMB = 2, maxWidthOrHeight = 2048 } = options;

  // 检查文件大小
  const fileSizeMB = file.size / (1024 * 1024);
  if (fileSizeMB > maxSizeMB) {
    return true;
  }

  // 检查图片尺寸（需要创建Image对象来获取）
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const needsResize = img.width > maxWidthOrHeight || img.height > maxWidthOrHeight;
      resolve(needsResize);
      URL.revokeObjectURL(img.src); // 清理内存
    };
    img.onerror = () => resolve(false);
    img.src = URL.createObjectURL(file);
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