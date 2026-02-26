/* ============================================
   DropMind念投 — Intent Engine v2
   三级瀑布式意图判断
   ============================================ */

const IntentEngine = (() => {

  // 意图类型定义
  const INTENTS = {
    BOOKMARK: { key: 'bookmark', label: '📌 书签', color: '#f59e0b', pipeline: 'bookmark' },
    READ_LATER: { key: 'readlater', label: '📖 稍后阅读', color: '#06b6d4', pipeline: 'readlater' },
    DEEP_SUMMARY: { key: 'note', label: '📝 深度总结', color: '#3b82f6', pipeline: 'deepSummary' },
    INSPIRATION: { key: 'inspiration', label: '💡 灵感', color: '#a78bfa', pipeline: 'inspiration' },
    ARTICLE_FORMAT: { key: 'article', label: '✍️ 文章排版', color: '#10b981', pipeline: 'articleFormat' },
    STUDY_PACK: { key: 'study', label: '🎓 学习包', color: '#f472b6', pipeline: 'studyPack' },
    TODO: { key: 'todo', label: '📋 待办事项', color: '#fb923c', pipeline: 'todo' },
    MEETING: { key: 'meeting', label: '📋 会议纪要', color: '#38bdf8', pipeline: 'meeting' },
  };

  // ============================================
  // 第一级：确定性规则匹配（0ms，100% 准确）
  // ============================================
  function level1_RuleMatch(input) {
    const trimmed = input.trim();

    // YouTube URL 检测
    const ytRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/i;
    if (ytRegex.test(trimmed)) {
      return { intent: INTENTS.STUDY_PACK, confidence: 0.98, level: 1, reason: 'YouTube URL detected' };
    }

    // Bilibili URL
    const biliRegex = /(?:https?:\/\/)?(?:www\.)?bilibili\.com\/video\//i;
    if (biliRegex.test(trimmed)) {
      return { intent: INTENTS.STUDY_PACK, confidence: 0.95, level: 1, reason: 'Bilibili URL detected' };
    }

    // PDF URL
    if (/\.pdf(\?.*)?$/i.test(trimmed) && /^https?:\/\//i.test(trimmed)) {
      return { intent: INTENTS.DEEP_SUMMARY, confidence: 0.92, level: 1, reason: 'PDF URL detected' };
    }

    // Twitter/X URL — 通常是书签
    const twitterRegex = /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\//i;
    if (twitterRegex.test(trimmed)) {
      return { intent: INTENTS.BOOKMARK, confidence: 0.90, level: 1, reason: 'Twitter/X URL detected' };
    }

    // 通用 URL — 区分书签 vs 稍后阅读
    const urlRegex = /^https?:\/\/[^\s]+$/i;
    if (urlRegex.test(trimmed)) {
      // 文章类域名/路径 → 稍后阅读
      const articleDomains = /medium\.com|substack\.com|zhihu\.com\/p\/|mp\.weixin\.qq\.com|dev\.to|hackernoon\.com|paulgraham\.com|blog\./i;
      const articlePaths = /\/(blog|article|post|story|p|entry|news)\//i;
      if (articleDomains.test(trimmed) || articlePaths.test(trimmed)) {
        return { intent: INTENTS.READ_LATER, confidence: 0.90, level: 1, reason: 'Article-like URL → read later' };
      }
      // 其他普通 URL → 书签
      return { intent: INTENTS.BOOKMARK, confidence: 0.90, level: 1, reason: 'Generic URL → bookmark' };
    }

    // 不是 URL，进入文本分析
    return null;
  }

  // ============================================
  // 第二级：启发式规则 + 轻量分析（<500ms）
  // ============================================
  function level2_Heuristic(input) {
    const trimmed = input.trim();
    const charCount = trimmed.length;
    const wordCount = trimmed.split(/\s+/).length;

    // 纯文本分析（URL 已在 level1 处理完毕）
    const hasVerb = /[做去看写发送完成检查确认提交创建删除修改更新回复联系购买预约安排]/.test(trimmed);
    const isImperative = /^(请|帮我|记得|别忘了|需要|要|去)/.test(trimmed);
    const hasTodoKeywords = /(TODO|待办|提醒|deadline|截止|明天|下周|今天要)/.test(trimmed);

    // 短文本 < 100 字符
    if (charCount < 100) {
      if (hasTodoKeywords || (isImperative && hasVerb)) {
        return { intent: INTENTS.TODO, confidence: 0.88, level: 2, reason: 'Short text with action words → todo' };
      }
      return { intent: INTENTS.INSPIRATION, confidence: 0.90, level: 2, reason: 'Short text → inspiration' };
    }

    // 中等文本 100-800 字符
    if (charCount >= 100 && charCount < 800) {
      const meetingKeywords = /(会议|meeting|讨论|决定|参会|纪要|action item|跟进|follow up)/i;
      if (meetingKeywords.test(trimmed)) {
        return { intent: INTENTS.MEETING, confidence: 0.85, level: 2, reason: 'Medium text with meeting keywords' };
      }

      // 看起来像笔记/想法
      const noteKeywords = /(想到|觉得|思考|感觉|也许|可能|如果|假设|idea|thought|maybe)/i;
      if (noteKeywords.test(trimmed)) {
        return { intent: INTENTS.INSPIRATION, confidence: 0.82, level: 2, reason: 'Medium text with thought keywords' };
      }

      // 默认：深度总结
      return { intent: INTENTS.DEEP_SUMMARY, confidence: 0.80, level: 2, reason: 'Medium text → deep summary' };
    }

    // 长文本 > 800 字符 → 文章排版
    if (charCount >= 800) {
      return { intent: INTENTS.ARTICLE_FORMAT, confidence: 0.92, level: 2, reason: 'Long text (>800 chars) → article format' };
    }

    return { intent: INTENTS.DEEP_SUMMARY, confidence: 0.70, level: 2, reason: 'Fallback → deep summary' };
  }

  // ============================================
  // 第三级：用户确认（置信度 < 85% 时触发）
  // ============================================
  function needsConfirmation(result) {
    return result.confidence < 0.85;
  }

  function getAlternatives(result) {
    const current = result.intent.key;
    const alternatives = [];

    // 根据当前意图推荐替代选项
    const altMap = {
      bookmark: [INTENTS.READ_LATER, INTENTS.DEEP_SUMMARY, INTENTS.INSPIRATION],
      readlater: [INTENTS.BOOKMARK, INTENTS.DEEP_SUMMARY, INTENTS.INSPIRATION],
      note: [INTENTS.ARTICLE_FORMAT, INTENTS.INSPIRATION, INTENTS.BOOKMARK],
      inspiration: [INTENTS.DEEP_SUMMARY, INTENTS.ARTICLE_FORMAT, INTENTS.TODO],
      article: [INTENTS.DEEP_SUMMARY, INTENTS.INSPIRATION],
      study: [INTENTS.DEEP_SUMMARY, INTENTS.BOOKMARK],
      todo: [INTENTS.INSPIRATION, INTENTS.DEEP_SUMMARY],
      meeting: [INTENTS.DEEP_SUMMARY, INTENTS.TODO],
    };

    return altMap[current] || [INTENTS.DEEP_SUMMARY, INTENTS.BOOKMARK];
  }

  // ============================================
  // 主入口：分析输入
  // ============================================
  function analyze(input) {
    if (!input || !input.trim()) return null;

    // Level 1: 规则匹配
    let result = level1_RuleMatch(input);
    if (result) return result;

    // Level 2: 启发式分析
    result = level2_Heuristic(input);
    return result;
  }

  // 公开 API
  return {
    INTENTS,
    analyze,
    needsConfirmation,
    getAlternatives,
  };

})();
