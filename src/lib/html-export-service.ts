/**
 * HTML动画练习材料生成服务
 * 生成带有动画效果的HTML页面，可另存为PPT或直接使用
 */

export interface Question {
  id: number
  question: string
  options: string[]
  correctAnswer: number
  explanation?: string
}

export interface TenseSet {
  id: string
  name: string
  description: string
  questions: Question[]
}

class HTMLExportService {
  /**
   * 生成动画HTML练习材料并返回HTML字符串
   */
  generateAnimatedHTML(tenseSet: TenseSet): string {
    const currentDate = new Date().toLocaleDateString('zh-CN')

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${tenseSet.name} - 英语时态练习</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Microsoft YaHei', 'Arial', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            overflow-x: hidden;
        }

        .slide {
            width: 100vw;
            height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            position: absolute;
            top: 0;
            left: 0;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }

        .slide.active {
            opacity: 1;
            transform: translateX(0);
        }

        .slide.prev {
            transform: translateX(-100%);
        }

        .content {
            background: white;
            border-radius: 20px;
            padding: 60px;
            max-width: 900px;
            width: 90%;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            animation: slideInUp 1s ease-out;
        }

        @keyframes slideInUp {
            from {
                opacity: 0;
                transform: translateY(50px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .title {
            font-size: 48px;
            font-weight: bold;
            text-align: center;
            margin-bottom: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            animation: titleGlow 2s ease-in-out infinite alternate;
        }

        @keyframes titleGlow {
            from { filter: drop-shadow(0 0 10px rgba(102, 126, 234, 0.5)); }
            to { filter: drop-shadow(0 0 20px rgba(118, 75, 162, 0.5)); }
        }

        .subtitle {
            font-size: 24px;
            text-align: center;
            color: #666;
            margin-bottom: 40px;
        }

        .question {
            font-size: 32px;
            font-weight: bold;
            color: #333;
            text-align: center;
            margin-bottom: 50px;
            animation: questionAppear 0.8s ease-out;
        }

        @keyframes questionAppear {
            from {
                opacity: 0;
                transform: scale(0.9);
            }
            to {
                opacity: 1;
                transform: scale(1);
            }
        }

        .options {
            display: grid;
            gap: 20px;
            margin-bottom: 30px;
        }

        .option {
            background: #f8f9fa;
            border: 2px solid #e9ecef;
            border-radius: 15px;
            padding: 20px 30px;
            font-size: 20px;
            cursor: pointer;
            transition: all 0.3s ease;
            animation: optionSlide 0.6s ease-out;
            animation-fill-mode: both;
        }

        .option:hover {
            background: #e7f3ff;
            border-color: #4a90e2;
            transform: translateX(10px);
            box-shadow: 0 5px 15px rgba(74, 144, 226, 0.3);
        }

        .option.correct {
            background: linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%);
            border-color: #4caf50;
            animation: correctPulse 1s ease-out;
            pointer-events: none;
        }

        .option.incorrect {
            background: linear-gradient(135deg, #fccb90 0%, #d57eeb 100%);
            border-color: #f44336;
            animation: shake 0.5s ease-out;
            pointer-events: none;
        }

        .option.selected:not(.correct):not(.incorrect) {
            background: #e3f2fd;
            border-color: #2196f3;
            transform: translateX(5px);
        }

        .answer-controls {
            text-align: center;
            margin-top: 30px;
        }

        .show-answer-btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 12px 30px;
            border-radius: 25px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        }

        .show-answer-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
        }

        .show-answer-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }

        @keyframes optionSlide {
            from {
                opacity: 0;
                transform: translateX(-30px);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }

        @keyframes correctPulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
        }

        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-10px); }
            75% { transform: translateX(10px); }
        }

        .option-label {
            font-weight: bold;
            margin-right: 10px;
            color: #4a90e2;
        }

        .explanation {
            background: linear-gradient(135deg, #e0f7fa 0%, #b2ebf2 100%);
            border-radius: 15px;
            padding: 25px;
            font-size: 18px;
            color: #006064;
            border-left: 5px solid #00acc1;
            animation: explanationFade 1s ease-out;
        }

        @keyframes explanationFade {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .instructions {
            text-align: center;
            animation: instructionFade 1.2s ease-out;
        }

        @keyframes instructionFade {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        .instructions h2 {
            font-size: 36px;
            color: #333;
            margin-bottom: 30px;
        }

        .instructions ul {
            list-style: none;
            font-size: 20px;
            color: #555;
        }

        .instructions li {
            margin: 15px 0;
            animation: listItemSlide 0.6s ease-out;
            animation-fill-mode: both;
        }

        .instructions li:nth-child(1) { animation-delay: 0.2s; }
        .instructions li:nth-child(2) { animation-delay: 0.4s; }
        .instructions li:nth-child(3) { animation-delay: 0.6s; }
        .instructions li:nth-child(4) { animation-delay: 0.8s; }
        .instructions li:nth-child(5) { animation-delay: 1s; }

        @keyframes listItemSlide {
            from {
                opacity: 0;
                transform: translateX(-20px);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }

        .navigation {
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            gap: 20px;
            background: rgba(255, 255, 255, 0.95);
            padding: 15px 30px;
            border-radius: 50px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
            backdrop-filter: blur(10px);
            z-index: 1000;
        }

        .nav-btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 12px 25px;
            border-radius: 25px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .nav-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
        }

        .nav-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
        }

        .page-indicator {
            background: rgba(255, 255, 255, 0.9);
            padding: 8px 20px;
            border-radius: 20px;
            font-weight: bold;
            color: #333;
        }

        .completion {
            text-align: center;
            animation: completionCelebrate 1.5s ease-out;
        }

        @keyframes completionCelebrate {
            0% { transform: scale(0) rotate(0); }
            50% { transform: scale(1.1) rotate(180deg); }
            100% { transform: scale(1) rotate(360deg); }
        }

        .emoji {
            font-size: 80px;
            margin: 20px 0;
            animation: emojiBounce 2s ease-in-out infinite;
        }

        @keyframes emojiBounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-20px); }
        }

        .answer-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 30px;
            animation: tableFade 1s ease-out;
        }

        @keyframes tableFade {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        .answer-table th {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px;
            text-align: left;
            font-size: 18px;
        }

        .answer-table td {
            padding: 12px 15px;
            border-bottom: 1px solid #e0e0e0;
            font-size: 16px;
        }

        .answer-table tr:hover {
            background: #f5f5f5;
        }

        .footer {
            text-align: center;
            margin-top: 40px;
            font-size: 14px;
            color: #999;
        }

        .floating-shapes {
            position: fixed;
            width: 100%;
            height: 100%;
            overflow: hidden;
            pointer-events: none;
            z-index: -1;
        }

        .shape {
            position: absolute;
            opacity: 0.1;
            animation: float 20s ease-in-out infinite;
        }

        .shape:nth-child(1) {
            width: 80px;
            height: 80px;
            background: #ff6b6b;
            border-radius: 50%;
            top: 10%;
            left: 10%;
            animation-delay: 0s;
        }

        .shape:nth-child(2) {
            width: 60px;
            height: 60px;
            background: #4ecdc4;
            border-radius: 10px;
            top: 70%;
            right: 10%;
            animation-delay: 5s;
        }

        .shape:nth-child(3) {
            width: 100px;
            height: 100px;
            background: #45b7d1;
            border-radius: 50%;
            bottom: 10%;
            left: 20%;
            animation-delay: 10s;
        }

        @keyframes float {
            0%, 100% { transform: translateY(0) rotate(0deg); }
            25% { transform: translateY(-20px) rotate(90deg); }
            50% { transform: translateY(0) rotate(180deg); }
            75% { transform: translateY(20px) rotate(270deg); }
        }

        @media print {
            body {
                background: white;
            }

            .navigation {
                display: none;
            }

            .floating-shapes {
                display: none;
            }

            .slide {
                position: relative;
                page-break-after: always;
            }
        }
    </style>
</head>
<body>
    <div class="floating-shapes">
        <div class="shape"></div>
        <div class="shape"></div>
        <div class="shape"></div>
    </div>

    <!-- 封面页 -->
    <div class="slide active" id="slide-0">
        <div class="content">
            <div class="emoji">📚</div>
            <h1 class="title">${tenseSet.name}</h1>
            <p class="subtitle">${tenseSet.description}</p>
            <p style="text-align: center; font-size: 20px; color: #666;">
                共 ${tenseSet.questions.length} 道练习题
            </p>
            <div class="footer">
                生成日期：${currentDate}<br>
                英语AI教学工具 - 离线练习版
            </div>
        </div>
    </div>

    <!-- 说明页 -->
    <div class="slide" id="slide-1">
        <div class="content">
            <div class="instructions">
                <h2>练习说明</h2>
                <ul>
                    <li>📖 每页显示一道完整的语法练习题</li>
                    <li>🔤 题目包含问题和四个选项（A、B、C、D）</li>
                    <li>✅ 学生需要选择正确的答案</li>
                    <li>👨‍🏫 教师可以引导学生思考语法规则</li>
                    <li>📝 最后一页提供所有题目的答案解析</li>
                </ul>
                <p style="margin-top: 40px; font-size: 18px; color: #666;">
                    使用左右箭头键或下方按钮切换页面
                </p>
            </div>
        </div>
    </div>

    ${tenseSet.questions.map((question, index) => `
    <!-- 问题 ${index + 1} -->
    <div class="slide" id="slide-${index + 2}">
        <div class="content">
            <h2 style="text-align: center; color: #666; margin-bottom: 30px;">
                第 ${index + 1} / ${tenseSet.questions.length} 题
            </h2>
            <div class="question">${question.question}</div>
            <div class="options">
                ${question.options.map((option, optIndex) => `
                <div class="option" onclick="selectAnswer(this, ${optIndex}, ${question.correctAnswer})" data-index="${optIndex}">
                    <span class="option-label">${String.fromCharCode(65 + optIndex)}.</span>
                    ${option}
                </div>
                `).join('')}
            </div>
            <div class="answer-controls">
                <button class="show-answer-btn" onclick="showAnswer(${question.correctAnswer})" disabled>
                    显示答案
                </button>
                <div class="explanation" id="explanation-${index}" style="display: none;">
                    <strong>解析：</strong> ${question.explanation || '暂无解析'}
                </div>
            </div>
        </div>
    </div>
    `).join('')}

    <!-- 答案页 -->
    <div class="slide" id="slide-${tenseSet.questions.length + 2}">
        <div class="content">
            <h2 style="text-align: center; margin-bottom: 30px;">答案解析</h2>
            <table class="answer-table">
                <thead>
                    <tr>
                        <th>题号</th>
                        <th>题目</th>
                        <th>正确答案</th>
                        <th>解析</th>
                    </tr>
                </thead>
                <tbody>
                    ${tenseSet.questions.map((question, index) => `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${question.question.length > 50 ? question.question.substring(0, 50) + '...' : question.question}</td>
                        <td><strong>${String.fromCharCode(65 + question.correctAnswer)}</strong></td>
                        <td>${question.explanation || '-'}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    </div>

    <!-- 结束页 -->
    <div class="slide" id="slide-${tenseSet.questions.length + 3}">
        <div class="content">
            <div class="completion">
                <div class="emoji">🎉</div>
                <h1 class="title">练习完成！</h1>
                <p class="subtitle">继续保持学习热情</p>
                <p style="margin-top: 40px; font-size: 18px; color: #666;">
                    英语AI教学工具<br>
                    祝您学习进步！
                </p>
            </div>
        </div>
    </div>

    <!-- 导航控制 -->
    <div class="navigation">
        <button class="nav-btn" id="prevBtn" onclick="changeSlide(-1)">
            ← 上一页
        </button>
        <span class="page-indicator" id="pageIndicator">1 / ${tenseSet.questions.length + 4}</span>
        <button class="nav-btn" id="nextBtn" onclick="changeSlide(1)">
            下一页 →
        </button>
    </div>

    <script>
        let currentSlide = 0;
        const totalSlides = ${tenseSet.questions.length + 4};

        function showSlide(index) {
            const slides = document.querySelectorAll('.slide');

            slides.forEach((slide, i) => {
                slide.classList.remove('active', 'prev');
                if (i < index) {
                    slide.classList.add('prev');
                } else if (i === index) {
                    slide.classList.add('active');
                }
            });

            // 更新页面指示器
            document.getElementById('pageIndicator').textContent = \`\${index + 1} / \${totalSlides}\`;

            // 更新按钮状态
            document.getElementById('prevBtn').disabled = index === 0;
            document.getElementById('nextBtn').disabled = index === totalSlides - 1;

        }

        // 选择答案
        function selectAnswer(element, selectedIndex, correctIndex) {
            // 移除其他选项的选中状态
            const allOptions = element.parentElement.querySelectorAll('.option');
            allOptions.forEach(opt => opt.classList.remove('selected'));

            // 添加选中状态
            element.classList.add('selected');

            // 启用显示答案按钮
            const showAnswerBtn = element.parentElement.parentElement.querySelector('.show-answer-btn');
            showAnswerBtn.disabled = false;
        }

        // 显示答案
        function showAnswer(correctIndex) {
            const slide = document.querySelector('.slide.active');
            const allOptions = slide.querySelectorAll('.option');
            const showAnswerBtn = slide.querySelector('.show-answer-btn');
            const explanation = slide.querySelector('.explanation');

            // 显示正确和错误答案
            allOptions.forEach((option, index) => {
                if (index === correctIndex) {
                    option.classList.add('correct');
                } else if (option.classList.contains('selected')) {
                    option.classList.add('incorrect');
                }
            });

            // 显示解析
            explanation.style.display = 'block';

            // 禁用按钮
            showAnswerBtn.disabled = true;
            showAnswerBtn.textContent = '已显示答案';
        }

        function changeSlide(direction) {
            currentSlide += direction;
            if (currentSlide < 0) currentSlide = 0;
            if (currentSlide >= totalSlides) currentSlide = totalSlides - 1;
            showSlide(currentSlide);
        }

        // 键盘导航
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') {
                changeSlide(-1);
            } else if (e.key === 'ArrowRight') {
                changeSlide(1);
            }
        });

        // 初始化
        showSlide(0);
    </script>
</body>
</html>`;
  }
}

export default HTMLExportService