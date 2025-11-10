/**
 * 使用浏览器原生 Canvas API 压缩图片
 * 无需第三方依赖，兼容性更好
 */

export interface CanvasCompressionOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  quality?: number; // 0.0 - 1.0
  mimeType?: string;
}

/**
 * 使用Canvas API压缩图片
 */
export async function compressImageWithCanvas(
  file: File,
  options: CanvasCompressionOptions = {}
): Promise<File> {
  const {
    maxSizeMB = 0.5,
    maxWidthOrHeight = 1200,
    quality = 0.5,
    mimeType = 'image/jpeg'
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        // 计算压缩后的尺寸
        const { width, height } = calculateDimensions(img.width, img.height, maxWidthOrHeight);

        // 创建canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');

        // 绘制压缩后的图片
        ctx.drawImage(img, 0, 0, width, height);

        // 转换为Blob
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Canvas压缩失败'));
            return;
          }

          const compressedFile = new File([blob], file.name, {
            type: mimeType,
            lastModified: Date.now()
          });

          console.log('Canvas压缩完成:', {
            原始大小: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
            压缩后: `${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`,
            压缩率: `${((1 - compressedFile.size / file.size) * 100).toFixed(1)}%`,
            尺寸: `${width}x${height}`
          });

          resolve(compressedFile);
        }, mimeType, quality);

        // 清理内存
        URL.revokeObjectURL(img.src);

      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => reject(new Error('图片加载失败'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * 计算压缩后的尺寸
 */
function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
  maxDimension: number
): { width: number; height: number } {
  if (originalWidth <= maxDimension && originalHeight <= maxDimension) {
    return { width: originalWidth, height: originalHeight };
  }

  const aspectRatio = originalWidth / originalHeight;

  if (originalWidth > originalHeight) {
    return {
      width: maxDimension,
      height: Math.round(maxDimension / aspectRatio)
    };
  } else {
    return {
      width: Math.round(maxDimension * aspectRatio),
      height: maxDimension
    };
  }
}

/**
 * 批量Canvas压缩
 */
export async function compressImagesWithCanvas(
  files: File[],
  options: CanvasCompressionOptions = {},
  onProgress?: (index: number, total: number, compressedFile: File) => void
): Promise<File[]> {
  const compressedFiles: File[] = [];

  for (let i = 0; i < files.length; i++) {
    try {
      const compressed = await compressImageWithCanvas(files[i], options);
      compressedFiles.push(compressed);

      if (onProgress) {
        onProgress(i + 1, files.length, compressed);
      }
    } catch (error) {
      console.error(`Canvas压缩第 ${i + 1} 张图片失败:`, error);
      compressedFiles.push(files[i]); // 使用原文件

      if (onProgress) {
        onProgress(i + 1, files.length, files[i]);
      }
    }
  }

  return compressedFiles;
}

/**
 * 检查是否支持Canvas压缩
 */
export function supportsCanvasCompression(): boolean {
  return typeof window !== 'undefined' &&
         typeof document !== 'undefined' &&
         typeof document.createElement === 'function' &&
         !!(window as any).opera; // Opera 可能有兼容性问题
}