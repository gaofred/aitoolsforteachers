/**
 * 使用 Sharp 服务端图片压缩库
 * 在服务端进行图片压缩，质量更高
 */

interface SharpCompressionOptions {
  maxSizeMB?: number;
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

/**
 * 使用 Sharp 压缩图片（服务端）
 */
export async function compressImageWithSharp(
  file: File,
  options: SharpCompressionOptions = {}
): Promise<File> {
  const {
    maxSizeMB = 0.5,
    width = 1200,
    height = 1200,
    quality = 80,
    format = 'jpeg'
  } = options;

  // 注意：这需要在服务端运行
  if (typeof window !== 'undefined') {
    throw new Error('Sharp压缩只能在服务端使用');
  }

  try {
    const sharp = require('sharp');
    const buffer = Buffer.from(await file.arrayBuffer());

    let transformer = sharp(buffer);

    // 设置尺寸
    if (width || height) {
      transformer = transformer.resize(width, height, {
        fit: 'inside',
        withoutEnlargement: true
      });
    }

    // 设置格式和质量
    if (format === 'jpeg') {
      transformer = transformer.jpeg({ quality });
    } else if (format === 'png') {
      transformer = transformer.png({ quality: Math.round(quality / 10) });
    } else if (format === 'webp') {
      transformer = transformer.webp({ quality });
    }

    const outputBuffer = await transformer.toBuffer();

    const compressedFile = new File([outputBuffer], file.name, {
      type: `image/${format}`,
      lastModified: Date.now()
    });

    console.log('Sharp压缩完成:', {
      原始大小: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
      压缩后: `${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`,
      压缩率: `${((1 - compressedFile.size / file.size) * 100).toFixed(1)}%`
    });

    return compressedFile;

  } catch (error) {
    console.error('Sharp压缩失败:', error);
    return file;
  }
}

export function isSharpAvailable(): boolean {
  try {
    require('sharp');
    return true;
  } catch {
    return false;
  }
}