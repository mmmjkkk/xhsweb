const Store = {
  _db: null,
  async init() {
    this._db = await loadDB();
    return this;
  },
  save() { localStorage.setItem('game_shop_db', JSON.stringify(this._db)); },
  getUsers() { return structuredClone(this._db.users); },
  getUser(id) { return structuredClone(this._db.users.find(u => u.id === id)); },
  getUserByUsername(username) { return structuredClone(this._db.users.find(u => u.username === username)); },
  addUser(user) {
    user.id = this._db._seq.users++;
    user.password = hashPwd(user.password);
    user.role = user.role || 'user';
    this._db.users.push(user);
    this.save();
    return user;
  },
  getProducts() { return structuredClone(this._db.products); },
  getProduct(id) { return structuredClone(this._db.products.find(p => p.id === id)); },
  addProduct(p) {
    p.id = this._db._seq.products++;
    this._db.products.push(p);
    this.save();
    return p;
  },
  updateProduct(id, data) {
    const p = this._db.products.find(p => p.id === id);
    if (p) { Object.assign(p, data); this.save(); }
  },
  deleteProduct(id) {
    this._db.products = this._db.products.filter(p => p.id !== id);
    this.save();
  },
  queryProducts(q) {
    let list = this._db.products.filter(p => (!q.status || p.status === q.status) && (!q.category || p.category === q.category));
    return { records: list, pages: 1 };
  },
  getCategories() { return [...new Set(this._db.products.map(p => p.category))]; },
  getTags() { return this._db.tags; },
  getProductTags(pid) { return this._db.productTags.filter(pt => pt.pid === pid).map(pt => this._db.tags.find(t => t.id === pt.tid)); },
  setProductTags(pid, tags) {
    this._db.productTags = this._db.productTags.filter(pt => pt.pid !== pid);
    tags.forEach(tName => {
      let t = this._db.tags.find(x => x.name === tName) || { id: this._db._seq.tags++, name: tName };
      if (!this._db.tags.find(x => x.id === t.id)) this._db.tags.push(t);
      this._db.productTags.push({ pid, tid: t.id });
    });
    this.save();
  },
  exportData() {
    const blob = new Blob([JSON.stringify(this._db)], { type: "application/json" });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = "seed.json";
    a.click();
  }
};

async function loadDB() {
  try {
    const res = await fetch('seed.json?t=' + Date.now());
    if (res.ok) return await res.json();
  } catch (e) { console.warn("未找到 seed.json，读取本地..."); }
  const raw = localStorage.getItem('game_shop_db');
  return raw ? JSON.parse(raw) : { _seq: { users: 1, products: 1, tags: 1 }, users: [{ id: 0, username: 'admin', role: 'admin', password: hashPwd('123456') }], products: [], tags: [], productTags: [] };
}
function hashPwd(p) { return 'hashed_' + p; }

// ===== 辅助函数 =====
function now() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

function toast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateX(40px)';
    el.style.transition = 'all .3s';
    setTimeout(() => el.remove(), 300);
  }, 2500);
}

// Simple router
const router = {
  current: '',
  handlers: {},
  register(path, handler) { this.handlers[path] = handler; },
  navigate(hash) {
    const path = hash.replace('#', '') || '/';
    window.location.hash = hash;
  },
  render() {
    const path = this.current;
    const main = document.getElementById('mainContent');
    if (!main) return;
    for (const [pattern, handler] of Object.entries(this.handlers)) {
      const match = matchRoute(pattern, path);
      if (match) {
        handler(main, match);
        updateNav(path);
        return;
      }
    }
    main.innerHTML = '<div class="empty"><div class="empty-icon">😕</div><div class="empty-text">页面未找到</div></div>';
  },
  init() {
    const hash = window.location.hash || '#/';
    this.current = hash.replace('#', '') || '/';
    this.render();
    const self = this;
    window.addEventListener('hashchange', function() {
      const path = (window.location.hash || '#/').replace('#', '') || '/';
      self.current = path;
      self.render();
    });
  }
};

function matchRoute(pattern, path) {
  const pParts = pattern.split('/');
  const pathParts = path.split('/');
  if (pParts.length !== pathParts.length) return null;
  const params = {};
  for (let i = 0; i < pParts.length; i++) {
    if (pParts[i].startsWith(':')) {
      params[pParts[i].slice(1)] = pathParts[i];
    } else if (pParts[i] !== pathParts[i]) {
      return null;
    }
  }
  return params;
}

function updateNav(path) {
  document.querySelectorAll('.nav-link').forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#/' + path));
}

// Auth
const Auth = {
  TOKEN_KEY: 'game_shop_token',
  USER_KEY: 'game_shop_user',
  login(username, password) {
    const user = Store.getUserByUsername(username);
    if (!user || hashPwd(password) !== user.password) return null;
    if (user.status === 0) return null;
    const token = btoa(JSON.stringify({ userId: user.id, username: user.username, role: user.role, exp: Date.now() + 86400000 }));
    const { password: _, ...safeUser } = user;
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(safeUser));
    return { token, user: safeUser };
  },
  logout() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  },
  getUser() {
    try { const raw = localStorage.getItem(this.USER_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
  },
  getToken() { return localStorage.getItem(this.TOKEN_KEY); },
  isLoggedIn() { return !!this.getUser(); },
  isAdmin() { const u = this.getUser(); return u && u.role === 'admin'; },
  register(username, password, email) {
    if (Store.getUserByUsername(username)) return null;
    return Store.addUser({ username, password, email: email || '' });
  }
};

// Tag colors
const TAG_COLORS = [
  '#ef4444','#f97316','#f59e0b','#ec4899','#8b5cf6',
  '#06b6d4','#10b981','#3b82f6','#6366f1','#14b8a6',
  '#d946ef','#fb923c','#22c55e','#0ea5e9','#a855f7',
];
function tagColor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h) + name.charCodeAt(i);
  return TAG_COLORS[Math.abs(h) % TAG_COLORS.length];
}
function formatPrice(p) { return Number(p).toFixed(2); }
function renderTags(tags, cls = 'tag') {
  return tags.map(t => `<span class="${cls}" style="background:${tagColor(t.name || t)}">${t.name || t}</span>`).join('');
}
function escHtml(s) { return s ? String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m]) : ''; }
