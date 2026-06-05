/**
 * app.js - 应用主逻辑：页面渲染、交互优化版
 */

// ====== 全局配置 ======
const APP_CONFIG = {
  wechatId: 'Qq-shd',
  wechatRemark: '网页来的',
  pageSizes: { home: 12, admin: 10 },
  maxImageWidth: 800 // 图片压缩最大宽度
};

// ====== Routes ======
router.register('/', renderHome);
router.register('/product/:id', renderProductDetail);
router.register('/login', renderLogin);
router.register('/register', renderRegister);
router.register('/admin/dashboard', renderAdminDashboard);
router.register('/admin/users', renderAdminUsers);
router.register('/admin/products', renderAdminProducts);
router.register('/admin', renderAdmin);

// 商品图标映射
function getIcon(name) {
  const map = {
    '王者': '⚔️', '原神': '🌟', 'LOL': '🏆', '联盟': '🏆',
    '崩坏': '🚂', '和平': '🔫', 'CF': '🎯', '阴阳': '👹',
    '梦幻': '🐉', 'DNF': '⚡', '第五': '🕵️', '明日': '🛡️', '碧蓝': '🚢'
  };
  for (const [k, v] of Object.entries(map)) {
    if (name.includes(k)) return v;
  }
  return '🎮';
}

// ====== 首页状态与渲染 ======
const HomeState = { page: 1, cat: '', kw: '' };

function renderHome(main) {
  const data = Store.queryProducts({ 
    keyword: HomeState.kw, 
    category: HomeState.cat, 
    page: HomeState.page, 
    size: APP_CONFIG.pageSizes.home, 
    status: 1 
  });
  const cats = Store.getCategories();
  const isAdmin = Auth.getUser() && Auth.getUser().role === 'admin';

  let html = `
    <div class="shop-hero">
      <div>
        <h1>精品红薯号小卖部</h1>
        <p>买号请添加微信 ${APP_CONFIG.wechatId}（备注宫廷玉液酒）</p>
      </div>
      ${isAdmin ? '<a href="#/admin/dashboard" class="hero-admin-link">进入管理后台</a>' : ''}
    </div>

    <div style="margin-bottom:12px">
      <div class="toolbar" style="background:var(--card);padding:14px;border-radius:14px;box-shadow:var(--shadow-sm);margin-bottom:20px">
        <div class="search-box" style="margin-bottom:0">
          <input type="text" id="homeSearchInput" placeholder="🔍 按标签或名称搜索账号..." value="${escHtml(HomeState.kw)}">
        </div>
      </div>
      <div class="cat-pills" id="homeCatPills">
        <span class="cat-pill ${!HomeState.cat ? 'active' : ''}" data-cat="">全部分类</span>
        ${cats.map(c => `<span class="cat-pill ${HomeState.cat === c ? 'active' : ''}" data-cat="${escHtml(c)}">${escHtml(c)}</span>`).join('')}
      </div>
    </div>
  `;

  if (data.records.length === 0) {
    html += '<div class="empty"><div class="empty-icon">📦</div><div class="empty-text">暂无商品</div></div>';
  } else {
    html += '<div class="products-grid">';
    html += data.records.map(p => homeCardHTML(p)).join('');
    html += '</div>';
  }

  if (data.pages > 1) {
    html += paginationHTML(HomeState.page, data.pages, 'homePagination');
  }

  main.innerHTML = html;

  // --- 事件绑定 ---
  document.getElementById('homeSearchInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      HomeState.kw = e.target.value;
      HomeState.page = 1; 
      renderHome(main);
    }
  });

  document.getElementById('homeCatPills').addEventListener('click', e => {
    if (e.target.classList.contains('cat-pill')) {
      HomeState.cat = e.target.dataset.cat;
      HomeState.page = 1;
      renderHome(main);
    }
  });

  bindPaginationEvents('homePagination', page => {
    HomeState.page = page;
    renderHome(main);
  });
}

function homeCardHTML(p) {
  const tags = Store.getProductTags(p.id);
  return `
    <div class="product-card" onclick="router.navigate('#/product/${p.id}')">
      <div class="product-img">
        ${p.mainImage ? `<img src="${p.mainImage}" alt="${escHtml(p.name)}">` : `<span>${getIcon(p.name)}</span>`}
      </div>
      <div class="product-body">
        <div class="product-name">${escHtml(p.name)}</div>
        ${tags.length ? `<div class="product-tags">${renderTags(tags, 'tag tag-sm')}</div>` : ''}
        <div class="product-desc">${escHtml(p.description || '')}</div>
        <div class="product-price">${formatPrice(p.price)}</div>
      </div>
      <div class="product-actions">
        <button onclick="event.stopPropagation(); router.navigate('#/product/${p.id}')">查看详情</button>
      </div>
    </div>
  `;
}

// ====== 商品详情 ======
function renderProductDetail(main, params) {
  const product = Store.getProduct(parseInt(params.id));
  if (!product) {
    main.innerHTML = '<div class="empty"><div class="empty-icon">😕</div><div class="empty-text">商品不存在</div></div>';
    return;
  }
  const user = Auth.getUser();
  const tags = Store.getProductTags(product.id);

  main.innerHTML = `
    <div class="detail-page">
      <div class="detail-header" style="margin-bottom:24px">
        <a href="#/" class="back-link">← 返回商城</a>
      </div>
      <div class="detail-card">
        <div class="detail-img-area">
          <div class="detail-main-img">
            ${product.mainImage ? `<img src="${product.mainImage}" alt="${escHtml(product.name)}">` : getIcon(product.name)}
          </div>
        </div>
        <div class="detail-info">
          <span class="detail-category">${escHtml(product.category || '')}</span>
          <h1 class="detail-name">${escHtml(product.name)}</h1>
          ${tags.length ? `<div class="product-tags" style="margin:0">${renderTags(tags)}</div>` : ''}
          <div class="detail-price-area">
            <div class="detail-price">${formatPrice(product.price)}</div>
          </div>
          <div class="detail-desc">${escHtml(product.description || '暂无描述')}</div>
          <div class="detail-actions">
            ${user ? `
              <button class="btn btn-primary btn-block" id="buyBtn">购买账号请添加微信 ${APP_CONFIG.wechatId}</button>
            ` : `
              <a href="#/login" class="btn btn-primary btn-block" style="text-decoration:none">请添加微信购买😘</a>
            `}
          </div>
        </div>
      </div>
      ${product.images && product.images.length > 0 ? `
      <div class="detail-gallery">
        <h3>商品详情图</h3>
        <div class="gallery-list">
          ${product.images.map(img => `<div class="gallery-item"><img src="${img}" alt=""></div>`).join('')}
        </div>
      </div>` : ''}
    </div>
  `;

  const buyBtn = document.getElementById('buyBtn');
  if (buyBtn) {
    buyBtn.onclick = () => prompt(`请添加微信购买账号:\n\n微信号: ${APP_CONFIG.wechatId}\n\n请备注「${APP_CONFIG.wechatRemark}」，不然不通过。\n\n复制下方微信号后点击确定`, APP_CONFIG.wechatId);
  }
}

// ====== 登录 & 注册 ======
function renderLogin(main) {
  if (Auth.isLoggedIn()) { router.navigate('#/'); return; }
  main.innerHTML = `
    <div class="auth-page">
      <div class="auth-card" style="text-align:center">
        <h2 class="auth-title">登录</h2>
        <form id="loginForm">
          <div class="form-group" style="text-align:left">
            <label class="form-label">用户名</label>
            <input class="form-input" id="loginUser" placeholder="请输入用户名" required>
          </div>
          <div class="form-group" style="text-align:left">
            <label class="form-label">密码</label>
            <input class="form-input" type="password" id="loginPwd" placeholder="请输入密码" required>
          </div>
          <div class="form-error" id="loginError" style="display:none"></div>
          <button type="submit" class="btn btn-primary btn-block" style="margin-top:8px">登录</button>
        </form>
        <div class="auth-link">还没有账号？<a href="#/register">立即注册</a></div>
      </div>
    </div>
  `;
  document.getElementById('loginForm').onsubmit = (e) => {
    e.preventDefault();
    doLogin();
  };
}

function doLogin() {
  const errEl = document.getElementById('loginError');
  const result = Auth.login(document.getElementById('loginUser').value, document.getElementById('loginPwd').value);
  if (!result) {
    errEl.textContent = '用户名或密码错误'; errEl.style.display = 'block';
    return;
  }
  toast('登录成功');
  updateUI();
  router.navigate('#/');
}

function renderRegister(main) {
  if (Auth.isLoggedIn()) { router.navigate('#/'); return; }
  main.innerHTML = `
    <div class="auth-page">
      <div class="auth-card" style="text-align:center">
        <h2 class="auth-title">注册</h2>
        <form id="regForm">
          <div class="form-group" style="text-align:left">
            <label class="form-label">用户名</label>
            <input class="form-input" id="regUser" placeholder="请输入用户名（3-20位）" required>
          </div>
          <div class="form-group" style="text-align:left">
            <label class="form-label">密码</label>
            <input class="form-input" type="password" id="regPwd" placeholder="请输入密码（6-20位）" required>
          </div>
          <div class="form-group" style="text-align:left">
            <label class="form-label">确认密码</label>
            <input class="form-input" type="password" id="regPwd2" placeholder="再次输入密码" required>
          </div>
          <div class="form-error" id="regError" style="display:none"></div>
          <button type="submit" class="btn btn-primary btn-block" style="margin-top:8px">注册</button>
        </form>
        <div class="auth-link">已有账号？<a href="#/login">立即登录</a></div>
      </div>
    </div>
  `;
  document.getElementById('regForm').onsubmit = (e) => {
    e.preventDefault();
    doRegister();
  };
}

function doRegister() {
  const username = document.getElementById('regUser').value;
  const pwd = document.getElementById('regPwd').value;
  const pwd2 = document.getElementById('regPwd2').value;
  const errEl = document.getElementById('regError');

  if (username.length < 3 || username.length > 20) { errEl.textContent = '用户名长度3-20位'; errEl.style.display = 'block'; return; }
  if (pwd.length < 6 || pwd.length > 20) { errEl.textContent = '密码长度6-20位'; errEl.style.display = 'block'; return; }
  if (pwd !== pwd2) { errEl.textContent = '两次密码不一致'; errEl.style.display = 'block'; return; }
  
  if (!Auth.register(username, pwd)) {
    errEl.textContent = '用户名已存在'; errEl.style.display = 'block'; return;
  }
  toast('注册成功，请登录');
  router.navigate('#/login');
}


// ====== 管理后台框架 ======
function renderAdmin(main) {
  if (Auth.isAdmin()) return router.navigate('#/admin/dashboard');
  if (Auth.isLoggedIn()) return main.innerHTML = '<div class="empty"><div class="empty-icon">🚫</div><div class="empty-text">无管理员权限</div></div>';
  main.innerHTML = '<div class="empty"><div class="empty-icon">🔒</div><div class="empty-text">请以管理员身份登录</div><a href="#/login" class="btn btn-primary" style="display:inline-flex">去登录</a></div>';
}

function renderAdminLayout(main, contentFn) {
  if (!Auth.isAdmin()) { renderAdmin(main); return; }
  const user = Auth.getUser();
  main.innerHTML = `
    <div class="admin-layout">
      <aside class="admin-sidebar">
        <div class="admin-sidebar-header"><a href="#/admin/dashboard">🎮 管理后台</a></div>
        <nav class="admin-sidebar-nav">
          <a class="admin-menu-item" href="#/admin/dashboard" data-admin-link><span>📊</span> 仪表盘</a>
          <a class="admin-menu-item" href="#/admin/users" data-admin-link><span>👥</span> 用户管理</a>
          <a class="admin-menu-item" href="#/admin/products" data-admin-link><span>📦</span> 商品管理</a>
        </nav>
        <div class="admin-sidebar-footer">
          <div class="user-info"><span>${escHtml(user.username)}</span><span class="admin-role-badge">管理员</span></div>
          <button class="admin-sidebar-btn admin-logout-btn" onclick="logout()">退出登录</button>
          <a href="#/" class="admin-sidebar-btn admin-back-btn">← 返回商城</a>
        </div>
      </aside>
      <main class="admin-main" id="adminContent"></main>
    </div>
  `;
  document.querySelectorAll('[data-admin-link]').forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + router.current));
  contentFn(document.getElementById('adminContent'));
}

// ---- Dashboard ----
function renderAdminDashboard(main) {
  renderAdminLayout(main, (el) => {
    const products = Store.getProducts();
    const onlineCount = products.filter(p => p.status === 1).length;
    el.innerHTML = `
      <h2 style="margin-bottom:24px">📊 仪表盘</h2>
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-icon">👥</div><div class="stat-info"><div class="stat-num">${Store.getUsers().length}</div><div class="stat-label">总用户</div></div></div>
        <div class="stat-card"><div class="stat-icon">📦</div><div class="stat-info"><div class="stat-num">${products.length}</div><div class="stat-label">商品总数</div></div></div>
        <div class="stat-card"><div class="stat-icon">✅</div><div class="stat-info"><div class="stat-num">${onlineCount}</div><div class="stat-label">在售商品</div></div></div>
      </div>
      <div class="quick-actions" style="margin-top:24px">
        <h3>数据管理</h3>
        <div class="action-grid">
          <button class="action-card" onclick="exportSeedData()">📤 导出商品数据</button>
        </div>
      </div>
    `;
  });
}

// ====== 导出种子数据 ======
function exportSeedData() {
  Store.exportData();
  toast('已导出 seed.json，请放入项目根目录后重新部署 GitHub');
}

// ---- Admin Users 状态管理 ----
const AdminUsersState = { page: 1, kw: '' };
function renderAdminUsers(main) {
  renderAdminLayout(main, (el) => {
    let filtered = Store.getUsers();
    if (AdminUsersState.kw) filtered = filtered.filter(u => u.username.toLowerCase().includes(AdminUsersState.kw.toLowerCase()));
    
    const pages = Math.ceil(filtered.length / APP_CONFIG.pageSizes.admin);
    const pageUsers = filtered.slice((AdminUsersState.page - 1) * APP_CONFIG.pageSizes.admin, AdminUsersState.page * APP_CONFIG.pageSizes.admin);

    el.innerHTML = `
      <h2 style="margin-bottom:20px">👥 用户管理</h2>
      <div class="card" style="margin-bottom:20px;padding:12px 16px;">
        <input class="form-input" id="auSearch" style="width:200px" type="text" placeholder="搜索用户名..." value="${escHtml(AdminUsersState.kw)}">
      </div>
      <div class="table-wrap">
        <table id="auTable">
          <thead><tr><th>ID</th><th>用户名</th><th>角色</th><th>状态</th><th>注册时间</th><th>操作</th></tr></thead>
          <tbody>
            ${pageUsers.length === 0 ? '<tr><td colspan="6" class="empty-cell">暂无数据</td></tr>' : pageUsers.map(u => `
              <tr>
                <td>${u.id}</td><td><strong>${escHtml(u.username)}</strong></td>
                <td><span class="tag" style="background:${u.role === 'admin' ? '#fce7f3' : '#dbeafe'};color:${u.role === 'admin' ? '#be185d' : '#1d4ed8'}">${u.role === 'admin' ? '管理员' : '用户'}</span></td>
                <td><span class="tag" style="background:${u.status === 1 ? '#dcfce7' : '#fee2e2'};color:${u.status === 1 ? '#15803d' : '#dc2626'}">${u.status === 1 ? '正常' : '禁用'}</span></td>
                <td style="font-size:13px;color:var(--text2)">${u.createTime.slice(0, 10)}</td>
                <td>${u.role !== 'admin' ? `<button class="btn btn-sm ${u.status === 1 ? 'btn-danger' : 'btn-outline'}" data-action="toggle" data-id="${u.id}">${u.status === 1 ? '禁用' : '启用'}</button>` : '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ${pages > 1 ? paginationHTML(AdminUsersState.page, pages, 'auPagination') : ''}
    `;

    document.getElementById('auSearch').addEventListener('keydown', e => {
      if (e.key === 'Enter') { AdminUsersState.kw = e.target.value; AdminUsersState.page = 1; router.render(); }
    });

    document.getElementById('auTable').addEventListener('click', e => {
      if (e.target.dataset.action === 'toggle') {
        toggleUserStatus(parseInt(e.target.dataset.id));
        router.render();
      }
    });

    bindPaginationEvents('auPagination', page => { AdminUsersState.page = page; router.render(); });
  });
}

// ---- Admin Products 状态管理 ----
const AdminProductsState = { page: 1, kw: '', status: '' };
function renderAdminProducts(main) {
  renderAdminLayout(main, (el) => {
    const data = Store.queryProducts({ 
      keyword: AdminProductsState.kw, page: AdminProductsState.page, size: APP_CONFIG.pageSizes.admin, 
      status: AdminProductsState.status === '' ? undefined : parseInt(AdminProductsState.status) 
    });

    el.innerHTML = `
      <h2 style="margin-bottom:20px">📦 商品管理</h2>
      <div class="tools-bar">
        <input type="text" id="apSearch" class="form-input" placeholder="搜索商品名称..." value="${escHtml(AdminProductsState.kw)}">
        <select id="apStatus" class="form-select">
          <option value="">全部状态</option>
          <option value="1" ${AdminProductsState.status === '1' ? 'selected' : ''}>在售</option>
          <option value="0" ${AdminProductsState.status === '0' ? 'selected' : ''}>已下架</option>
        </select>
        <button class="btn btn-primary" onclick="showProductModal()">➕ 添加商品</button>
      </div>
      <div class="table-wrap">
        <table id="apTable">
          <thead><tr><th>ID</th><th>名称</th><th>分类</th><th>价格</th><th>状态</th><th>操作</th></tr></thead>
          <tbody>
            ${data.records.length === 0 ? '<tr><td colspan="6" class="empty-cell">暂无数据</td></tr>' : data.records.map(p => `
              <tr>
                <td>${p.id}</td><td class="name-cell"><strong>${escHtml(p.name)}</strong></td>
                <td><span class="tag">${p.category || '-'}</span></td>
                <td style="color:var(--danger); font-weight:600;">¥${formatPrice(p.price)}</td>
                <td><span class="tag" style="background:${p.status === 1 ? '#dcfce7' : '#fee2e2'};color:${p.status === 1 ? '#15803d' : '#dc2626'}">${p.status === 1 ? '在售' : '下架'}</span></td>
                <td>
                  <div style="display:flex;gap:6px">
                    <button class="btn btn-sm btn-outline" onclick="showProductModal(${p.id})">编辑</button>
                    <button class="btn btn-sm ${p.status === 1 ? 'btn-danger' : 'btn-outline'}" data-action="toggle" data-id="${p.id}">${p.status === 1 ? '下架' : '上架'}</button>
                    <button class="btn btn-sm btn-danger" data-action="delete" data-id="${p.id}">删除</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ${data.pages > 1 ? paginationHTML(AdminProductsState.page, data.pages, 'apPagination') : ''}
    `;

    document.getElementById('apSearch').addEventListener('keydown', e => {
      if (e.key === 'Enter') { AdminProductsState.kw = e.target.value; AdminProductsState.page = 1; router.render(); }
    });
    document.getElementById('apStatus').addEventListener('change', e => {
      AdminProductsState.status = e.target.value; AdminProductsState.page = 1; router.render();
    });
    
    document.getElementById('apTable').addEventListener('click', e => {
      const id = parseInt(e.target.dataset.id);
      if (e.target.dataset.action === 'toggle') { toggleProductStatus(id); router.render(); }
      if (e.target.dataset.action === 'delete') { deleteProduct(id); router.render(); }
    });

    bindPaginationEvents('apPagination', page => { AdminProductsState.page = page; router.render(); });
  });
}

// ====== 图片压缩工具 ======
function compressImage(file, callback) {
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width, height = img.height;
      if (width > APP_CONFIG.maxImageWidth) {
        height = Math.round((height * APP_CONFIG.maxImageWidth) / width);
        width = APP_CONFIG.maxImageWidth;
      }
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      callback(canvas.toDataURL('image/jpeg', 0.8)); 
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// ====== 商品 Modal (带详情图恢复) ======
let _detailImages = [];

function showProductModal(id) {
  const p = id ? Store.getProduct(id) : null;
  // 恢复详情图状态
  _detailImages = p && Array.isArray(p.images) ? [...p.images] : [];
  // 获取当前标签
  const currentTags = p ? Store.getProductTags(p.id).map(t => t.name) : [];
  const allTagNames = Store.getTags().map(t => t.name);

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <h3 class="modal-title">${p ? '编辑商品' : '添加商品'}</h3>
      <form id="productForm">
        <div class="form-group"><label class="form-label">商品名称 *</label><input class="form-input" id="pf_name" value="${p ? escHtml(p.name) : ''}" required></div>
        <div class="form-group"><label class="form-label">描述</label><textarea class="form-textarea" id="pf_desc" rows="3">${p ? escHtml(p.description || '') : ''}</textarea></div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">价格 *</label><input class="form-input" type="number" step="0.01" id="pf_price" value="${p ? p.price : ''}" required></div>
          <div class="form-group"><label class="form-label">分类</label><input class="form-input" id="pf_category" value="${p ? escHtml(p.category || '') : ''}"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">状态</label><select class="form-select" id="pf_status"><option value="1" ${p && p.status === 1 ? 'selected' : ''}>上架</option><option value="0" ${p && p.status === 0 ? 'selected' : ''}>下架</option></select></div>
        </div>

        <div class="form-group">
          <label class="form-label">标签（输入后按回车添加）</label>
          <div id="tagInputWrapper" data-tags="${escHtml(JSON.stringify(currentTags))}"></div>
          <div class="tag-suggestions" id="tagSuggestions"></div>
        </div>

        <div class="form-group"><label class="form-label">主图 (封面)</label>
          <div class="img-upload-area">
            <div class="img-preview" id="mainImagePreview" style="${p && p.mainImage ? '' : 'display:none'}">
              <img id="mainImageImg" src="${p && p.mainImage ? p.mainImage : ''}">
              <button type="button" class="img-remove" id="clearMainImgBtn">✕</button>
            </div>
            <label class="upload-btn" id="mainImageUploadBtn" style="${p && p.mainImage ? 'display:none' : ''}">
              <input type="file" accept="image/*" hidden id="mainImageInput"><span>+ 上传主图</span>
            </label>
          </div>
        </div>

        <div class="form-group"><label class="form-label">详情图 (最多3张)</label>
          <div class="img-upload-area" id="detailImagesArea"></div>
        </div>

        <div class="modal-actions">
          <button type="button" class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">取消</button>
          <button type="submit" class="btn btn-primary">保存</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  // 渲染标签
  renderTagInput('tagInputWrapper', currentTags, allTagNames);

  // 渲染详情图区域
  renderDetailImages();

  // 主图逻辑
  document.getElementById('mainImageInput').onchange = function() {
    if (!this.files[0]) return;
    compressImage(this.files[0], base64 => {
      document.getElementById('mainImagePreview').style.display = 'block';
      document.getElementById('mainImageImg').src = base64;
      document.getElementById('mainImageUploadBtn').style.display = 'none';
      document.getElementById('mainImagePreview').dataset.b64 = base64;
    });
  };
  document.getElementById('clearMainImgBtn').onclick = function() {
    document.getElementById('mainImagePreview').style.display = 'none';
    document.getElementById('mainImageUploadBtn').style.display = 'flex';
    delete document.getElementById('mainImagePreview').dataset.b64;
  };

  // 提交保存
  document.getElementById('productForm').onsubmit = (e) => {
    e.preventDefault();
    const saveObj = {
      name: document.getElementById('pf_name').value,
      description: document.getElementById('pf_desc').value,
      price: parseFloat(document.getElementById('pf_price').value),
      category: document.getElementById('pf_category').value,
      status: parseInt(document.getElementById('pf_status').value),
      mainImage: document.getElementById('mainImagePreview').dataset.b64 || (document.getElementById('mainImageImg') ? document.getElementById('mainImageImg').src : '') || '',
      images: _detailImages
    };
    const tagWrapper = document.getElementById('tagInputWrapper');
    const tags = tagWrapper ? tagWrapper._tags || [] : [];

    if (id) {
      Store.updateProduct(id, saveObj);
      Store.setProductTags(id, tags);
      toast('修改成功');
    } else {
      const prod = Store.addProduct(saveObj);
      Store.setProductTags(prod.id, tags);
      toast('添加成功');
    }
    overlay.remove();
    router.render();
  };
}

// ====== 标签输入组件 ======
function renderTagInput(containerId, tags, suggestions) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container._tags = [...tags];

  let tagsHtml = tags.map(t => `
    <span class="tag-input-tag" style="background:${tagColor(t)}">
      ${escHtml(t)}
      <span class="tag-del" data-tag="${escHtml(t)}">&times;</span>
    </span>
  `).join('');

  container.innerHTML = `
    <div class="tag-input-wrap">
      ${tagsHtml}
      <input class="tag-input-field" id="tagField_${containerId}" placeholder="输入标签名并回车">
    </div>
    <div id="tagSuggestions" style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;"></div>
  `;

  // 事件代理：删除标签
  container.querySelector('.tag-input-wrap').addEventListener('click', e => {
    if (e.target.classList.contains('tag-del')) {
      const tag = e.target.dataset.tag;
      container._tags = container._tags.filter(t => t !== tag);
      renderTagInput(containerId, container._tags, suggestions);
    }
  });

  const field = document.getElementById('tagField_' + containerId);
  const sugEl = document.getElementById('tagSuggestions');

  field.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = field.value.trim();
      if (val && !container._tags.includes(val)) {
        container._tags.push(val);
        renderTagInput(containerId, container._tags, suggestions);
      }
    }
    if (e.key === 'Backspace' && !field.value && container._tags.length) {
      container._tags.pop();
      renderTagInput(containerId, container._tags, suggestions);
    }
  });

  // 输入建议
  field.addEventListener('input', () => {
    const kw = field.value.trim().toLowerCase();
    if (!kw) { sugEl.innerHTML = ''; return; }
    const matches = suggestions.filter(s => s.toLowerCase().includes(kw) && !container._tags.includes(s)).slice(0, 8);
    sugEl.innerHTML = matches.map(s => `<span class="tag-suggestion" style="background:${tagColor(s)}" data-sug="${s}">${escHtml(s)}</span>`).join('');
  });

  // 点击建议
  sugEl.addEventListener('click', e => {
    if (e.target.classList.contains('tag-suggestion')) {
      const tag = e.target.dataset.sug;
      if (tag && !container._tags.includes(tag)) {
        container._tags.push(tag);
        renderTagInput(containerId, container._tags, suggestions);
      }
      sugEl.innerHTML = '';
    }
  });
}

// --- 详情图相关函数 ---
function renderDetailImages() {
  const area = document.getElementById('detailImagesArea');
  if (!area) return;
  let html = '';
  for (let i = 0; i < _detailImages.length; i++) {
    html += `<div class="img-preview"><img src="${_detailImages[i]}"><button type="button" class="img-remove" onclick="removeDetailImage(${i})">✕</button></div>`;
  }
  if (_detailImages.length < 3) {
    html += `<label class="upload-btn"><input type="file" accept="image/*" hidden onchange="addDetailImage(this)"><span>+ 上传详情图</span></label>`;
  }
  area.innerHTML = html;
}

window.addDetailImage = function(input) {
  if (!input.files[0]) return;
  compressImage(input.files[0], base64 => {
    _detailImages.push(base64);
    renderDetailImages();
  });
};

window.removeDetailImage = function(idx) {
  _detailImages.splice(idx, 1);
  renderDetailImages();
};
// --------------------

// ====== Admin helpers ======
function toggleUserStatus(id) {
  const u = Store.getUser(id);
  if (u) { Store.updateUser(id, { status: u.status === 1 ? 0 : 1 }); toast(u.status === 1 ? '已禁用' : '已启用'); }
}
function toggleProductStatus(id) {
  const p = Store.getProduct(id);
  if (p) { Store.updateProduct(id, { status: p.status === 1 ? 0 : 1 }); toast(p.status === 1 ? '已下架' : '已上架'); }
}
function deleteProduct(id) {
  if (confirm('确认删除该商品？')) { Store.deleteProduct(id); toast('已删除'); }
}

// ====== 分页器组件优化 (Data 属性代理) ======
function paginationHTML(current, total, containerId) {
  if (total <= 1) return '';
  let html = `<div class="pagination" id="${containerId}">`;
  html += `<button class="page-btn" data-page="${current - 1}" ${current <= 1 ? 'disabled' : ''}>上一页</button>`;
  let start = Math.max(1, current - 2), end = Math.min(total, start + 4);
  if (end - start < 4) start = Math.max(1, end - 4);
  for (let i = start; i <= end; i++) {
    html += `<button class="page-btn ${i === current ? 'active' : ''}" data-page="${i}">${i}</button>`;
  }
  html += `<button class="page-btn" data-page="${current + 1}" ${current >= total ? 'disabled' : ''}>下一页</button>`;
  html += '</div>';
  return html;
}

function bindPaginationEvents(containerId, callback) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.addEventListener('click', e => {
    const btn = e.target.closest('.page-btn');
    if (btn && !btn.disabled && !btn.classList.contains('active')) {
      callback(parseInt(btn.dataset.page));
    }
  });
}

// ====== UI update ======
function updateUI() {
  const user = Auth.getUser();
  const loginBtn = document.getElementById('navLoginBtn');
  const userInfo = document.getElementById('userInfo');
  const userName = document.getElementById('userName');
  const navAdmin = document.getElementById('navAdmin');

  if (user) {
    if (userInfo) { userInfo.style.display = 'flex'; userName.textContent = user.username; }
    if (loginBtn) loginBtn.style.display = 'none';
    if (navAdmin) navAdmin.style.display = user.role === 'admin' ? 'inline' : 'none';
  } else {
    if (userInfo) userInfo.style.display = 'none';
    if (loginBtn) { loginBtn.style.display = 'inline'; loginBtn.textContent = '登录'; }
    if (navAdmin) navAdmin.style.display = 'none';
  }
}

function escHtml(s) { return s ? String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m]) : ''; }
function logout() { Auth.logout(); toast('已退出'); updateUI(); router.navigate('#/'); }

