/* ============================================
   DropMind念投 — Knowledge Base (localStorage)
   MVP 版本使用 localStorage，生产版迁移到 SQLite
   ============================================ */

const KnowledgeBase = (() => {

  const STORAGE_KEY = 'dropmind_kb';

  function getAll() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  function save(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  function add(item) {
    const items = getAll();
    const entry = {
      id: generateId(),
      type: item.type,
      title: item.title,
      data: item.data,
      pinned: false,
      createdAt: new Date().toISOString(),
    };
    items.unshift(entry);
    save(items);
    return entry;
  }

  function remove(id) {
    const items = getAll().filter(i => i.id !== id);
    save(items);
  }

  function togglePin(id) {
    const items = getAll();
    const item = items.find(i => i.id === id);
    if (item) {
      item.pinned = !item.pinned;
      save(items);
    }
    return item;
  }

  function update(id, changes) {
    const items = getAll();
    const idx = items.findIndex(i => i.id === id);
    if (idx !== -1) {
      Object.assign(items[idx], changes);
      save(items);
      return items[idx];
    }
    return null;
  }

  // 排序：置顶优先，然后按时间倒序
  function sorted(items) {
    return items.slice().sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }

  function getByType(type) {
    const items = (!type || type === 'all') ? getAll() : getAll().filter(i => i.type === type);
    return sorted(items);
  }

  function search(query) {
    if (!query) return getAll();
    const q = query.toLowerCase();
    return getAll().filter(item => {
      const titleMatch = item.title && item.title.toLowerCase().includes(q);
      const tagMatch = item.data && item.data.tags && item.data.tags.some(t => t.toLowerCase().includes(q));
      const contentMatch = item.data && JSON.stringify(item.data).toLowerCase().includes(q);
      return titleMatch || tagMatch || contentMatch;
    });
  }

  function getById(id) {
    return getAll().find(i => i.id === id);
  }

  function getRecent(limit) {
    return sorted(getAll()).slice(0, limit || 6);
  }

  function getStats() {
    const items = getAll();
    const stats = { total: items.length };
    const types = ['bookmark', 'readlater', 'note', 'inspiration', 'article', 'study'];
    types.forEach(t => { stats[t] = items.filter(i => i.type === t).length; });
    return stats;
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
  }

  function clear() {
    localStorage.removeItem(STORAGE_KEY);
  }

  return { add, remove, togglePin, update, getAll, getByType, search, getById, getRecent, getStats, clear };

})();
