"use client";

import { useState } from 'react';
import { MathJaxRenderer, InlineMath, DisplayMath, MathText, useRerenderMathJax } from '@/components/MathJax';

export default function MathJaxTestPage() {
  const [dynamicFormula, setDynamicFormula] = useState('x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}');
  useRerenderMathJax();

  const testFormulas = [
    {
      name: "二次方程求解公式",
      inline: "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}",
      description: "这是求解 ax² + bx + c = 0 的公式"
    },
    {
      name: "欧拉公式",
      inline: "e^{i\\pi} + 1 = 0",
      description: "数学中最美的公式之一"
    },
    {
      name: "求和公式",
      inline: "\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}",
      description: "从1到n的整数求和"
    },
    {
      name: "积分",
      inline: "\\int_{a}^{b} f(x)dx = F(b) - F(a)",
      description: "微积分基本定理"
    },
    {
      name: "矩阵",
      inline: "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}",
      description: "2x2矩阵"
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold text-center mb-8">MathJax 测试页面</h1>

      <div className="space-y-8">
        {/* 静态公式展示 */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">静态数学公式示例</h2>
          <div className="space-y-4 bg-gray-50 p-6 rounded-lg">
            {testFormulas.map((formula, index) => (
              <div key={index} className="border-b border-gray-200 pb-4 last:border-b-0">
                <h3 className="text-lg font-medium mb-2">{formula.name}</h3>
                <p className="text-gray-600 mb-2">{formula.description}</p>
                <MathJaxRenderer className="text-lg p-2 bg-white rounded border border-gray-300">
                  {formula.inline}
                </MathJaxRenderer>
              </div>
            ))}
          </div>
        </section>

        {/* 块级公式展示 */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">块级公式展示</h2>
          <div className="space-y-4 bg-blue-50 p-6 rounded-lg">
            <MathJaxRenderer>
              {`$$
\\frac{d}{dx} \\left( \\int_{a}^{x} f(t) dt \\right) = f(x)
$$`}
            </MathJaxRenderer>

            <MathJaxRenderer>
              {`$$
\\lim_{n \\to \\infty} \\left(1 + \\frac{1}{n}\\right)^n = e
$$`}
            </MathJaxRenderer>

            <MathJaxRenderer>
              {`$$
\\nabla \\times \\vec{E} = -\\frac{\\partial \\vec{B}}{\\partial t}
$$`}
            </MathJaxRenderer>
          </div>
        </section>

        {/* 动态公式测试 */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">动态公式测试</h2>
          <div className="bg-green-50 p-6 rounded-lg">
            <div className="mb-4">
              <label htmlFor="formula-input" className="block text-sm font-medium mb-2">
                输入LaTeX公式：
              </label>
              <input
                id="formula-input"
                type="text"
                value={dynamicFormula}
                onChange={(e) => setDynamicFormula(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="输入LaTeX公式..."
              />
            </div>
            <div className="p-4 bg-white rounded border border-gray-300">
              <MathJaxRenderer className="text-lg">
                {dynamicFormula}
              </MathJaxRenderer>
            </div>
          </div>
        </section>

        {/* 组件API测试 */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">组件API测试</h2>
          <div className="space-y-4 bg-yellow-50 p-6 rounded-lg">
            <div>
              <h3 className="text-lg font-medium mb-2">InlineMath组件：</h3>
              <InlineMath formula="\\alpha + \\beta = \\gamma" />
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">DisplayMath组件：</h3>
              <DisplayMath formula="\\sin^2 \\theta + \\cos^2 \\theta = 1" />
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">MathText组件（混合文本）：</h3>
              <MathText
                text="根据勾股定理，我们有 $a^2 + b^2 = c^2$，其中 $c$ 是斜边长度。"
                className="p-2 bg-white rounded"
              />
            </div>
          </div>
        </section>

        {/* 使用说明 */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">使用说明</h2>
          <div className="bg-purple-50 p-6 rounded-lg space-y-2">
            <p><strong>行内公式：</strong> 使用单个美元符号包围，如 <code>$formula$</code></p>
            <p><strong>块级公式：</strong> 使用双美元符号包围，如 <code>$$formula$$</code></p>
            <p><strong>支持的LaTeX命令：</strong> 大部分常用数学符号和命令都支持</p>
            <p><strong>在项目中使用：</strong> 导入MathJax相关组件并包装需要显示公式的内容</p>
          </div>
        </section>
      </div>
    </div>
  );
}