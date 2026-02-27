/* ============================================
   DropMind念投 — Voice Recorder + Smart Transcription
   Typeless-style: 语音转结构化文本
   ============================================ */

const VoiceRecorder = (() => {
  'use strict';

  let recognition = null;
  let isRecording = false;
  let rawChunks = [];       // 原始识别片段
  let interimText = '';     // 临时识别文本
  let finalText = '';       // 最终确认文本
  let onUpdate = null;      // 实时更新回调
  let onComplete = null;    // 完成回调
  let onError = null;       // 错误回调
  let silenceTimer = null;  // 静默检测
  let autoStopDelay = 3000; // 3秒静默自动停止

  // ============================================
  // 填充词 & 冗余词库
  // ============================================
  const FILLER_ZH = [
    '嗯', '啊', '呃', '额', '哦', '噢', '唔',
    '那个', '就是', '就是说', '然后呢', '然后',
    '对吧', '对不对', '你知道吗', '你知道的',
    '怎么说呢', '我觉得吧', '反正就是',
    '基本上', '其实吧', '说白了就是',
    '等一下', '稍等', '我想想',
    '所以说', '也就是说', '换句话说',
  ];

  const FILLER_EN = [
    'um', 'uh', 'uhh', 'umm', 'hmm', 'hm',
    'like', 'you know', 'i mean', 'basically',
    'actually', 'literally', 'right',
    'so yeah', 'kind of', 'sort of',
    'well', 'anyway', 'anyways',
  ];

  // 构建正则（中文填充词需要边界处理）
  const FILLER_ZH_RE = new RegExp(
    FILLER_ZH.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .sort((a, b) => b.length - a.length)
      .map(w => `(?:^|[，。、！？\\s])${w}(?:[，。、！？\\s]|$)`)
      .join('|'),
    'gi'
  );

  const FILLER_EN_RE = new RegExp(
    '\\b(' + FILLER_EN.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .sort((a, b) => b.length - a.length)
      .join('|') + ')\\b[,.]?\\s*',
    'gi'
  );

  // ============================================
  // 初始化 Speech Recognition
  // ============================================
  function initRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return null;

    const r = new SR();
    r.continuous = true;
    r.interimResults = true;
    r.lang = 'zh-CN';          // 主语言中文
    r.maxAlternatives = 1;

    r.onresult = (e) => {
      resetSilenceTimer();
      let interim = '';
      let final = '';

      for (let i = e.resultIndex; i < e.results.length; i++) {
        const transcript = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          final += transcript;
          rawChunks.push({
            text: transcript,
            confidence: e.results[i][0].confidence,
            timestamp: Date.now(),
          });
        } else {
          interim += transcript;
        }
      }

      if (final) {
        finalText += final;
      }
      interimText = interim;

      if (onUpdate) {
        onUpdate({
          raw: finalText + interimText,
          cleaned: cleanText(finalText + interimText),
          isFinal: false,
        });
      }
    };

    r.onerror = (e) => {
      if (e.error === 'no-speech') {
        // 静默，不算错误
        return;
      }
      console.warn('Speech recognition error:', e.error);
      if (onError) onError(e.error);
    };

    r.onend = () => {
      // 如果还在录音状态，自动重启（浏览器有时会中断）
      if (isRecording) {
        try { r.start(); } catch (e) {}
      }
    };

    return r;
  }

  // ============================================
  // 静默检测
  // ============================================
  function resetSilenceTimer() {
    clearTimeout(silenceTimer);
    silenceTimer = setTimeout(() => {
      if (isRecording && finalText.trim()) {
        stop();
      }
    }, autoStopDelay);
  }

  // ============================================
  // 智能文本清洗管道
  // ============================================
  function cleanText(raw) {
    if (!raw || !raw.trim()) return '';

    let text = raw;

    // Step 1: 去除填充词
    text = removeFiller(text);

    // Step 2: 识别自我修正（保留最终表达）
    text = handleSelfCorrection(text);

    // Step 3: 规范标点
    text = normalizePunctuation(text);

    // Step 4: 结构化识别（列表、步骤等）
    text = structurize(text);

    // Step 5: 最终清理
    text = finalCleanup(text);

    return text;
  }

  // --- Step 1: 去填充词 ---
  function removeFiller(text) {
    // 中文填充词
    FILLER_ZH.forEach(w => {
      // 在句首、逗号后、句中独立出现的填充词
      const re = new RegExp(`(^|[，,。.！!？?、\\s])${escRe(w)}([，,。.！!？?、\\s]|$)`, 'g');
      text = text.replace(re, (m, before, after) => {
        return before + after;
      });
    });

    // 英文填充词
    text = text.replace(FILLER_EN_RE, ' ');

    // 重复的语气词 "嗯嗯嗯" → ""
    text = text.replace(/([嗯啊呃额哦噢唔])\1{1,}/g, '');

    return text;
  }

  // --- Step 2: 自我修正识别 ---
  function handleSelfCorrection(text) {
    // 模式1: "不对不对，应该是X" → "X"
    text = text.replace(/不对不对[，,]?\s*(应该是|是)\s*/g, '');
    text = text.replace(/不是不是[，,]?\s*(应该是|是)\s*/g, '');

    // 模式2: "A，不，B" → "B" (中文修正)
    text = text.replace(/([^，。！？]+)[，,]\s*不[，,]\s*([^，。！？]+)/g, '$2');

    // 模式3: "A，哦不对，B" → "B"
    text = text.replace(/([^，。！？]+)[，,]\s*哦?\s*不对[，,]?\s*([^，。！？]+)/g, '$2');

    // 模式4: "我说错了" / "说反了" 后面的内容替代前面
    text = text.replace(/([^。！？]+)[，,]\s*(我说错了|说反了|说错了)[，,]?\s*/g, '');

    // 模式5: "wait no" / "I mean" 英文修正
    text = text.replace(/\b\w+[,.]?\s*(wait no|no wait|I mean|sorry I meant)\s*/gi, '');

    return text;
  }

  // --- Step 3: 标点规范化 ---
  function normalizePunctuation(text) {
    // 多个逗号合并
    text = text.replace(/[，,]{2,}/g, '，');
    // 多个句号合并
    text = text.replace(/[。.]{2,}/g, '。');
    // 逗号后无空格（中文不需要）
    text = text.replace(/，\s+/g, '，');
    // 句首逗号去掉
    text = text.replace(/^[，,\s]+/, '');
    // 连续空格
    text = text.replace(/\s{2,}/g, ' ');
    // 英文句子首字母大写
    text = text.replace(/([.!?]\s+)([a-z])/g, (m, p, c) => p + c.toUpperCase());

    // 如果没有句末标点，加上
    if (text && !/[。！？.!?]$/.test(text.trim())) {
      // 判断最后是中文还是英文
      const lastChar = text.trim().slice(-1);
      if (/[\u4e00-\u9fff]/.test(lastChar)) {
        text = text.trim() + '。';
      } else {
        text = text.trim() + '.';
      }
    }

    return text;
  }

  // --- Step 4: 结构化识别 ---
  function structurize(text) {
    // 识别 "第一...第二...第三..." 模式
    const stepPattern = /第([一二三四五六七八九十\d]+)[，,、:：]?\s*/g;
    if ((text.match(stepPattern) || []).length >= 2) {
      text = text.replace(stepPattern, '\n$&');
      text = text.replace(/^\n/, ''); // 去掉开头换行
    }

    // 识别 "首先...其次...最后..." 模式
    const seqWords = ['首先', '其次', '再次', '然后', '接着', '最后', '另外', '此外'];
    let seqCount = 0;
    seqWords.forEach(w => { if (text.includes(w)) seqCount++; });
    if (seqCount >= 2) {
      seqWords.forEach(w => {
        text = text.replace(new RegExp(`([^\\n])${w}`, 'g'), `$1\n${w}`);
      });
    }

    // 识别 "1. 2. 3." 或 "一、二、三、" 编号模式
    const numPattern = /(\d+)[.、．]\s*/g;
    if ((text.match(numPattern) || []).length >= 2) {
      text = text.replace(/(\d+)[.、．]\s*/g, '\n$1. ');
      text = text.replace(/^\n/, '');
    }

    return text;
  }

  // --- Step 5: 最终清理 ---
  function finalCleanup(text) {
    // 去掉多余空行
    text = text.replace(/\n{3,}/g, '\n\n');
    // 去掉行首行尾空格
    text = text.split('\n').map(l => l.trim()).join('\n');
    // 去掉空行首的标点
    text = text.replace(/\n[，,、]/g, '\n');
    return text.trim();
  }

  function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  // ============================================
  // 公共 API
  // ============================================
  function start(callbacks = {}) {
    if (isRecording) return false;

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      if (callbacks.onError) callbacks.onError('not-supported');
      return false;
    }

    onUpdate = callbacks.onUpdate || null;
    onComplete = callbacks.onComplete || null;
    onError = callbacks.onError || null;

    rawChunks = [];
    interimText = '';
    finalText = '';

    recognition = initRecognition();
    if (!recognition) return false;

    try {
      recognition.start();
      isRecording = true;
      resetSilenceTimer();
      return true;
    } catch (e) {
      console.error('Failed to start recognition:', e);
      return false;
    }
  }

  function stop() {
    if (!isRecording) return '';
    isRecording = false;
    clearTimeout(silenceTimer);

    if (recognition) {
      try { recognition.stop(); } catch (e) {}
      recognition = null;
    }

    const result = {
      raw: finalText,
      cleaned: cleanText(finalText),
      chunks: rawChunks,
      duration: rawChunks.length > 0
        ? rawChunks[rawChunks.length - 1].timestamp - rawChunks[0].timestamp
        : 0,
    };

    if (onComplete) onComplete(result);
    return result;
  }

  function cancel() {
    isRecording = false;
    clearTimeout(silenceTimer);
    if (recognition) {
      try { recognition.abort(); } catch (e) {}
      recognition = null;
    }
    rawChunks = [];
    finalText = '';
    interimText = '';
  }

  function isSupported() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  function getState() { return isRecording; }

  // 暴露 cleanText 供外部测试
  return { start, stop, cancel, isSupported, isRecording: getState, cleanText };
})();
