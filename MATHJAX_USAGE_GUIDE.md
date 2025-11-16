# MathJax 使用指南

本项目已成功集成了 MathJax 3，用于在英语教学工具中显示数学公式。

## 📦 已安装的依赖

- `mathjax`: MathJax 3 核心库
- `react-mathjax2`: React MathJax 封装组件

## 🚀 快速开始

### 1. 基本使用

在任何需要显示数学公式的组件中导入和使用：

```tsx
import { MathJaxRenderer, InlineMath, DisplayMath, MathText } from '@/components/MathJax';

// 方式1: 渲染包含公式的文本
const MyComponent = () => {
  return (
    <MathJaxRenderer>
      这是一个包含公式的段落：$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$
    </MathJaxRenderer>
  );
};

// 方式2: 使用专门的数学组件
const MyComponent2 = () => {
  return (
    <div>
      <InlineMath formula="\\alpha + \\beta = \\gamma" />
      <DisplayMath formula="\\int_{a}^{b} f(x)dx = F(b) - F(a)" />
    </div>
  );
};

// 方式3: 处理混合文本
const MyComponent3 = () => {
  const text = "根据勾股定理，我们有 $a^2 + b^2 = c^2$，其中 $c$ 是斜边长度。";
  return <MathText text={text} />;
};
```

### 2. LaTeX 语法

#### 行内公式
使用单个美元符号包围：
```
$E = mc^2$
$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$
```

#### 块级公式
使用双美元符号包围：
```
$$
\\frac{d}{dx} \\left( \\int_{a}^{x} f(t) dt \\right) = f(x)
$$
```

### 3. 常用数学符号

| 符号 | LaTeX 代码 | 说明 |
|------|------------|------|
| α | \\alpha | 希腊字母 alpha |
| β | \\beta | 希腊字母 beta |
| γ | \\gamma | 希腊字母 gamma |
| Δ | \\Delta | 大写 Delta |
| π | \\pi | 圆周率 |
| ∑ | \\sum | 求和符号 |
| ∫ | \\int | 积分符号 |
| √ | \\sqrt{} | 平方根 |
| ± | \\pm | 正负号 |
| × | \\times | 乘号 |
| ÷ | \\div | 除号 |

### 4. 复杂公式示例

#### 分数
```latex
\\frac{a}{b}  // 简单分数
\\frac{\\partial^2 u}{\\partial t^2}  // 偏微分
```

#### 根式
```latex
\\sqrt{x}  // 平方根
\\sqrt[n]{x}  // n次方根
\\sqrt{a^2 + b^2}  // 勾股定理
```

#### 求和与积分
```latex
\\sum_{i=1}^{n} x_i  // 求和
\\int_{a}^{b} f(x) dx  // 积分
\\lim_{x \\to \\infty} f(x)  // 极限
```

#### 矩阵
```latex
\\begin{pmatrix}
a & b \\\\
c & d
\\end{pmatrix}
```

#### 方程组
```latex
\\begin{cases}
x + y = 1 \\\\
x - y = 0
\\end{cases}
```

## 🔧 组件 API

### MathJaxRenderer
包装需要渲染数学公式的内容。

```tsx
interface MathJaxRendererProps {
  children: React.ReactNode;  // 子元素
  className?: string;         // CSS类名
}
```

### MathJaxProvider
全局 MathJax 配置提供者（已在 layout.tsx 中设置）。

```tsx
interface MathJaxProviderProps {
  children: React.ReactNode;  // 子元素
}
```

### InlineMath
渲染行内数学公式。

```tsx
interface InlineMathProps {
  formula: string;  // LaTeX 公式
}
```

### DisplayMath
渲染块级数学公式。

```tsx
interface DisplayMathProps {
  formula: string;  // LaTeX 公式
}
```

### MathText
处理包含数学公式的文本。

```tsx
interface MathTextProps {
  text: string;        // 包含公式的文本
  className?: string;  // CSS类名
}
```

## 📚 实际应用示例

### 英语数学题解析
```tsx
const MathProblem = () => {
  const problemText = "题目：求解方程 $3x + 5 = 14$ 中的 $x$ 值。";
  const solution = `解：
  $3x = 14 - 5$
  $3x = 9$
  $x = \\frac{9}{3} = 3$`;

  return (
    <div className="p-4">
      <MathText text={problemText} className="mb-4" />
      <MathJaxRenderer>
        {solution.split('\n').map((line, index) => (
          <p key={index} className="mb-2">{line}</p>
        ))}
      </MathJaxRenderer>
    </div>
  );
};
```

### 函数图表说明
```tsx
const FunctionGraph = () => {
  const description = "二次函数 $y = ax^2 + bx + c$ 的图像是一条抛物线。";
  const vertex = "顶点坐标：$\\left(-\\frac{b}{2a}, \\frac{4ac - b^2}{4a}\\right)$";

  return (
    <div className="space-y-2">
      <MathText text={description} />
      <MathText text={vertex} className="font-semibold" />
    </div>
  );
};
```

## 🎯 最佳实践

1. **性能优化**: 对于包含大量数学公式的页面，考虑使用 `useMemo` 缓存公式内容。

2. **错误处理**: 如果公式渲染失败，会自动显示原始的 LaTeX 代码。

3. **样式一致性**: 使用 `className` 属性来保持样式一致。

4. **响应式设计**: 确保数学公式在不同屏幕尺寸下都能正常显示。

## 🧪 测试

访问测试页面验证 MathJax 功能：
- URL: `http://localhost:3001/test-mathjax`
- 包含静态公式、动态公式和组件API测试

## 🔄 动态内容更新

当内容动态更新时，MathJax 会自动重新渲染。也可以手动触发重新渲染：

```tsx
import { useRerenderMathJax } from '@/components/MathJax';

const DynamicMath = () => {
  const [formula, setFormula] = useState("x = 1");
  useRerenderMathJax(); // 手动触发重新渲染

  return (
    <div>
      <MathJaxRenderer>
        ${formula}$
      </MathJaxRenderer>
      <button onClick={() => setFormula("x = 2")}>
        更新公式
      </button>
    </div>
  );
};
```

## 🐛 故障排除

1. **公式不显示**: 检查 LaTeX 语法是否正确
2. **渲染缓慢**: 复杂公式可能需要更多时间处理
3. **样式问题**: 确保没有CSS冲突

## 📚 更多资源

- [MathJax 官方文档](https://docs.mathjax.org/)
- [LaTeX 数学公式教程](https://www.overleaf.com/learn/latex/Mathematical_expressions)
- [在线 LaTeX 编辑器](https://www.codecogs.com/latex/eqneditor.php)