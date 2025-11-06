/**
 * 纯前端姓名提取工具
 * 无需调用AI API，直接使用正则表达式和规则提取学生姓名
 */

// 排除词列表 - 这些不是学生姓名
const EXCLUDE_WORDS = [
  '应用文', '作文', '班级', '学号', '制卡时间', '天学网', '出品', '学网出品',
  '李华', '王明', '张三', '李明', '小红', '小明', '李芳', '王芳'
];

// 常见中文姓氏
const COMMON_SURNAMES = [
  '王', '李', '张', '刘', '陈', '杨', '黄', '赵', '周', '吴',
  '徐', '孙', '胡', '朱', '高', '林', '何', '郭', '马', '罗',
  '梁', '宋', '郑', '谢', '韩', '唐', '冯', '于', '董', '萧',
  '程', '曹', '袁', '邓', '许', '傅', '沈', '曾', '彭', '吕',
  '苏', '卢', '蒋', '蔡', '贾', '丁', '魏', '薛', '叶', '阎',
  '余', '潘', '杜', '戴', '夏', '钟', '汪', '田', '任', '姜',
  '范', '方', '石', '姚', '谭', '廖', '邹', '熊', '金', '陆',
  '郝', '孔', '白', '崔', '康', '毛', '邱', '秦', '江', '史',
  '顾', '侯', '邵', '孟', '龙', '万', '段', '雷', '钱', '汤',
  '尹', '黎', '易', '常', '武', '乔', '贺', '赖', '龚', '文',
  '俞', '丁', '余', '章', '阮', '季', '莫', '姚', '邵', '凌'
];

/**
 * 检查字符串是否为有效的中文姓名
 */
function isValidChineseName(name: string): boolean {
  // 基本检查：2-4个中文字符
  if (!/^[\u4e00-\u9fff]{2,4}$/.test(name)) {
    return false;
  }

  // 排除特定词汇
  if (EXCLUDE_WORDS.includes(name)) {
    return false;
  }

  // 优化：如果是2个字符，检查第一个字是否为常见姓氏
  if (name.length === 2) {
    return COMMON_SURNAMES.includes(name[0]);
  }

  // 3-4个字符，检查第一个字是否为常见姓氏
  if (name.length >= 3 && name.length <= 4) {
    return COMMON_SURNAMES.includes(name[0]);
  }

  return false;
}

/**
 * 从文本中提取学生姓名 - 纯前端实现
 */
export function extractStudentName(text: string): string {
  if (!text || text.trim().length === 0) {
    return "";
  }

  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

  console.log('🔍 纯前端姓名提取开始:', {
    原文长度: text.length,
    行数: lines.length,
    前5行: lines.slice(0, 5)
  });

  // 策略1: 查找"姓名 XXX"格式（优先级最高）
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i];

    // 匹配 "姓名 俞丁悦" 格式
    const nameWithSpaceMatch = line.match(/^姓名\s+([\u4e00-\u9fff]{2,4})/);
    if (nameWithSpaceMatch) {
      const name = nameWithSpaceMatch[1];
      if (isValidChineseName(name)) {
        console.log('✅ 找到姓名格式1 (姓名+空格):', name);
        return name;
      }
    }

    // 匹配 "姓名：俞丁悦" 格式
    const nameWithColonMatch = line.match(/^姓名[：:]\s*([\u4e00-\u9fff]{2,4})/);
    if (nameWithColonMatch) {
      const name = nameWithColonMatch[1];
      if (isValidChineseName(name)) {
        console.log('✅ 找到姓名格式2 (姓名+冒号):', name);
        return name;
      }
    }
  }

  // 策略2: 查找前3行中的独立姓名
  for (let i = 0; i < Math.min(3, lines.length); i++) {
    const line = lines[i];

    // 如果整行就是一个有效姓名
    if (isValidChineseName(line)) {
      console.log('✅ 找到独立姓名:', line);
      return line;
    }

    // 查找行中的姓名模式
    const nameMatch = line.match(/([\u4e00-\u9fff]{2,4})/g);
    if (nameMatch) {
      for (const name of nameMatch) {
        if (isValidChineseName(name)) {
          console.log('✅ 在行中找到姓名:', name);
          return name;
        }
      }
    }
  }

  // 策略3: 智能查找 - 查找包含常见姓氏的组合
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i];

    // 尝试提取以常见姓氏开头的2-4字符组合
    const words = line.split(/\s+/);
    for (const word of words) {
      if (word.length >= 2 && word.length <= 4 && isValidChineseName(word)) {
        console.log('✅ 智能找到姓名:', word);
        return word;
      }
    }
  }

  console.log('❌ 未找到有效姓名');
  return "";
}

/**
 * 批量提取姓名 - 纯前端实现
 */
export function batchExtractStudentNames(assignments: Array<{id: string, text: string}>): Array<{id: string, name: string, success: boolean}> {
  return assignments.map(assignment => {
    const name = extractStudentName(assignment.text);
    return {
      id: assignment.id,
      name: name || "未识别",
      success: !!name
    };
  });
}

/**
 * 测试姓名提取功能
 */
export function testExtraction(text: string): void {
  console.log('=== 测试姓名提取 ===');
  console.log('输入文本:', text);
  console.log('提取结果:', extractStudentName(text));
  console.log('=== 测试结束 ===');
}

// 测试用例（开发时使用）
if (typeof window === 'undefined') {
  // Node.js 环境下的测试
  console.log('🧪 姓名提取工具已加载');
}