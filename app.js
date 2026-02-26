/* ============================================
   DropMind念投 — Main Application v2.0
   Apple-level polish · Zero friction
   ============================================ */

(function() {
  'use strict';

  // DOM 元素
  const $ = id => document.getElementById(id);
  const userInput = $('user-input');
  const btnSend = $('btn-send');
  const mainView = $('main-view');
  const processingOverlay = $('processing-overlay');
  const resultView = $('result-view');
  const resultContent = $('result-content');
  const recentCards = $('recent-cards');
  const recentSection = $('recent-section');
  const libraryPanel = $('library-panel');
  const searchPanel = $('search-panel');
  const libraryItems = $('library-items');
  const searchResults = $('search-results');
  const fileInput = $('file-input');

  // ============================================
  // 主题切换
  // ============================================
  function initTheme() {
    const saved = localStorage.getItem('dropmind_theme');
    if (saved === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
    // 默认浅色，不需要设置 attribute
  }

  function toggleTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('dropmind_theme', 'light');
      showToast('已切换到浅色模式');
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('dropmind_theme', 'dark');
      showToast('已切换到深色模式');
    }
  }

  // ============================================
  // 初始化
  // ============================================
  function init() {
    initTheme();
    bindEvents();
    renderRecentCards();
    autoResizeTextarea();
    // 入场动画
    requestAnimationFrame(() => {
      document.body.classList.add('loaded');
    });
  }

  function bindEvents() {
    btnSend.addEventListener('click', handleSend);
    userInput.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    });
    userInput.addEventListener('input', autoResizeTextarea);

    // 快捷示例 — 带打字机效果
    document.querySelectorAll('.example-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        typeIntoInput(chip.dataset.example);
      });
    });

    // 导航按钮
    $('btn-theme').addEventListener('click', toggleTheme);
    $('btn-library').addEventListener('click', toggleLibrary);
    $('btn-search').addEventListener('click', toggleSearch);
    $('btn-close-library').addEventListener('click', () => animateHidePanel(libraryPanel));
    $('btn-close-search').addEventListener('click', () => animateHidePanel(searchPanel));
    $('btn-back').addEventListener('click', showMainView);

    // 知识库标签切换
    document.querySelectorAll('.library-tabs .tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.library-tabs .tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        renderLibraryItems(tab.dataset.tab);
      });
    });

    // 知识库搜索 — 防抖
    let libSearchTimer;
    $('library-search-input').addEventListener('input', e => {
      clearTimeout(libSearchTimer);
      libSearchTimer = setTimeout(() => {
        renderLibraryItemsList(KnowledgeBase.search(e.target.value));
      }, 150);
    });

    // 全局搜索 — 防抖
    let globalSearchTimer;
    $('global-search-input').addEventListener('input', e => {
      clearTimeout(globalSearchTimer);
      globalSearchTimer = setTimeout(() => {
        renderSearchResults(KnowledgeBase.search(e.target.value));
      }, 150);
    });

    // 文件上传
    $('btn-file').addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileUpload);

    // 粘贴处理
    userInput.addEventListener('paste', () => {
      setTimeout(() => autoResizeTextarea(), 50);
    });

    // 键盘快捷键
    document.addEventListener('keydown', handleGlobalKeys);

    // ESC 关闭面板
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        if (libraryPanel.style.display !== 'none') animateHidePanel(libraryPanel);
        else if (searchPanel.style.display !== 'none') animateHidePanel(searchPanel);
      }
    });
  }

  // 全局快捷键
  function handleGlobalKeys(e) {
    // Cmd/Ctrl + K = 搜索
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      toggleSearch();
    }
    // Cmd/Ctrl + L = 知识库
    if ((e.metaKey || e.ctrlKey) && e.key === 'l') {
      e.preventDefault();
      toggleLibrary();
    }
  }

  // 打字机效果
  function typeIntoInput(text) {
    userInput.value = '';
    userInput.focus();
    let i = 0;
    const speed = Math.max(15, Math.min(35, 800 / text.length));
    function type() {
      if (i < text.length) {
        userInput.value += text.charAt(i);
        i++;
        autoResizeTextarea();
        requestAnimationFrame(() => setTimeout(type, speed));
      }
    }
    type();
  }

  function autoResizeTextarea() {
    userInput.style.height = 'auto';
    userInput.style.height = Math.min(userInput.scrollHeight, 200) + 'px';
    btnSend.disabled = !userInput.value.trim();
  }

  // ============================================
  // 核心流程：发送 → 意图判断 → 处理 → 展示
  // ============================================
  async function handleSend() {
    const input = userInput.value.trim();
    if (!input) return;

    const intentResult = IntentEngine.analyze(input);
    if (!intentResult) return;

    if (IntentEngine.needsConfirmation(intentResult)) {
      showConfirmation(input, intentResult);
      return;
    }

    await processInput(input, intentResult);
  }

  async function processInput(input, intentResult) {
    userInput.value = '';
    autoResizeTextarea();
    showProcessing();

    try {
      const pipeline = intentResult.intent.pipeline;
      const result = await Pipelines[pipeline](input);
      const saved = KnowledgeBase.add(result);
      showResult(saved);
    } catch (err) {
      console.error('Processing error:', err);
      hideProcessing();
      showMainView();
      showToast('处理出错，请重试');
    }
  }

  // ============================================
  // 意图确认弹窗
  // ============================================
  function showConfirmation(input, intentResult) {
    const alternatives = IntentEngine.getAlternatives(intentResult);
    const overlay = document.createElement('div');
    overlay.className = 'confirmation-overlay';
    overlay.innerHTML = `
      <div class="confirmation-card animate-in">
        <div class="confirmation-header">
          <span>🤔</span>
          <span>我觉得这是 <strong>${intentResult.intent.label}</strong></span>
        </div>
        <div class="confirmation-preview">${truncate(input, 100)}</div>
        <div class="confirmation-actions">
          <button class="confirm-btn primary" data-pipeline="${intentResult.intent.pipeline}">
            ✅ 没错，${intentResult.intent.label}
          </button>
          ${alternatives.map(alt => `
            <button class="confirm-btn" data-pipeline="${alt.pipeline}">${alt.label}</button>
          `).join('')}
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    // 入场动画后绑定事件
    requestAnimationFrame(() => overlay.style.opacity = '1');

    overlay.querySelectorAll('.confirm-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const pipeline = btn.dataset.pipeline;
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 250);
        const intent = Object.values(IntentEngine.INTENTS).find(i => i.pipeline === pipeline);
        await processInput(input, { intent, confidence: 1, level: 3 });
      });
    });

    overlay.addEventListener('click', e => {
      if (e.target === overlay) {
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 250);
      }
    });
  }

  // ============================================
  // 视图切换 — 平滑过渡
  // ============================================
  function showProcessing() {
    fadeOut(mainView, () => { mainView.style.display = 'none'; });
    resultView.style.display = 'none';
    processingOverlay.style.display = 'flex';
    processingOverlay.style.opacity = '0';
    requestAnimationFrame(() => { processingOverlay.style.opacity = '1'; });
  }

  function hideProcessing() {
    processingOverlay.style.opacity = '0';
    setTimeout(() => { processingOverlay.style.display = 'none'; }, 300);
  }

  function showResult(item) {
    hideProcessing();
    mainView.style.display = 'none';

    // 置顶按钮
    const backBtn = $('btn-back');
    const oldPin = document.getElementById('btn-pin-result');
    if (oldPin) oldPin.remove();
    const pinBtn = document.createElement('button');
    pinBtn.id = 'btn-pin-result';
    pinBtn.className = 'pin-result-btn' + (item.pinned ? ' active' : '');
    pinBtn.innerHTML = item.pinned ? '📍 已置顶' : '📌 置顶';
    pinBtn.addEventListener('click', () => {
      const updated = KnowledgeBase.togglePin(item.id);
      if (updated) {
        item.pinned = updated.pinned;
        pinBtn.className = 'pin-result-btn' + (item.pinned ? ' active' : '');
        pinBtn.innerHTML = item.pinned ? '📍 已置顶' : '📌 置顶';
        showToast(item.pinned ? '已置顶' : '已取消置顶');
      }
    });
    backBtn.parentNode.insertBefore(pinBtn, backBtn.nextSibling);

    resultContent.innerHTML = renderResultDetail(item);
    resultView.style.display = 'block';
    resultView.style.opacity = '0';
    resultView.style.transform = 'translateY(12px)';
    requestAnimationFrame(() => {
      resultView.style.transition = 'opacity 0.4s cubic-bezier(0.16,1,0.3,1), transform 0.4s cubic-bezier(0.16,1,0.3,1)';
      resultView.style.opacity = '1';
      resultView.style.transform = 'translateY(0)';
    });

    // 绑定迭代按钮
    resultContent.querySelectorAll('.iterate-btn').forEach(btn => {
      btn.addEventListener('click', () => handleIterate(btn.dataset.action, item));
    });
  }

  function showMainView() {
    resultView.style.opacity = '0';
    resultView.style.transform = 'translateY(12px)';
    setTimeout(() => {
      resultView.style.display = 'none';
      mainView.style.display = 'block';
      mainView.style.opacity = '0';
      requestAnimationFrame(() => {
        mainView.style.transition = 'opacity 0.35s cubic-bezier(0.16,1,0.3,1)';
        mainView.style.opacity = '1';
      });
      renderRecentCards();
      userInput.focus();
    }, 250);
  }

  function fadeOut(el, cb) {
    el.style.transition = 'opacity 0.2s ease';
    el.style.opacity = '0';
    setTimeout(() => { if (cb) cb(); }, 200);
  }

  // ============================================
  // 结果详情渲染（按类型分发）
  // ============================================
  function renderResultDetail(item) {
    const r = {
      bookmark: renderBookmark, readlater: renderReadLater,
      note: renderNote, inspiration: renderInspiration,
      article: renderArticle, study: renderStudy,
    };
    return (r[item.type] || renderGeneric)(item);
  }

  function badge(label, color) {
    return `<div class="result-type-badge badge-${label.split(' ')[1] || 'note'}" style="background:${color}15;color:${color}">${label}</div>`;
  }

  function tagsHtml(tags) {
    return tags ? `<div class="card-tags">${tags.map(t=>`<span class="tag">${t}</span>`).join('')}</div>` : '';
  }

  function renderBookmark(item) {
    const d = item.data;
    return `<div class="result-header">${badge('📌 书签','#f59e0b')}
      <h2 class="result-title">${item.title}</h2>
      <div class="result-meta"><span>🌐 ${d.domain}</span><span>📅 ${fmtDate(item.createdAt)}</span></div></div>
      <div class="result-body"><p>${d.description}</p>
      <p><a href="${d.url}" target="_blank" class="detail-link">${d.url}</a></p></div>
      ${tagsHtml(d.tags)}
      <div class="iterate-bar">
        <button class="iterate-btn" data-action="deepSummary">📝 深度总结</button>
        <button class="iterate-btn" data-action="readlater">📖 稍后阅读</button>
        <button class="iterate-btn" data-action="delete">🗑️ 删除</button>
      </div>`;
  }

  function renderReadLater(item) {
    const d = item.data;
    return `<div class="result-header">${badge('📖 稍后阅读','#06b6d4')}
      <h2 class="result-title">${item.title}</h2>
      <div class="result-meta"><span>⏱️ ${d.readTime}</span><span>${d.priority}</span></div></div>
      <div class="result-body"><div class="key-points"><div class="key-points-title">📋 摘要</div><p>${d.summary}</p></div>
      <p><a href="${d.url}" target="_blank" class="detail-link">🔗 打开原文</a></p></div>
      ${tagsHtml(d.tags)}
      <div class="iterate-bar">
        <button class="iterate-btn" data-action="deepSummary">📝 深度总结</button>
        <button class="iterate-btn" data-action="bookmark">📌 转为书签</button>
        <button class="iterate-btn" data-action="delete">🗑️ 删除</button>
      </div>`;
  }

  function renderNote(item) {
    const d = item.data;
    return `<div class="result-header">${badge('📝 深度总结','#3b82f6')}
      <h2 class="result-title">${item.title}</h2></div>
      <div class="result-body">
        <div class="key-points"><div class="key-points-title">🎯 核心观点</div><p>${d.coreSentence}</p></div>
        <h2>📌 关键要点</h2>
        ${d.keyPoints.map(p=>`<div class="key-point"><span class="key-point-bullet">${p.icon}</span><span>${p.text}</span></div>`).join('')}
        <h2>📐 结构大纲</h2>
        ${d.outline.map(o=>`<p style="padding-left:${(o.level-1)*20}px">${o.level===1?'<strong>':''} ${o.text} ${o.level===1?'</strong>':''}</p>`).join('')}
        <h2>💎 金句</h2>
        ${d.quotes.map(q=>`<blockquote>${q}</blockquote>`).join('')}
      </div>
      ${tagsHtml(d.tags)}
      <div class="iterate-bar">
        <button class="iterate-btn" data-action="moreDetail">更详细</button>
        <button class="iterate-btn" data-action="shorter">更简短</button>
        <button class="iterate-btn" data-action="flashcards">🃏 转闪卡</button>
        <button class="iterate-btn" data-action="export">📤 导出</button>
      </div>`;
  }

  function renderInspiration(item) {
    const d = item.data;
    return `<div class="result-header">${badge('💡 灵感','#a78bfa')}
      <h2 class="result-title">${d.structuredTitle}</h2></div>
      <div class="result-body">
        <div class="key-points"><div class="key-points-title">💭 原始想法</div><p>${d.originalText}</p></div>
        ${d.relatedIdeas.length ? `<h2>🔗 关联灵感</h2>${d.relatedIdeas.map(r=>`<div class="key-point"><span class="key-point-bullet">→</span><span>${r.title} <em style="color:var(--text-tertiary)">(${r.similarity})</em></span></div>`).join('')}` : ''}
      </div>
      ${tagsHtml(d.tags)}
      <div class="iterate-bar">
        <button class="iterate-btn" data-action="expand">✍️ 展开成文章</button>
        <button class="iterate-btn" data-action="search">🔍 关联搜索</button>
        <button class="iterate-btn" data-action="delete">🗑️ 删除</button>
      </div>`;
  }

  function renderArticle(item) {
    const d = item.data;
    const mdContent = d.markdownContent || d.originalText || '';
    const htmlContent = d.formattedHtml || (typeof marked !== 'undefined' ? marked.parse(mdContent) : mdContent);
    return `<div class="result-header">${badge('✍️ 排版文章','#10b981')}
      <h2 class="result-title">${item.title}</h2>
      <div class="result-meta"><span>📝 ${d.wordCount} 字</span>
        <div class="view-toggle">
          <button class="toggle-btn active" data-mode="preview" onclick="window.__toggleArticleMode('preview',this)">👁️ 预览</button>
          <button class="toggle-btn" data-mode="edit" onclick="window.__toggleArticleMode('edit',this)">✏️ 编辑</button>
        </div>
      </div></div>
      <div class="article-container" data-item-id="${item.id}">
        <div class="article-preview" id="article-preview">${htmlContent}</div>
        <div class="article-editor" id="article-editor" style="display:none">
          <div class="editor-toolbar">
            <button class="tb-btn" data-cmd="heading" title="标题">H</button>
            <button class="tb-btn" data-cmd="bold" title="加粗"><b>B</b></button>
            <button class="tb-btn" data-cmd="italic" title="斜体"><i>I</i></button>
            <button class="tb-btn" data-cmd="underline" title="下划线"><u>U</u></button>
            <span class="tb-sep"></span>
            <button class="tb-btn" data-cmd="link" title="插入链接">🔗</button>
            <button class="tb-btn" data-cmd="image" title="插入图片">🖼️</button>
            <button class="tb-btn" data-cmd="code" title="代码块">&lt;/&gt;</button>
            <button class="tb-btn" data-cmd="quote" title="引用">❝</button>
            <button class="tb-btn" data-cmd="ul" title="无序列表">•</button>
            <button class="tb-btn" data-cmd="ol" title="有序列表">1.</button>
            <button class="tb-btn" data-cmd="hr" title="分割线">─</button>
          </div>
          <textarea class="editor-textarea" id="editor-textarea">${mdContent}</textarea>
        </div>
      </div>
      ${tagsHtml(d.tags)}
      <div class="iterate-bar">
        <button class="iterate-btn" data-action="formal">更正式</button>
        <button class="iterate-btn" data-action="casual">更口语</button>
        <button class="iterate-btn" data-action="copy">📋 复制</button>
        <button class="iterate-btn" data-action="export">📤 导出</button>
      </div>`;
  }

  function renderStudy(item) {
    const d = item.data;
    const n = d.notes;
    return `<div class="result-header">${badge('🎓 学习包','#f472b6')}
      <h2 class="result-title">${item.title}</h2>
      <div class="result-meta"><span>🎬 YouTube</span><span>📅 ${fmtDate(item.createdAt)}</span></div></div>
      <div class="result-body">
        <div class="study-section">
          <h2>📝 结构化笔记</h2>
          <div class="key-points"><div class="key-points-title">🎯 核心概念</div><p>${n.coreConcept}</p></div>
          ${n.chapters.map(ch => `
            <div class="chapter">
              <div class="chapter-header"><span class="chapter-time">${ch.time}</span><strong>${ch.title}</strong></div>
              <ul class="chapter-points">${ch.points.map(p => `<li>${p}</li>`).join('')}</ul>
            </div>
          `).join('')}
          <h3>📖 关键术语</h3>
          <div class="terms-grid">
            ${n.keyTerms.map(t => `<div class="term-card"><div class="term-name">${t.term}</div><div class="term-def">${t.definition}</div></div>`).join('')}
          </div>
        </div>
        <div class="study-section">
          <h2>🗺️ 思维导图</h2>
          <div class="mindmap-preview">
            <pre class="mindmap-text">${d.mindmap}</pre>
          </div>
        </div>
        <div class="study-section">
          <h2>🃏 Anki 闪卡 (${d.flashcards.length} 张)</h2>
          <div class="flashcard-grid">
            ${d.flashcards.map((fc, i) => `
              <div class="flashcard" onclick="this.classList.toggle('flipped')">
                <div class="flashcard-inner">
                  <div class="flashcard-front"><span class="fc-num">#${i+1}</span>${fc.front}</div>
                  <div class="flashcard-back">${fc.back}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="study-section">
          <h2>❓ 自测题 (${d.quiz.length} 道)</h2>
          ${d.quiz.map((q, i) => `
            <div class="quiz-item">
              <div class="quiz-q"><strong>Q${i+1}.</strong> ${q.question}</div>
              ${q.options ? `<div class="quiz-options">${q.options.map((o,j) => `<div class="quiz-option" onclick="this.classList.add(${j}===${q.answer}?'correct':'wrong')">${String.fromCharCode(65+j)}. ${o}</div>`).join('')}</div>` : ''}
              <div class="quiz-answer" style="display:none"><strong>答案：</strong>${q.options ? q.options[q.answer] : q.answer}</div>
              <button class="show-answer-btn" onclick="this.previousElementSibling.style.display='block';this.style.display='none'">显示答案</button>
            </div>
          `).join('')}
        </div>
        <div class="study-section">
          <h2>🎯 行动计划</h2>
          <div class="action-plan">
            <h3>立即可做</h3>
            ${d.actionPlan.immediate.map(a => `<div class="action-item"><span class="action-check">☐</span>${a}</div>`).join('')}
            <h3>延伸阅读</h3>
            ${d.actionPlan.reading.map(a => `<div class="action-item"><span class="action-check">📚</span>${a}</div>`).join('')}
            <h3>复习计划</h3>
            <p style="color:var(--text-secondary)">${d.actionPlan.reviewSchedule}</p>
          </div>
        </div>
      </div>
      ${tagsHtml(d.tags)}
      <div class="iterate-bar">
        <button class="iterate-btn" data-action="moreCards">🃏 更多闪卡</button>
        <button class="iterate-btn" data-action="moreQuiz">❓ 更多测验</button>
        <button class="iterate-btn" data-action="simpler">简化难度</button>
        <button class="iterate-btn" data-action="exportAll">📤 导出全部</button>
      </div>`;
  }

  function renderGeneric(item) {
    return `<div class="result-header"><h2 class="result-title">${item.title}</h2></div>
      <div class="result-body"><pre style="white-space:pre-wrap;font-size:13px;color:var(--text-secondary)">${JSON.stringify(item.data,null,2)}</pre></div>`;
  }

  // ============================================
  // 迭代按钮处理
  // ============================================
  function handleIterate(action, item) {
    if (action === 'delete') {
      KnowledgeBase.remove(item.id);
      showToast('已删除');
      showMainView();
      return;
    }
    if (action === 'copy') {
      const t = item.data.formattedHtml || item.data.originalText || item.title;
      navigator.clipboard.writeText(t.replace(/<[^>]*>/g,'')).then(() => showToast('已复制到剪贴板'));
      return;
    }
    if (action === 'export' || action === 'exportAll') { exportItem(item); return; }
    if (action === 'deepSummary' && item.data.url) {
      processInput(item.data.url, {intent:IntentEngine.INTENTS.DEEP_SUMMARY,confidence:1,level:3});
      return;
    }
    showToast(`"${action}" 功能将在正式版中上线`);
  }

  function exportItem(item) {
    const blob = new Blob([JSON.stringify(item,null,2)],{type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `dropmind-${item.type}-${item.id}.json`;
    a.click();
    showToast('已导出');
  }

  // ============================================
  // 最近处理卡片
  // ============================================
  function renderRecentCards() {
    const recent = KnowledgeBase.getRecent(6);
    if (!recent.length) {
      recentSection.style.display = 'none';
      return;
    }
    recentSection.style.display = 'block';
    const tc = {
      bookmark:{icon:'📌',badge:'badge-bookmark',label:'书签'},
      readlater:{icon:'📖',badge:'badge-readlater',label:'稍后阅读'},
      note:{icon:'📝',badge:'badge-note',label:'笔记'},
      inspiration:{icon:'💡',badge:'badge-inspiration',label:'灵感'},
      article:{icon:'✍️',badge:'badge-article',label:'文章'},
      study:{icon:'🎓',badge:'badge-study',label:'学习包'},
    };
    recentCards.innerHTML = recent.map(item => {
      const c = tc[item.type]||{icon:'📄',badge:'',label:item.type};
      return `<div class="result-card${item.pinned?' pinned':''}" data-id="${item.id}">
        ${item.pinned?'<span class="card-pin-badge">📍 置顶</span>':''}
        <span class="card-type-badge ${c.badge}">${c.icon} ${c.label}</span>
        <div class="card-title">${truncate(item.title,50)}</div>
        <div class="card-preview">${truncate(item.data.summary||item.data.description||item.data.originalText||item.data.coreSentence||'',60)}</div>
        <div class="card-time">${fmtDate(item.createdAt)}</div>
      </div>`;
    }).join('');
    recentCards.querySelectorAll('.result-card').forEach(card => {
      card.addEventListener('click', () => {
        const it = KnowledgeBase.getById(card.dataset.id);
        if(it) showResult(it);
      });
    });
  }

  // ============================================
  // 知识库 & 搜索面板 — 平滑动画
  // ============================================
  function toggleLibrary() {
    if (libraryPanel.style.display === 'none') {
      animateHidePanel(searchPanel);
      animateShowPanel(libraryPanel);
      renderLibraryItems('all');
    } else {
      animateHidePanel(libraryPanel);
    }
  }

  function toggleSearch() {
    if (searchPanel.style.display === 'none') {
      animateHidePanel(libraryPanel);
      animateShowPanel(searchPanel);
      setTimeout(() => $('global-search-input').focus(), 100);
    } else {
      animateHidePanel(searchPanel);
    }
  }

  function animateShowPanel(panel) {
    panel.style.display = 'block';
    panel.style.transform = 'translateX(100%)';
    panel.style.opacity = '0';
    requestAnimationFrame(() => {
      panel.style.transition = 'transform 0.35s cubic-bezier(0.16,1,0.3,1), opacity 0.35s cubic-bezier(0.16,1,0.3,1)';
      panel.style.transform = 'translateX(0)';
      panel.style.opacity = '1';
    });
  }

  function animateHidePanel(panel) {
    if (panel.style.display === 'none') return;
    panel.style.transition = 'transform 0.3s cubic-bezier(0.76,0,0.24,1), opacity 0.3s cubic-bezier(0.76,0,0.24,1)';
    panel.style.transform = 'translateX(100%)';
    panel.style.opacity = '0';
    setTimeout(() => {
      panel.style.display = 'none';
      panel.style.transform = '';
      panel.style.opacity = '';
      panel.style.transition = '';
    }, 300);
  }

  function renderLibraryItems(type) { renderLibraryItemsList(KnowledgeBase.getByType(type)); }

  function renderLibraryItemsList(items) {
    if (!items.length) {
      libraryItems.innerHTML = '<div class="empty-state"><div class="empty-icon">✦</div><div class="empty-text">还没有内容，扔点东西进来吧</div></div>';
      return;
    }
    const ic = {bookmark:'📌',readlater:'📖',note:'📝',inspiration:'💡',article:'✍️',study:'🎓'};
    libraryItems.innerHTML = items.map(i => `<div class="library-item${i.pinned?' pinned':''}" data-id="${i.id}">
      <div class="library-item-icon">${ic[i.type]||'📄'}</div>
      <div class="library-item-content"><div class="library-item-title">${i.pinned?'<span class="pin-indicator">📍</span>':''}${truncate(i.title,50)}</div>
      <div class="library-item-desc">${fmtDate(i.createdAt)} · ${i.type}</div></div>
      <button class="pin-btn${i.pinned?' active':''}" data-pin-id="${i.id}" title="${i.pinned?'取消置顶':'置顶'}">${i.pinned?'📍':'📌'}</button></div>`).join('');
    libraryItems.querySelectorAll('.library-item').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('.pin-btn')) return;
        const it = KnowledgeBase.getById(el.dataset.id);
        if (it) { animateHidePanel(libraryPanel); setTimeout(() => showResult(it), 150); }
      });
    });
    libraryItems.querySelectorAll('.pin-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        KnowledgeBase.togglePin(btn.dataset.pinId);
        const activeTab = document.querySelector('.library-tabs .tab.active');
        renderLibraryItems(activeTab ? activeTab.dataset.tab : 'all');
        renderRecentCards();
      });
    });
  }

  function renderSearchResults(items) {
    if (!items.length) {
      searchResults.innerHTML = '<div class="empty-state"><div class="empty-icon">🔍</div><div class="empty-text">没有找到匹配的内容</div></div>';
      return;
    }
    searchResults.innerHTML = items.map(i => `<div class="library-item" data-id="${i.id}">
      <div class="library-item-content"><div class="library-item-title">${i.title}</div>
      <div class="library-item-desc">${i.type} · ${fmtDate(i.createdAt)}</div></div></div>`).join('');
    searchResults.querySelectorAll('.library-item').forEach(el => {
      el.addEventListener('click', () => {
        const it = KnowledgeBase.getById(el.dataset.id);
        if (it) { animateHidePanel(searchPanel); setTimeout(() => showResult(it), 150); }
      });
    });
  }

  // ============================================
  // 文件上传 — 支持多格式 + 自动保存到收藏夹
  // ============================================
  const textExts = ['.txt','.md','.html','.htm','.csv','.json'];
  const docExts = ['.doc','.docx','.pdf'];

  function handleFileUpload(e) {
    const file = e.target.files[0]; if(!file) return;
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    const reader = new FileReader();

    if (textExts.includes(ext) || file.type.startsWith('text/')) {
      reader.onload = () => {
        const content = reader.result.substring(0, 5000);
        autoSaveFile(file.name, ext, content);
        userInput.value = content;
        autoResizeTextarea();
      };
      reader.readAsText(file);
    } else if (docExts.includes(ext)) {
      autoSaveFile(file.name, ext, `[二进制文件] ${(file.size/1024).toFixed(1)} KB`);
      userInput.value = `[文件: ${file.name}] (${(file.size/1024).toFixed(1)} KB)\n该文件已自动保存到收藏夹。`;
      autoResizeTextarea();
    } else {
      userInput.value = `[文件: ${file.name}] (${(file.size/1024).toFixed(1)} KB)`;
      autoResizeTextarea();
    }
    fileInput.value = '';
  }

  function autoSaveFile(fileName, ext, content) {
    const typeMap = {
      '.md': 'article', '.txt': 'note', '.html': 'article', '.htm': 'article',
      '.csv': 'note', '.json': 'note', '.doc': 'note', '.docx': 'note', '.pdf': 'note',
    };
    const saved = KnowledgeBase.add({
      type: typeMap[ext] || 'note',
      title: `📄 ${fileName}`,
      data: {
        originalText: content,
        markdownContent: ext === '.md' ? content : null,
        formattedHtml: ext === '.md' && typeof marked !== 'undefined' ? marked.parse(content) : null,
        description: `从文件上传自动保存: ${fileName}`,
        tags: ['文件上传', ext.replace('.','').toUpperCase()],
        fileName, fileExt: ext,
        savedAt: new Date().toISOString(),
      },
    });
    showToast(`📄 ${fileName} 已保存到收藏夹`);
    renderRecentCards();
    return saved;
  }

  // ============================================
  // 工具函数 — 升级版
  // ============================================
  function truncate(s, n) { return (!s) ? '' : (s.length > n ? s.substring(0, n) + '...' : s); }

  function fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso), diff = Date.now() - d;
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return Math.floor(diff / 60000) + ' 分钟前';
    if (diff < 86400000) return Math.floor(diff / 3600000) + ' 小时前';
    if (diff < 172800000) return '昨天';
    return d.toLocaleDateString('zh-CN');
  }

  // 升级版 Toast — 带动画
  let toastTimer = null;
  function showToast(msg) {
    // 移除旧 toast
    const old = document.querySelector('.toast');
    if (old) old.remove();
    clearTimeout(toastTimer);

    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);

    toastTimer = setTimeout(() => {
      t.classList.add('leaving');
      setTimeout(() => t.remove(), 300);
    }, 2200);
  }

  // ============================================
  // 文章编辑器：预览/编辑切换 + 工具栏
  // ============================================
  window.__toggleArticleMode = function(mode, btn) {
    const preview = document.getElementById('article-preview');
    const editor = document.getElementById('article-editor');
    const textarea = document.getElementById('editor-textarea');
    if (!preview || !editor) return;

    document.querySelectorAll('.view-toggle .toggle-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    if (mode === 'edit') {
      preview.style.display = 'none';
      editor.style.display = 'block';
      textarea.focus();
    } else {
      const md = textarea.value;
      preview.innerHTML = typeof marked !== 'undefined' ? marked.parse(md) : md;
      editor.style.display = 'none';
      preview.style.display = 'block';
      // 同步更新知识库
      const container = editor.closest('.article-container');
      if (container) {
        const itemId = container.dataset.itemId;
        const item = KnowledgeBase.getById(itemId);
        if (item) {
          item.data.markdownContent = md;
          item.data.formattedHtml = preview.innerHTML;
          const all = KnowledgeBase.getAll();
          const idx = all.findIndex(i => i.id === itemId);
          if (idx !== -1) { all[idx] = item; localStorage.setItem('dropmind_kb', JSON.stringify(all)); }
        }
      }
    }
  };

  // 工具栏命令
  document.addEventListener('click', function(e) {
    const btn = e.target.closest('.tb-btn');
    if (!btn) return;
    const cmd = btn.dataset.cmd;
    const textarea = document.getElementById('editor-textarea');
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const sel = textarea.value.substring(start, end);
    let insert = '';
    switch(cmd) {
      case 'heading': insert = `\n### ${sel || '标题'}`; break;
      case 'bold': insert = `**${sel || '粗体文字'}**`; break;
      case 'italic': insert = `*${sel || '斜体文字'}*`; break;
      case 'underline': insert = `<u>${sel || '下划线文字'}</u>`; break;
      case 'link': insert = `[${sel || '链接文字'}](https://)`; break;
      case 'image': insert = `![${sel || '图片描述'}](https://)`; break;
      case 'code': insert = sel.includes('\n') ? `\n\`\`\`\n${sel || '代码'}\n\`\`\`\n` : `\`${sel || '代码'}\``; break;
      case 'quote': insert = `\n> ${sel || '引用文字'}\n`; break;
      case 'ul': insert = `\n- ${sel || '列表项'}\n`; break;
      case 'ol': insert = `\n1. ${sel || '列表项'}\n`; break;
      case 'hr': insert = `\n---\n`; break;
      default: return;
    }
    textarea.value = textarea.value.substring(0, start) + insert + textarea.value.substring(end);
    textarea.focus();
    const newPos = start + insert.length;
    textarea.setSelectionRange(newPos, newPos);
  });

  // 启动
  init();
})();
