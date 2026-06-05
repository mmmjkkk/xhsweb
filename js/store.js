/**
 * Store - localStorage 数据层
 * 提供 CRUD 操作，模拟后端 API 的行为
 */
const Store = {
  _db: null,

  init() {
    this._db = loadDB();
    return this;
  },

  save() {
    saveDB(this._db);
  },

  // ===== Users =====
  getUsers() { 
    return structuredClone(this._db.users); 
  },
  getUser(id) { 
    const u = this._db.users.find(u => u.id === id); 
    return u ? structuredClone(u) : null;
  },
  getUserByUsername(username) {
    const u = this._db.users.find(u => u.username === username);
    return u ? structuredClone(u) : null;
  },
  addUser(user) {
    user.id = nextId(this._db._seq, 'users');
    user.password = hashPwd(user.password);
    user.role = user.role || 'user';
    user.status = 1;
    user.createTime = now();
    user.updateTime = now();
    this._db.users.push(user);
    this.save();
    return structuredClone(user);
  },
  updateUser(id, data) {
    const idx = this._db.users.findIndex(u => u.id === id);
    if (idx === -1) return null;
    Object.assign(this._db.users[idx], data, { updateTime: now() });
    this.save();
    return structuredClone(this._db.users[idx]);
  },

  // ===== Products =====
  getProducts() { 
    return structuredClone(this._db.products); 
  },
  getProduct(id) { 
    const p = this._db.products.find(p => p.id === id); 
    return p ? structuredClone(p) : null;
  },
  addProduct(prod) {
    prod.id = nextId(this._db._seq, 'products');
    prod.createTime = now();
    prod.updateTime = now();
    this._db.products.push(prod);
    this.save();
    return structuredClone(prod);
  },
  updateProduct(id, data) {
    const idx = this._db.products.findIndex(p => p.id === id);
    if (idx === -1) return null;
    Object.assign(this._db.products[idx], data, { updateTime: now() });
    this.save();
    return structuredClone(this._db.products[idx]);
  },
  deleteProduct(id) {
    const idx = this._db.products.findIndex(p => p.id === id);
    if (idx === -1) return false;
    this._db.products.splice(idx, 1);
    this._db.favorites = this._db.favorites.filter(f => f.productId !== id);
    this._db.cartItems = this._db.cartItems.filter(c => c.productId !== id);
    this.save();
    return true;
  },

  // ===== Tags =====
  getTags() { 
    return structuredClone(this._db.tags); 
  },
  getOrCreateTag(name) {
    const trimmed = name.trim();
    if (!trimmed) return null;
    let tag = this._db.tags.find(t => t.name === trimmed);
    if (!tag) {
      tag = { id: nextId(this._db._seq, 'tags'), name: trimmed };
      this._db.tags.push(tag);
      this.save();
    }
    return structuredClone(tag);
  },
  deleteTag(id) {
    const idx = this._db.tags.findIndex(t => t.id === id);
    if (idx === -1) return false;
    this._db.tags.splice(idx, 1);
    this._db.productTags = this._db.productTags.filter(pt => pt.tagId !== id);
    this.save();
    return true;
  },
  getProductTags(productId) {
    const ptIds = this._db.productTags.filter(pt => pt.productId === productId).map(pt => pt.tagId);
    return structuredClone(this._db.tags.filter(t => ptIds.includes(t.id)));
  },
  setProductTags(productId, tagNames) {
    this._db.productTags = this._db.productTags.filter(pt => pt.productId !== productId);
    for (const name of tagNames) {
      const tag = this.getOrCreateTag(name);
      if (tag) {
        this._db.productTags.push({ productId, tagId: tag.id });
      }
    }
    this.save();
  },

  // ===== Favorites =====
  getFavorites(userId) {
    return structuredClone(this._db.favorites.filter(f => f.userId === userId));
  },
  toggleFavorite(userId, productId) {
    const idx = this._db.favorites.findIndex(f => f.userId === userId && f.productId === productId);
    if (idx !== -1) {
      this._db.favorites.splice(idx, 1);
      this.save();
      return false;
    } else {
      this._db.favorites.push({ userId, productId });
      this.save();
      return true;
    }
  },
  isFavorited(userId, productId) {
    return this._db.favorites.some(f => f.userId === userId && f.productId === productId);
  },

  // ===== Cart =====
  getCartItems(userId) {
    return structuredClone(this._db.cartItems.filter(c => c.userId === userId));
  },
  addToCart(userId, productId, quantity = 1) {
    const existing = this._db.cartItems.find(c => c.userId === userId && c.productId === productId);
    if (existing) {
      existing.quantity = quantity;
    } else {
      this._db.cartItems.push({ userId, productId, quantity });
    }
    this.save();
  },
  updateCartItem(userId, productId, quantity) {
    const item = this._db.cartItems.find(c => c.userId === userId && c.productId === productId);
    if (item) {
      item.quantity = quantity;
      this.save();
    }
  },
  removeFromCart(userId, productId) {
    const idx = this._db.cartItems.findIndex(c => c.userId === userId && c.productId === productId);
    if (idx !== -1) {
      this._db.cartItems.splice(idx, 1);
      this.save();
    }
  },
  getCartCount(userId) {
    return this._db.cartItems.filter(c => c.userId === userId).reduce((s, c) => s + c.quantity, 0);
  },

  // ===== Queries =====
  queryProducts({ keyword, category, page = 1, size = 12, status } = {}) {
    let list = this._db.products.filter(p => {
      if (status !== undefined && p.status !== status) return false;
      if (keyword) {
        const kw = keyword.toLowerCase();
        if (!p.name.toLowerCase().includes(kw) && !(p.description || '').toLowerCase().includes(kw)) return false;
      }
      if (category && p.category !== category) return false;
      return true;
    });
    const total = list.length;
    const pages = Math.ceil(total / size);
    const start = (page - 1) * size;
    list = list.slice(start, start + size);
    return { records: structuredClone(list), total, size, current: page, pages };
  },

  getCategories() {
    return [...new Set(this._db.products.filter(p => p.status === 1 && p.category).map(p => p.category))];
  },
};

// ===== 辅助函数 =====

// 优化：采用更强容错的 FNV-1a 变种降低冲突率，合并长度特征
function hashPwd(pwd) {
  let h = 0x811c9dc5;
  for (let i = 0; i < pwd.length; i++) {
    h ^= pwd.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return 'hashed_' + (h >>> 0).toString(16) + pwd.length;
}

function verifyPwd(input, stored) {
  return hashPwd(input) === stored;
}

function now() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

function nextId(seq, key) {
  if (!seq[key]) seq[key] = 0;
  seq[key]++;
  return seq[key];
}

const DB_VERSION = 3;

function loadDB() {
  try {
    const raw = localStorage.getItem('game_shop_db');
    if (raw) {
      const db = JSON.parse(raw);
      if (db._version === DB_VERSION) return db;
    }
  } catch (e) { /* ignore */ }
  return createDefaultDB();
}

// 优化：引入防抖和异常捕获，避免频繁操作导致的主线程阻塞和配额溢出崩溃
let saveTimer = null;
function saveDB(db) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem('game_shop_db', JSON.stringify(db));
    } catch (e) {
      console.error('存储失败，可能是 localStorage 容量已满', e);
      toast('本地存储空间不足', 'error');
    }
  }, 50);
}

function createDefaultDB() {
  const db = { _seq: {}, _version: DB_VERSION, users: [], products: [], tags: [], productTags: [], favorites: [], cartItems: [] };

  const adminPwd = hashPwd('123456');
  db.users.push(
    { id: 1, username: 'admin', password: adminPwd, email: 'admin@shop.com', avatar: '', role: 'admin', status: 1, createTime: now(), updateTime: now() },
    { id: 2, username: 'test', password: adminPwd, email: 'test@shop.com', avatar: '', role: 'user', status: 1, createTime: now(), updateTime: now() },
    { id: 3, username: 'buyer1', password: adminPwd, email: 'buyer1@shop.com', avatar: '', role: 'user', status: 1, createTime: now(), updateTime: now() },
  );
  db._seq.users = 3;

  const products = [
    { name: '王者荣耀-全皮肤账号', description: '满级满皮肤账号，传说皮肤全收集，排位王者段位', price: 999, category: '游戏账号', stock: 1, status: 1, mainImage: '', images: [], tags: ['王者荣耀', '全皮肤'] },
    { name: '原神-满命满精账号', description: '全角色满命满精，所有五星武器精5', price: 3500, category: '游戏账号', stock: 1, status: 1, mainImage: '', images: [], tags: ['原神', '满命'] },
    { name: 'LOL-全英雄全皮肤', description: '英雄联盟全英雄全皮肤账号', price: 1500, category: '游戏账号', stock: 1, status: 1, mainImage: '', images: [], tags: ['LOL', '全皮肤'] },
    { name: '崩坏星穹铁道-欧皇号', description: '全限定角色全光锥，遗器完美', price: 2800, category: '游戏账号', stock: 1, status: 1, mainImage: '', images: [], tags: ['崩坏星穹铁道', '全角色'] },
    { name: '和平精英-战神号', description: '无敌战神段位，全载具皮肤', price: 1200, category: '游戏账号', stock: 1, status: 1, mainImage: '', images: [], tags: ['和平精英', '战神'] },
    { name: 'CF穿越火线-VIP号', description: 'VIP8等级，全英雄武器', price: 800, category: '游戏账号', stock: 1, status: 1, mainImage: '', images: [], tags: ['CF', 'VIP'] },
    { name: '阴阳师-全图鉴号', description: '全SSR/SP式神，一速270+', price: 2200, category: '游戏账号', stock: 1, status: 1, mainImage: '', images: [], tags: ['阴阳师', '全图鉴'] },
    { name: '梦幻西游-69成品号', description: '69级成品号，全红宝宝', price: 5000, category: '游戏账号', stock: 1, status: 1, mainImage: '', images: [], tags: ['梦幻西游', '69级'] },
    { name: 'DNF-史诗毕业号', description: '全职业史诗套装毕业，红字增幅+12', price: 1800, category: '游戏账号', stock: 1, status: 1, mainImage: '', images: [], tags: ['DNF', '毕业号'] },
    { name: '第五人格-六阶号', description: '六阶段位账号，全角色全皮肤', price: 600, category: '游戏账号', stock: 1, status: 1, mainImage: '', images: [], tags: ['第五人格', '六阶'] },
    { name: '明日方舟-全六星号', description: '全六星干员满潜，合约18轻松过', price: 1600, category: '游戏账号', stock: 1, status: 1, mainImage: '', images: [], tags: ['明日方舟', '全六星'] },
    { name: '碧蓝航线-全船号', description: '全舰船收集，科研船满级', price: 900, category: '游戏账号', stock: 1, status: 1, mainImage: '', images: [], tags: ['碧蓝航线', '全收集'] },
  ];

  let pid = 4;
  for (const p of products) {
    p.id = pid++;
    p.createTime = now();
    p.updateTime = now();
    db.products.push(p);
  }
  db._seq.products = pid - 1;

  // Pre-create tags from products
  const allTags = [...new Set(products.flatMap(p => p.tags))];
  let tid = 1;
  for (const name of allTags) {
    db.tags.push({ id: tid++, name });
    db._seq.tags = tid - 1;
  }

  // Link product tags
  for (const p of products) {
    for (const tName of p.tags) {
      const tag = db.tags.find(t => t.name === tName);
      if (tag) db.productTags.push({ productId: p.id, tagId: tag.id });
    }
  }

  saveDB(db);
  return db;
}

// Toast helper
function toast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return; // 容错处理
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
    if (!user || !verifyPwd(password, user.password)) return null;
    if (user.status !== 1) return null;
    
    // 生成包含过期时间的 Token（24小时）
    const token = btoa(JSON.stringify({ userId: user.id, username: user.username, role: user.role, exp: Date.now() + 86400000 }));
    
    // 优化：剔除密码字段，防止敏感信息缓存在 localStorage
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
    try {
      const raw = localStorage.getItem(this.USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },

  getToken() {
    return localStorage.getItem(this.TOKEN_KEY);
  },

  // 优化：增加真正的 Token 解析与过期校验
  isLoggedIn() {
    const token = this.getToken();
    const user = this.getUser();
    if (!token || !user) return false;

    try {
      const payload = JSON.parse(atob(token));
      if (Date.now() > payload.exp) {
        this.logout(); // Token 过期自动清理
        return false;
      }
      return true;
    } catch (e) {
      this.logout();
      return false;
    }
  },

  isAdmin() {
    const u = this.getUser();
    return u && u.role === 'admin';
  },

  register(username, password, email) {
    if (Store.getUserByUsername(username)) return null;
    return Store.addUser({ username, password, email: email || '' });
  }
};

// Tag colors (same as backend)
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

// Render helpers
function renderTags(tags, cls = 'tag') {
  return tags.map(t => `<span class="${cls}" style="background:${tagColor(t.name || t)}">${t.name || t}</span>`).join('');
}