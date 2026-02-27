/* ============================================
   DropMind念投 — Todo Manager (3-state)
   States: todo → doing → done
   ============================================ */

const TodoManager = (() => {
  let _prefix = 'dropmind_';

  function setPrefix(p) { _prefix = p; }
  function storageKey() { return _prefix + 'todos'; }

  function getAll() {
    try {
      const raw = localStorage.getItem(storageKey());
      const items = raw ? JSON.parse(raw) : [];
      // migrate old boolean done → status string
      return items.map(i => {
        if (!i.status) i.status = i.done ? 'done' : 'todo';
        return i;
      });
    } catch { return []; }
  }

  function save(items) {
    localStorage.setItem(storageKey(), JSON.stringify(items));
  }

  function add(text) {
    const items = getAll();
    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 6),
      text: text.trim(),
      status: 'todo',
      createdAt: new Date().toISOString(),
    };
    items.unshift(entry);
    save(items);
    return entry;
  }

  // Cycle: todo → doing → done → todo
  function cycle(id) {
    const items = getAll();
    const item = items.find(i => i.id === id);
    if (!item) return null;
    const next = { todo: 'doing', doing: 'done', done: 'todo' };
    item.status = next[item.status] || 'todo';
    save(items);
    return item;
  }

  function remove(id) { save(getAll().filter(i => i.id !== id)); }
  function clearDone() { save(getAll().filter(i => i.status !== 'done')); }

  function getFiltered(filter) {
    const all = getAll();
    if (filter === 'todo') return all.filter(i => i.status === 'todo');
    if (filter === 'doing') return all.filter(i => i.status === 'doing');
    if (filter === 'done') return all.filter(i => i.status === 'done');
    return all;
  }

  function getStats() {
    const all = getAll();
    return {
      total: all.length,
      todo: all.filter(i => i.status === 'todo').length,
      doing: all.filter(i => i.status === 'doing').length,
      done: all.filter(i => i.status === 'done').length,
    };
  }

  return { setPrefix, getAll, add, cycle, remove, clearDone, getFiltered, getStats };
})();

// ============================================
// Simple Sound Effects
// ============================================
const TodoSound = (() => {
  let ctx = null;
  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  }
  function play(freq, dur, type) {
    try {
      const c = getCtx();
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, c.currentTime);
      g.gain.setValueAtTime(0.1, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
      o.connect(g).connect(c.destination);
      o.start(c.currentTime);
      o.stop(c.currentTime + dur);
    } catch (e) {}
  }
  return {
    playAdd()      { play(523, 0.12); },
    playDoing()    { play(660, 0.15); },
    playComplete() { play(880, 0.12); setTimeout(() => play(1175, 0.15), 80); },
    playDelete()   { play(330, 0.15, 'triangle'); },
  };
})();

// ============================================
// Todo UI Controller (3-state)
// ============================================
const TodoUI = (() => {
  'use strict';

  let todoInput, btnAdd, todoList, todoCount, todoFooter, btnClearDone;
  let currentFilter = 'todo';
  let initialized = false;

  const STATUS = {
    todo:  { icon: '○', label: '待办', cls: '' },
    doing: { icon: '◐', label: '进行中', cls: 'doing' },
    done:  { icon: '✓', label: '已完成', cls: 'done' },
  };

  function init() {
    if (initialized) { render(); return; }
    todoInput = document.getElementById('todo-input');
    btnAdd = document.getElementById('btn-add-todo');
    todoList = document.getElementById('todo-list');
    todoCount = document.getElementById('todo-count');
    todoFooter = document.getElementById('todo-footer');
    btnClearDone = document.getElementById('btn-clear-done');

    btnAdd.addEventListener('click', addTodo);
    todoInput.addEventListener('keydown', e => { if (e.key === 'Enter') addTodo(); });
    btnClearDone.addEventListener('click', () => { TodoManager.clearDone(); render(); });
    document.querySelectorAll('.todo-filter').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.todo-filter').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        render();
      });
    });
    initialized = true;
    render();
  }

  function addTodo() {
    const text = todoInput.value.trim();
    if (!text) return;
    TodoManager.add(text);
    TodoSound.playAdd();
    todoInput.value = '';
    render();
  }

  function render() {
    if (!todoList) return;
    const items = TodoManager.getFiltered(currentFilter);
    const stats = TodoManager.getStats();
    todoCount.textContent = stats.todo + stats.doing;
    todoFooter.style.display = stats.done > 0 ? 'block' : 'none';

    if (!items.length) {
      const emptyMap = {
        todo:  { icon: '📝', msg: '没有待办事项' },
        doing: { icon: '🚀', msg: '没有进行中的任务' },
        done:  { icon: '🎉', msg: '还没有完成的任务' },
      };
      const e = emptyMap[currentFilter] || emptyMap.todo;
      todoList.innerHTML = `<div class="todo-empty"><div class="todo-empty-icon">${e.icon}</div><div>${e.msg}</div></div>`;
      return;
    }

    todoList.innerHTML = items.map((item, idx) => {
      const s = STATUS[item.status] || STATUS.todo;
      return `
      <div class="todo-item ${s.cls}" data-id="${item.id}">
        <div class="todo-status-btn" title="点击切换状态">${s.icon}</div>
        <div class="todo-text">${escHtml(item.text)}</div>
        <button class="todo-delete" title="删除">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        </button>
      </div>`;
    }).join('');

    todoList.querySelectorAll('.todo-item').forEach(el => {
      const id = el.dataset.id;
      el.querySelector('.todo-status-btn').addEventListener('click', e => {
        e.stopPropagation();
        const item = TodoManager.cycle(id);
        if (item) {
          if (item.status === 'doing') TodoSound.playDoing();
          else if (item.status === 'done') TodoSound.playComplete();
          else TodoSound.playAdd();
        }
        render();
      });
      el.querySelector('.todo-delete').addEventListener('click', e => {
        e.stopPropagation();
        el.style.opacity = '0';
        el.style.transform = 'translateX(-20px)';
        TodoSound.playDelete();
        setTimeout(() => { TodoManager.remove(id); render(); }, 200);
      });
    });
  }

  function escHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

  return { init, render };
})();
