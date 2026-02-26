/* ============================================
   DropMind念投 — Processing Pipelines
   每种意图对应一条处理管道
   ============================================ */

const Pipelines = (() => {

  // 处理步骤模板
  function makeSteps(steps) {
    return steps.map((s, i) => ({ id: i, icon: s[0], label: s[1], status: 'waiting' }));
  }

  // ============================================
  // 📌 书签管道
  // ============================================
  async function bookmark(input) {
    const steps = makeSteps([
      ['🔍', '正在解析链接...'],
      ['📄', '正在提取标题和描述...'],
      ['🏷️', '正在生成标签...'],
      ['💾', '正在保存到书签库...'],
    ]);

    const url = input.trim();
    const domain = extractDomain(url);

    await simulateProcessing(steps, 0);
    await simulateProcessing(steps, 1);

    const title = generateBookmarkTitle(url, domain);
    const description = generateBookmarkDesc(domain);
    const tags = generateTags('bookmark', domain);

    await simulateProcessing(steps, 2);
    await simulateProcessing(steps, 3);

    return {
      type: 'bookmark',
      title,
      data: {
        url,
        domain,
        description,
        tags,
        favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
        savedAt: new Date().toISOString(),
      },
      steps,
    };
  }

  // ============================================
  // 📖 稍后阅读管道
  // ============================================
  async function readlater(input) {
    const steps = makeSteps([
      ['🔍', '正在解析链接...'],
      ['📖', '正在提取文章正文...'],
      ['🧠', '正在生成摘要...'],
      ['⏱️', '正在估算阅读时间...'],
      ['💾', '正在保存到稍后阅读...'],
    ]);

    const url = input.trim();
    const domain = extractDomain(url);

    await simulateProcessing(steps, 0);
    await simulateProcessing(steps, 1);

    const title = generateArticleTitle(url, domain);
    const summary = generateSummary(title);
    const readTime = Math.floor(Math.random() * 12) + 3;

    await simulateProcessing(steps, 2);
    await simulateProcessing(steps, 3);

    const tags = generateTags('readlater', domain);

    await simulateProcessing(steps, 4);

    return {
      type: 'readlater',
      title,
      data: {
        url,
        domain,
        summary,
        readTime: `${readTime} 分钟`,
        tags,
        priority: readTime > 8 ? '长文' : '短文',
        savedAt: new Date().toISOString(),
      },
      steps,
    };
  }

  // ============================================
  // 📝 深度总结管道
  // ============================================
  async function deepSummary(input) {
    const steps = makeSteps([
      ['🔍', '正在分析内容类型...'],
      ['📖', '正在提取核心内容...'],
      ['🧠', '正在生成深度总结...'],
      ['💎', '正在提取关键要点...'],
      ['🏷️', '正在生成标签...'],
      ['💾', '正在保存到笔记库...'],
    ]);

    const isUrl = /^https?:\/\//i.test(input.trim());
    const sourceText = isUrl ? generateArticleContent() : input.trim();
    const title = isUrl ? generateArticleTitle(input.trim(), extractDomain(input.trim())) : generateTitleFromText(sourceText);

    await simulateProcessing(steps, 0);
    await simulateProcessing(steps, 1);
    await simulateProcessing(steps, 2);

    const coreSentence = generateCoreSentence(title);
    const keyPoints = generateKeyPoints(title);
    const outline = generateOutline(title);
    const quotes = generateQuotes(sourceText);

    await simulateProcessing(steps, 3);

    const tags = generateTags('note', title);

    await simulateProcessing(steps, 4);
    await simulateProcessing(steps, 5);

    return {
      type: 'note',
      title,
      data: {
        coreSentence,
        keyPoints,
        outline,
        quotes,
        tags,
        sourceUrl: isUrl ? input.trim() : null,
        savedAt: new Date().toISOString(),
      },
      steps,
    };
  }

  // ============================================
  // 💡 灵感捕获管道
  // ============================================
  async function inspiration(input) {
    const steps = makeSteps([
      ['🧠', '正在理解核心想法...'],
      ['🏷️', '正在生成标签...'],
      ['🔗', '正在匹配关联灵感...'],
      ['💾', '正在保存到灵感库...'],
    ]);

    const text = input.trim();

    await simulateProcessing(steps, 0);

    const title = generateTitleFromText(text);
    const tags = generateTags('inspiration', text);

    await simulateProcessing(steps, 1);

    const relatedIdeas = generateRelatedIdeas(text);

    await simulateProcessing(steps, 2);
    await simulateProcessing(steps, 3);

    return {
      type: 'inspiration',
      title,
      data: {
        originalText: text,
        structuredTitle: title,
        tags,
        relatedIdeas,
        expandable: text.length < 500,
        savedAt: new Date().toISOString(),
      },
      steps,
    };
  }

  // ============================================
  // ✍️ 文章排版管道
  // ============================================
  async function articleFormat(input) {
    const steps = makeSteps([
      ['🔍', '正在分析文章结构...'],
      ['✍️', '正在智能排版...'],
      ['📐', '正在优化层级和格式...'],
      ['🎨', '正在美化输出...'],
      ['💾', '正在保存到文章库...'],
    ]);

    const text = input.trim();

    await simulateProcessing(steps, 0);
    await simulateProcessing(steps, 1);

    const title = generateTitleFromText(text);
    const formatted = formatArticle(text, title);

    await simulateProcessing(steps, 2);
    await simulateProcessing(steps, 3);

    const tags = generateTags('article', title);

    await simulateProcessing(steps, 4);

    return {
      type: 'article',
      title,
      data: {
        originalText: text,
        markdownContent: formatted,
        formattedHtml: typeof marked !== 'undefined' ? marked.parse(formatted) : formatted,
        tags,
        wordCount: text.length,
        savedAt: new Date().toISOString(),
      },
      steps,
    };
  }

  // ============================================
  // 🎓 学习包管道（杀手级功能）
  // ============================================
  async function studyPack(input) {
    const steps = makeSteps([
      ['🔍', '正在解析视频链接...'],
      ['📝', '正在提取字幕/转录...'],
      ['🧠', '正在生成结构化笔记...'],
      ['🗺️', '正在生成思维导图...'],
      ['🃏', '正在生成 Anki 闪卡...'],
      ['❓', '正在生成自测题...'],
      ['🎯', '正在生成行动计划...'],
      ['💾', '正在保存到学习库...'],
    ]);

    const url = input.trim();
    const videoId = extractYouTubeId(url);
    const videoTitle = generateVideoTitle();

    await simulateProcessing(steps, 0);
    await simulateProcessing(steps, 1, 1500);

    // 生成结构化笔记
    const notes = generateStudyNotes(videoTitle);
    await simulateProcessing(steps, 2, 1200);

    // 生成思维导图
    const mindmap = generateMindMap(videoTitle);
    await simulateProcessing(steps, 3);

    // 生成 Anki 闪卡
    const flashcards = generateFlashcards(videoTitle);
    await simulateProcessing(steps, 4);

    // 生成测验题
    const quiz = generateQuiz(videoTitle);
    await simulateProcessing(steps, 5);

    // 生成行动计划
    const actionPlan = generateActionPlan(videoTitle);
    await simulateProcessing(steps, 6);

    const tags = generateTags('study', videoTitle);
    await simulateProcessing(steps, 7);

    return {
      type: 'study',
      title: videoTitle,
      data: {
        videoUrl: url,
        videoId,
        notes,
        mindmap,
        flashcards,
        quiz,
        actionPlan,
        tags,
        savedAt: new Date().toISOString(),
      },
      steps,
    };
  }

  // ============================================
  // 辅助函数：模拟处理
  // ============================================
  function simulateProcessing(steps, index, delay) {
    return new Promise(resolve => {
      steps[index].status = 'active';
      updateProcessingUI(steps);
      setTimeout(() => {
        steps[index].status = 'done';
        updateProcessingUI(steps);
        resolve();
      }, delay || (400 + Math.random() * 600));
    });
  }

  function updateProcessingUI(steps) {
    const container = document.getElementById('processing-steps');
    if (!container) return;
    container.innerHTML = steps.map(s => {
      let iconHtml;
      if (s.status === 'done') iconHtml = '<span class="step-icon">✓</span>';
      else if (s.status === 'active') iconHtml = '<div class="step-spinner"></div>';
      else iconHtml = '<span class="step-icon step-waiting">○</span>';

      const cls = s.status === 'done' ? 'done' : s.status === 'active' ? 'active' : '';
      return `<div class="processing-step ${cls}">${iconHtml}<span>${s.icon} ${s.label}</span></div>`;
    }).join('');
  }

  // ============================================
  // 内容生成辅助函数
  // ============================================
  function extractDomain(url) {
    try { return new URL(url).hostname.replace('www.', ''); } catch { return 'unknown.com'; }
  }

  function extractYouTubeId(url) {
    const m = url.match(/(?:v=|youtu\.be\/|shorts\/)([\w-]{11})/);
    return m ? m[1] : 'dQw4w9WgXcQ';
  }

  function generateBookmarkTitle(url, domain) {
    const titles = {
      'github.com': 'GitHub 开源项目 — 值得关注的仓库',
      'twitter.com': 'X/Twitter 精彩推文',
      'x.com': 'X/Twitter 精彩推文',
      'medium.com': 'Medium 深度文章',
      'arxiv.org': '学术论文 — arXiv',
      'news.ycombinator.com': 'Hacker News 热门讨论',
    };
    return titles[domain] || `来自 ${domain} 的内容`;
  }

  function generateBookmarkDesc(domain) {
    return `从 ${domain} 保存的书签，已自动提取标题和描述。`;
  }

  function generateArticleTitle(url, domain) {
    const titles = [
      '深度解析：AI 如何重塑个人生产力工具',
      '2026 年最值得关注的技术趋势',
      '从零到一：构建个人知识管理系统',
      '为什么"少即是多"是最好的产品哲学',
      '远程工作三年后，我学到的 10 件事',
    ];
    return titles[Math.floor(Math.random() * titles.length)];
  }

  function generateArticleContent() {
    return '这是一篇关于人工智能和个人生产力的深度文章。文章探讨了如何利用 AI 技术来提升个人效率，包括自动化任务管理、智能笔记整理、以及知识图谱构建等方面。作者认为，未来的个人生产力工具将不再需要用户手动组织信息，而是由 AI 自动理解用户意图并完成相应的处理。';
  }

  function generateSummary(title) {
    return `这篇文章的核心观点是：${title.replace(/深度解析：|2026 年|从零到一：/, '')}。作者通过多个实际案例和数据分析，论证了这一趋势的必然性，并提出了具体的实践建议。文章特别强调了"零摩擦"体验的重要性——最好的工具是让用户感觉不到工具存在的工具。`;
  }

  function generateTitleFromText(text) {
    const first50 = text.substring(0, 50).replace(/\n/g, ' ');
    if (text.length < 60) return first50;
    return first50 + '...';
  }

  function generateCoreSentence(title) {
    return `核心观点：${title} — 这代表了一种从"用户适应工具"到"工具适应用户"的根本性转变。`;
  }

  function generateKeyPoints(title) {
    return [
      { icon: '1️⃣', text: '零摩擦输入是下一代生产力工具的核心竞争力' },
      { icon: '2️⃣', text: 'AI 意图理解比功能堆砌更重要' },
      { icon: '3️⃣', text: '本地优先 + 云端增强是隐私与性能的最佳平衡' },
      { icon: '4️⃣', text: '知识的价值在于连接，而非存储' },
      { icon: '5️⃣', text: '最好的个人知识管理是"无感知"的' },
    ];
  }

  function generateOutline(title) {
    return [
      { level: 1, text: '引言：为什么现有工具都不够好' },
      { level: 2, text: '问题一：输入成本太高' },
      { level: 2, text: '问题二：组织负担转嫁给用户' },
      { level: 1, text: '新范式：AI 驱动的零摩擦体验' },
      { level: 2, text: '意图引擎：让 AI 理解你想做什么' },
      { level: 2, text: '自动管道：从输入到输出的全自动化' },
      { level: 1, text: '实践案例与数据验证' },
      { level: 1, text: '结论与展望' },
    ];
  }

  function generateQuotes(text) {
    return [
      '「最好的工具是让用户感觉不到工具存在的工具。」',
      '「我们不需要更多功能，我们需要更少的决策。」',
      '「知识管理的终极形态是：你不需要管理。」',
    ];
  }

  function generateTags(type, context) {
    const tagSets = {
      bookmark: ['收藏', '参考', '待整理'],
      readlater: ['深度阅读', '长文', '精选'],
      note: ['笔记', '总结', '知识点'],
      inspiration: ['灵感', '想法', '创意'],
      article: ['文章', '排版', '正式'],
      study: ['学习', '视频笔记', '复习'],
    };
    const base = tagSets[type] || ['通用'];
    // 添加一个随机的上下文标签
    const contextTags = ['AI', '生产力', '技术', '设计', '商业', '教育', '编程'];
    base.push(contextTags[Math.floor(Math.random() * contextTags.length)]);
    return base;
  }

  function generateRelatedIdeas(text) {
    return [
      { title: '关于 AI 自动化的思考', similarity: '87%' },
      { title: '零摩擦体验设计原则', similarity: '72%' },
      { title: '个人知识管理的未来', similarity: '65%' },
    ];
  }

  function formatArticle(text, title) {
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim());
    let md = `# ${title}\n\n`;

    paragraphs.forEach((p, i) => {
      const trimmed = p.trim();
      if (i === 0) {
        md += `> ${trimmed}\n\n`;
      } else if (trimmed.length < 60) {
        md += `## ${trimmed}\n\n`;
      } else {
        const sentences = trimmed.split(/(?<=[。！？.!?])/);
        if (sentences.length > 1) {
          md += `**${sentences[0]}**${sentences.slice(1).join('')}\n\n`;
        } else {
          md += `${trimmed}\n\n`;
        }
      }
    });

    return md;
  }

  function generateVideoTitle() {
    const titles = [
      'How to Build a Second Brain — 完整方法论讲解',
      'The Future of AI Agents — 2026 年 AI 智能体趋势',
      'Deep Work 深度工作法 — 提升 10 倍专注力',
      'Building in Public — 如何公开构建你的产品',
      'The Art of Learning — 学习的艺术与科学',
    ];
    return titles[Math.floor(Math.random() * titles.length)];
  }

  function generateStudyNotes(title) {
    return {
      coreConcept: `这个视频的核心概念是：${title.split('—')[0].trim()}`,
      chapters: [
        { time: '0:00', title: '引言与背景', points: ['为什么这个话题重要', '当前面临的核心挑战'] },
        { time: '5:23', title: '核心方法论', points: ['第一原则：减少认知负担', '第二原则：系统化而非碎片化', '第三原则：输出驱动输入'] },
        { time: '15:47', title: '实践案例', points: ['案例一：从零搭建个人系统', '案例二：团队协作中的应用', '关键数据：效率提升 300%'] },
        { time: '28:12', title: '常见误区', points: ['误区一：工具越多越好', '误区二：追求完美的组织结构', '误区三：忽视回顾和迭代'] },
        { time: '38:45', title: '总结与行动建议', points: ['三个立即可做的改变', '推荐资源和延伸阅读'] },
      ],
      keyTerms: [
        { term: 'Second Brain', definition: '一个外部化的、数字化的个人知识管理系统' },
        { term: 'Progressive Summarization', definition: '渐进式总结法，通过多层高亮逐步提炼核心内容' },
        { term: 'PARA Method', definition: 'Projects/Areas/Resources/Archives 四层组织框架' },
      ],
    };
  }

  function generateMindMap(title) {
    const shortTitle = title.split('—')[0].trim();
    return `# ${shortTitle}\n## 核心概念\n### 减少认知负担\n### 系统化思维\n### 输出驱动\n## 方法论\n### 第一步：捕获\n### 第二步：组织\n### 第三步：提炼\n### 第四步：表达\n## 实践\n### 工具选择\n### 日常习惯\n### 定期回顾\n## 误区\n### 工具崇拜\n### 过度组织\n### 只输入不输出`;
  }

  function generateFlashcards(title) {
    return [
      { front: 'What is a "Second Brain"?', back: '一个外部化的数字知识管理系统，用于捕获、组织、提炼和表达你的想法和知识。' },
      { front: 'PARA 方法的四个层级是什么？', back: 'Projects（项目）、Areas（领域）、Resources（资源）、Archives（归档）' },
      { front: 'Progressive Summarization 的核心原则是？', back: '通过多层高亮逐步提炼内容：第一层原文、第二层加粗、第三层高亮、第四层摘要、第五层重混。' },
      { front: '为什么"输出驱动输入"很重要？', back: '因为只有当你需要使用知识时，你才会真正理解和内化它。没有输出目标的输入容易变成信息囤积。' },
      { front: '个人知识管理最常见的误区是什么？', back: '工具崇拜（不断换工具）、过度组织（花太多时间分类）、只输入不输出（收藏了但从不回顾）。' },
      { front: '什么是"认知负担"？如何减少它？', back: '认知负担是大脑处理信息时的心理压力。通过外部化（写下来）、系统化（固定流程）、自动化（AI辅助）来减少。' },
      { front: 'CODE 方法代表什么？', back: 'Capture（捕获）、Organize（组织）、Distill（提炼）、Express（表达）— 知识管理的四个核心步骤。' },
      { front: '定期回顾的最佳频率是？', back: '每周回顾（15分钟快速浏览本周笔记）+ 每月回顾（1小时深度整理和关联）+ 每季度回顾（重新评估系统）。' },
    ];
  }

  function generateQuiz(title) {
    return [
      { type: 'choice', question: '以下哪个不是 PARA 方法的组成部分？', options: ['Projects', 'Areas', 'Reviews', 'Archives'], answer: 2 },
      { type: 'choice', question: 'Progressive Summarization 共有几个层级？', options: ['3 层', '4 层', '5 层', '6 层'], answer: 2 },
      { type: 'truefalse', question: '个人知识管理系统应该追求完美的分类结构。', answer: false },
      { type: 'truefalse', question: '"输出驱动输入"意味着应该先确定输出目标再决定学什么。', answer: true },
      { type: 'truefalse', question: '使用越多的工具，知识管理效果越好。', answer: false },
      { type: 'choice', question: '减少认知负担的最有效方法是？', options: ['记住更多东西', '使用更多工具', '外部化和系统化', '减少学习量'], answer: 2 },
      { type: 'short', question: '请用一句话解释"Second Brain"的概念。', sampleAnswer: '一个外部化的数字系统，帮助你捕获、组织和利用知识。' },
      { type: 'short', question: 'CODE 方法的四个步骤分别是什么？', sampleAnswer: 'Capture（捕获）、Organize（组织）、Distill（提炼）、Express（表达）。' },
    ];
  }

  function generateActionPlan(title) {
    return {
      immediate: [
        '选择一个主力笔记工具（推荐 Obsidian 或 Notion），今天就开始用',
        '创建 PARA 四个顶级文件夹',
        '把今天看到的 3 个最有价值的内容记录下来',
      ],
      thisWeek: [
        '建立每日捕获习惯：每天至少记录 1 条灵感',
        '对本周的笔记做一次 Progressive Summarization',
        '写一篇 300 字的总结，练习"表达"环节',
      ],
      reading: [
        '《Building a Second Brain》 by Tiago Forte',
        '《How to Take Smart Notes》 by Sönke Ahrens',
        '《Deep Work》 by Cal Newport',
      ],
      reviewSchedule: '建议每周日花 15 分钟回顾本周笔记，每月最后一天做 1 小时深度整理。',
    };
  }

  // ============================================
  // 管道路由
  // ============================================
  const pipelineMap = {
    bookmark,
    readlater,
    deepSummary,
    inspiration,
    articleFormat,
    studyPack,
    todo: inspiration,   // MVP 阶段 todo 复用 inspiration
    meeting: deepSummary, // MVP 阶段 meeting 复用 deepSummary
  };

  async function run(pipelineName, input) {
    const fn = pipelineMap[pipelineName];
    if (!fn) throw new Error(`Unknown pipeline: ${pipelineName}`);
    return fn(input);
  }

  return { run, bookmark, readlater, deepSummary, inspiration, articleFormat, studyPack };

})();
