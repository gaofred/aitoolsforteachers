"use client";

import { MathRenderer, InlineMathComponent, BlockMathComponent, MathText } from "@/components/MathRenderer";

export default function TestReactKatex() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">React-KaTeX 测试页面</h1>

        <div className="space-y-8">
          {/* 基本数学公式测试 */}
          <section className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">基本数学公式</h2>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded">
                <h3 className="font-medium mb-2">二次方程：</h3>
                <MathRenderer className="text-lg">
                  {`二次方程的解：$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$`}
                </MathRenderer>
              </div>

              <div className="p-4 bg-green-50 rounded">
                <h3 className="font-medium mb-2">欧拉公式：</h3>
                <MathRenderer className="text-lg">
                  {`欧拉恒等式：$e^{i\\pi} + 1 = 0$`}
                </MathRenderer>
              </div>

              <div className="p-4 bg-purple-50 rounded">
                <h3 className="font-medium mb-2">勾股定理：</h3>
                <MathRenderer className="text-lg">
                  直角三角形{`勾股定理：$a^2 + b^2 = c^2$`}
                </MathRenderer>
              </div>
            </div>
          </section>

          {/* 复杂数学公式测试 */}
          <section className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">复杂数学公式</h2>
            <div className="space-y-4">
              <div className="p-4 bg-red-50 rounded">
                <h3 className="font-medium mb-2">积分：</h3>
                <MathRenderer className="text-lg">
                  {`定积分：$$\\int_{a}^{b} f(x)dx = F(b) - F(a)$$`}
                </MathRenderer>
              </div>

              <div className="p-4 bg-yellow-50 rounded">
                <h3 className="font-medium mb-2">矩阵：</h3>
                <MathRenderer className="text-lg">
                  {`矩阵乘法：$$\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix} \\times \\begin{pmatrix} e & f \\\\ g & h \\end{pmatrix} = \\begin{pmatrix} ae + bg & af + bh \\\\ ce + dg & cf + dh \\end{pmatrix}$$`}
                </MathRenderer>
              </div>

              <div className="p-4 bg-indigo-50 rounded">
                <h3 className="font-medium mb-2">求和：</h3>
                <MathRenderer className="text-lg">
                  {`等比数列求和：$$\\sum_{i=1}^{n} ar^{i-1} = a \\frac{1 - r^n}{1 - r} \\quad (r \\neq 1)$$`}
                </MathRenderer>
              </div>
            </div>
          </section>

          {/* 混合文本测试 */}
          <section className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">混合文本和数学公式</h2>
            <MathText
              text={`这是一个包含数学公式的段落。根据勾股定理，在直角三角形中，$a^2 + b^2 = c^2$，其中$c$是斜边长度。另外，欧拉公式$e^{i\\pi} + 1 = 0$被认为是数学中最美的公式之一。二次方程的一般解为$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$，这可以通过求根公式得到。`}
              className="text-gray-700 leading-relaxed"
            />
          </section>

          {/* 分离组件测试 */}
          <section className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">分离组件测试</h2>
            <div className="space-y-4">
              <div className="p-4 border rounded">
                <h3 className="font-medium mb-2">InlineMathComponent：</h3>
                <InlineMathComponent formula="\\alpha + \\beta = \\gamma" />
              </div>

              <div className="p-4 border rounded">
                <h3 className="font-medium mb-2">BlockMathComponent：</h3>
                <BlockMathComponent formula="\\sin^2 \\theta + \\cos^2 \\theta = 1" />
              </div>
            </div>
          </section>

          {/* 实际应用测试 */}
          <section className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">实际应用示例</h2>
            <div className="space-y-4">
              <MathRenderer>
                {`## 数学题目：求解长方体最短路径

                长方体$ABCD-A_1B_1C_1D_1$中，已知$AA_1 = 3$，$AD = 4$，$AB = 5$。从顶点$A$沿表面到达顶点$C_1$的最短路径长度。

                ### 解答：
                1. **展开方法**：将长方体沿某些棱展开成平面图形
                2. **路径计算**：最短路径为：
                   $$\\sqrt{(AB + AD)^2 + AA_1^2} = \\sqrt{(5 + 4)^2 + 3^2} = \\sqrt{81 + 9} = \\sqrt{90} = 3\\sqrt{10}$$

                3. **最终答案**：最短路径长度为$\\sqrt{90} = 3\\sqrt{10}$。`}
              </MathRenderer>
            </div>
          </section>
        </div>

        {/* 页脚 */}
        <div className="mt-12 text-center text-gray-600">
          <p>✅ React-KaTeX 数学公式渲染测试</p>
          <p>🎯 使用KatTeX库进行数学公式渲染</p>
        </div>
      </div>
    </div>
  );
}