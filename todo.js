/* ============================================
   DropMind念投 — Todo Manager
   ============================================ */

const TodoManager = (() => {
  const STORAGE_KEY = 'dropmind_todos';

  function getAll() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  function save(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  function add(text) {
    const items = getAll();
    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 6),
      text: text.trim(),
      done: false,
      createdAt: new Date().toISOString(),
    };
    items.unshift(entry);
    save(items);
    return entry;
  }

  function toggle(id) {
    const items = getAll();
    const item = items.find(i => i.id === id);
    if (item) { item.done = !item.done; save(items); }
    return item;
  }

  function remove(id) {
    save(getAll().filter(i => i.id !== id));
  }

  function clearDone() {
    save(getAll().filter(i => !i.done));
  }

  function getFiltered(filter) {
    const all = getAll();
    if (filter === 'active') return all.filter(i => !i.done);
    if (filter === 'done') return all.filter(i => i.done);
    return all;
  }

  function getStats() {
    const all = getAll();
    return { total: all.length, active: all.filter(i => !i.done).length, done: all.filter(i => i.done).length };
  }

  return { getAll, add, toggle, remove, clearDone, getFiltered, getStats };
})();

// ============================================
// Todo UI Controller
// ============================================
(function() {
  'use strict';

  const todoInput = document.getElementById('todo-input');
  const btnAdd = document.getElementById('btn-add-todo');
  const todoList = document.getElementById('todo-list');
  const todoCount = document.getElementById('todo-count');
  const todoFooter = document.getElementById('todo-footer');
  const btnClearDone = document.getElementById('btn-clear-done');
  let currentFilter = 'all';

  function init() {
    btnAdd.addEventListener('click', addTodo);
    todoInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') addTodo();
    });
    btnClearDone.addEventListener('click', () => {
      TodoManager.clearDone();
      render();
    });
    document.querySelectorAll('.todo-filter').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.todo-filter').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        render();
      });
    });
    render();
  }

  function addTodo() {
    const text = todoInput.value.trim();
    if (!text) return;
    TodoManager.add(text);
    todoInput.value = '';
    render();
  }

  function render() {
    const items = TodoManager.getFiltered(currentFilter);
    const stats = TodoManager.getStats();
    todoCount.textContent = stats.active;
    todoFooter.style.display = stats.done > 0 ? 'block' : 'none';

    if (!items.length) {
      const msg = currentFilter === 'done' ? '没有已完成的待办' : currentFilter === 'active' ? '全部完成了!' : '还没有待办事项';
      todoList.innerHTML = `<div class="todo-empty">${msg}</div>`;
      return;
    }

    todoList.innerHTML = items.map(item => `
      <div class="todo-item${item.done ? ' done' : ''}" data-id="${item.id}">
        <div class="todo-checkbox">${item.done ? '✓' : ''}</div>
        <div class="todo-text">${escHtml(item.text)}</div>
        <button class="todo-delete" title="删除">✕</button>
      </div>
    `).join('');

    todoList.querySelectorAll('.todo-item').forEach(el => {
      const id = el.dataset.id;
      el.querySelector('.todo-checkbox').addEventListener('click', (e) => {
        e.stopPropagation();
        TodoManager.toggle(id);
        render();
      });
      el.querySelector('.todo-delete').addEventListener('click', (e) => {
        e.stopPropagation();
        TodoManager.remove(id);
        render();
      });
    });
  }

  function escHtml(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  init();
})();
