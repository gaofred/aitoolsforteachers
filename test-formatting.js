// 测试AI排版功能
const testText = `： 44
：
， Tom (extra - curricular
activities)，。，
：
1. ；
2. ；
3. 。
Dear Tom，
learning that you are interested in our class' extra -
curricular activities, I'd like to introduce to our colorful
extra - curricular activities to you.
There are a variety of extra - curricular activities,
such as playing basketball, dancing, drawing and so on.
Every students can choose one which is propose to them,
and they can learn some skills from extra - curricular activities.
I like drawing most among these activities, because I
can enjoy beauty from drawing, my heart relaxing as
I joined in the activity. I also have a lot of friends
that have same passion for drawing, we enjoyed good
time in this activity.
Our extra - curricular activities are colorful and interesting,
I believe that you can like them.`;

console.log('原文:');
console.log(testText);
console.log('\n' + '='.repeat(50) + '\n');

// 测试本地排版规则
function testLocalFormatting() {
  let formattedText = testText.trim();

  // 第一步：修复文字断开问题
  formattedText = formattedText.replace(/\b(\w+)\s*-\s*(\w+)\b/g, '$1-$2');
  formattedText = formattedText.replace(/\n(?![\n])/g, ' ');
  formattedText = formattedText.replace(/：\s*([.,;:!?])/g, '$1');
  formattedText = formattedText.replace(/([.,;:!?])\s*：/g, '$1:');
  formattedText = formattedText.replace(/：\s*([A-Za-z])/g, ': $1');
  formattedText = formattedText.replace(/[^\w\s.,;:!?'"()\-[\]]/g, '');

  // 第二步：修复多余空格
  formattedText = formattedText.replace(/\s+/g, ' ');
  formattedText = formattedText.replace(/\s*([.,;:!?])\s*/g, '$1 ');
  formattedText = formattedText.replace(/\s*-\s*/g, '-');

  // 第三步：修复句号后的大写字母分段
  formattedText = formattedText.replace(/([.!?])\s*([A-Z])/g, '$1\n\n$2');

  // 第四步：智能分段
  const sentences = formattedText.match(/[^.!?]+[.!?]+/g) || [];
  if (sentences.length > 0) {
    const paragraphs = [];
    let currentParagraph = [];

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i].trim();

      if (currentParagraph.length === 0) {
        currentParagraph.push(sentence);
        continue;
      }

      const currentParagraphLength = currentParagraph.join(' ').length;
      const shouldStartNewParagraph =
        currentParagraphLength > 80 ||
        currentParagraph.length >= 4 ||
        /^(In|Moreover|However|Furthermore|Therefore|First|Second|Finally|In conclusion|To sum up)\b/i.test(sentence);

      if (shouldStartNewParagraph) {
        paragraphs.push(currentParagraph.join(' '));
        currentParagraph = [sentence];
      } else {
        currentParagraph.push(sentence);
      }
    }

    if (currentParagraph.length > 0) {
      paragraphs.push(currentParagraph.join(' '));
    }

    formattedText = paragraphs.join('\n\n');
  }

  // 第五步：清理多余空行
  formattedText = formattedText.replace(/\n{3,}/g, '\n\n');

  return formattedText.trim();
}

console.log('本地排版结果:');
console.log(testLocalFormatting());

console.log('\n' + '='.repeat(50) + '\n');
console.log('现在可以测试API接口:');
console.log('curl -X POST http://localhost:3002/api/ai/text-formatting -H "Content-Type: application/json" -d \'{"text": "' + testText.replace(/"/g, '\\"') + '"}\'');