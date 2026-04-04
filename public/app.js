/* ── State ──────────────────────────────────────────────── */
let allTools      = [];
let activeTag     = '';
let activeSort    = 'newest';
let activeCreator = '';
let searchQuery   = '';
let sheetToolId   = null;   // currently open bottom sheet

const DEFAULT_POINTS = 100;

/* ── localStorage helpers ───────────────────────────────── */
function getRated()   { return JSON.parse(localStorage.getItem('rated_tools') || '{}'); }
function getMyStars() { return JSON.parse(localStorage.getItem('my_stars')    || '{}'); }
function markRated(id, stars) {
  const r = getRated();   r[id] = true;    localStorage.setItem('rated_tools', JSON.stringify(r));
  const s = getMyStars(); s[id] = stars;   localStorage.setItem('my_stars',    JSON.stringify(s));
}
function hasRated(id) { return !!getRated()[id]; }
function myStars(id)  { return getMyStars()[id] || 0; }

function getPoints() {
  const v = localStorage.getItem('vibe_points');
  if (v === null) { localStorage.setItem('vibe_points', String(DEFAULT_POINTS)); return DEFAULT_POINTS; }
  return parseInt(v, 10);
}
function setPoints(n) { localStorage.setItem('vibe_points', String(n)); refreshPointsUI(); }
function refreshPointsUI() {
  const el = document.getElementById('points-display');
  if (el) el.textContent = `${getPoints()} 點`;
}

/* ── Utils ──────────────────────────────────────────────── */
function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function timeAgo(ts) {
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 60)    return '剛剛';
  if (diff < 3600)  return Math.floor(diff / 60)    + ' 分鐘前';
  if (diff < 86400) return Math.floor(diff / 3600)  + ' 小時前';
  return Math.floor(diff / 86400) + ' 天前';
}

/* ── API calls ──────────────────────────────────────────── */
async function apiFetch(path, opts = {}) {
  const res = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...opts });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || res.statusText); }
  return res.json();
}

/* ── Skeleton loading ───────────────────────────────────── */
function showSkeleton() {
  const grid = document.getElementById('tool-grid');
  grid.innerHTML = Array(6).fill(`
    <div class="skeleton-card">
      <div class="skel" style="width:60%;height:18px;margin-bottom:12px"></div>
      <div class="skel" style="width:100%;height:12px;margin-bottom:6px"></div>
      <div class="skel" style="width:80%;height:12px;margin-bottom:16px"></div>
      <div style="display:flex;gap:6px">
        <div class="skel" style="width:48px;height:20px;border-radius:10px"></div>
        <div class="skel" style="width:48px;height:20px;border-radius:10px"></div>
      </div>
    </div>`).join('');
}

/* ── Load tools from API ────────────────────────────────── */
async function loadTools() {
  showSkeleton();
  const params = new URLSearchParams({ sort: activeSort });
  if (activeTag)     params.set('tag', activeTag);
  if (activeCreator) params.set('creator', activeCreator);
  allTools = await apiFetch(`/api/tools?${params}`);
  renderAll();
}

/* ── Tab navigation ─────────────────────────────────────── */
function switchTab(tabName) {
  document.querySelectorAll('.tab').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.tab === tabName)
  );
  document.querySelectorAll('.tab-panel').forEach(panel =>
    panel.classList.toggle('active', panel.id === `tab-${tabName}`)
  );
}

document.querySelector('.tab-nav').addEventListener('click', e => {
  const btn = e.target.closest('.tab');
  if (!btn) return;
  switchTab(btn.dataset.tab);
});

/* ── Tag filters ────────────────────────────────────────── */
function buildTagFilters() {
  const tags = [...new Set(allTools.flatMap(t => t.tags))].sort();
  const wrap = document.getElementById('tag-filters');
  wrap.innerHTML = `<button class="tag-btn ${activeTag===''?'active':''}" data-tag="">全部</button>`
    + tags.map(t => `<button class="tag-btn ${activeTag===t?'active':''}" data-tag="${esc(t)}">${esc(t)}</button>`).join('');
}

/* ── Creator dropdown ───────────────────────────────────── */
function buildCreatorSelect() {
  const names = [...new Set(allTools.map(t => t.creator_name))].sort();
  const sel = document.getElementById('creator-select');
  const current = sel.value;
  sel.innerHTML = `<option value="">所有創作者</option>`
    + names.map(n => `<option value="${esc(n)}" ${n===current?'selected':''}>${esc(n)}</option>`).join('');
}

/* ── Stars HTML ─────────────────────────────────────────── */
function starsHtml(toolId, avgRating, ratingCount) {
  const rated    = hasRated(toolId);
  const filled   = rated ? myStars(toolId) : Math.round(avgRating);
  const disabled = rated ? ' disabled' : '';
  const stars    = [1,2,3,4,5].map(v =>
    `<span class="star ${v <= filled ? 'on' : ''}" data-v="${v}">★</span>`
  ).join('');
  const info = ratingCount > 0
    ? `<span class="rating-info"><b>${avgRating}</b> (${ratingCount})</span>`
    : `<span class="rating-info">尚無評分</span>`;
  const note = rated ? `<span class="rating-note">已評分</span>` : '';
  return `
    <div class="card-rating">
      <div class="stars${disabled}" data-id="${toolId}">${stars}</div>
      ${info}${note}
    </div>`;
}

/* ── Card HTML ──────────────────────────────────────────── */
function cardHtml(t) {
  const costLabel = t.cost > 0
    ? `<button class="use-btn use-btn-paid preview-btn" data-id="${t.id}" data-url="${esc(t.url)}" data-title="${esc(t.title)}" data-cost="${t.cost}">使用（${t.cost} 點）</button>`
    : `<button class="use-btn try-btn preview-btn" data-id="${t.id}" data-url="${esc(t.url)}" data-title="${esc(t.title)}" data-cost="0">試用 →</button>`;

  return `
    <article class="card${t.is_featured ? ' card-featured' : ''}" data-id="${t.id}">
      <div class="card-main">
        <div class="card-head">
          <div class="card-title">${esc(t.title)}</div>
          ${t.cost > 0 ? `<span class="cost-chip">${t.cost} 點</span>` : `<span class="cost-chip free">免費</span>`}
        </div>
        <div class="card-desc">${esc(t.desc)}</div>
        <div class="card-meta-row">
          <span class="creator-name">by ${esc(t.creator_name)}</span>
          <span class="usage-count">${t.usage_count} 次使用</span>
        </div>
        <div class="card-tags">
          ${t.tags.map(tag => `<span class="tag" data-tag="${esc(tag)}">${esc(tag)}</span>`).join('')}
          ${t.lang ? `<span class="lang-badge">${esc(t.lang)}</span>` : ''}
        </div>
        ${starsHtml(t.id, t.avg_rating, t.rating_count)}
      </div>
      <div class="card-footer">
        <button class="comment-toggle" data-id="${t.id}" data-title="${esc(t.title)}">
          💬 ${t.comment_count} 則留言
        </button>
        ${costLabel}
      </div>
    </article>`;
}

/* ── Render all ─────────────────────────────────────────── */
function renderAll() {
  buildTagFilters();
  buildCreatorSelect();
  refreshPointsUI();

  const q = searchQuery.toLowerCase().trim();
  const matchesSearch = t =>
    !q ||
    t.title.toLowerCase().includes(q) ||
    t.desc.toLowerCase().includes(q) ||
    t.tags.some(tag => tag.toLowerCase().includes(q)) ||
    t.creator_name.toLowerCase().includes(q);

  // Featured section
  const featured = allTools.filter(t => t.is_featured && matchesSearch(t));
  const featuredSection = document.getElementById('featured-section');
  const featuredGrid    = document.getElementById('featured-grid');
  if (featured.length > 0) {
    featuredSection.classList.remove('hidden');
    featuredGrid.innerHTML = featured.map(cardHtml).join('');
  } else {
    featuredSection.classList.add('hidden');
    featuredGrid.innerHTML = '';
  }

  // Main grid
  const filtered = allTools.filter(matchesSearch);
  document.getElementById('tool-count').textContent   = filtered.length + ' 個工具';
  document.getElementById('header-count').textContent = allTools.length + ' 個工具';

  const grid = document.getElementById('tool-grid');
  if (filtered.length === 0) {
    grid.innerHTML = `<div class="empty"><span>🔍</span>${q ? '找不到符合「'+esc(q)+'」的工具' : '還沒有工具，快來提交第一個！'}</div>`;
    return;
  }
  grid.innerHTML = filtered.map(cardHtml).join('');
}

/* ── Use / Try flow ─────────────────────────────────────── */
async function useTool(toolId, url, title, cost) {
  if (cost > 0) {
    const balance = getPoints();
    if (balance < cost) {
      alert(`點數不足！需要 ${cost} 點，目前剩餘 ${balance} 點。`);
      return;
    }
    setPoints(balance - cost);
  }
  try {
    const result = await apiFetch(`/api/tools/${toolId}/use`, { method: 'POST' });
    const tool = allTools.find(t => t.id === toolId);
    if (tool) { tool.usage_count = result.usage_count; tool.points_earned = result.points_earned; }
    document.querySelectorAll(`.card[data-id="${toolId}"] .usage-count`).forEach(el => {
      el.textContent = `${result.usage_count} 次使用`;
    });
    openPreview(url, title);
  } catch (e) {
    if (cost > 0) setPoints(getPoints() + cost);
    alert('操作失敗：' + e.message);
  }
}

/* ── Comments bottom sheet ──────────────────────────────── */
function openSheet(toolId, toolTitle) {
  sheetToolId = toolId;
  document.getElementById('sheet-title').textContent = toolTitle + ' 的留言';
  const sheet = document.getElementById('comments-sheet');
  sheet.classList.add('open');
  document.body.style.overflow = 'hidden';
  loadSheetComments(toolId);
}

function closeSheet() {
  document.getElementById('comments-sheet').classList.remove('open');
  document.body.style.overflow = '';
  sheetToolId = null;
}

async function loadSheetComments(toolId) {
  const list = document.getElementById('sheet-comments-list');
  list.innerHTML = '<div class="no-comments">載入中...</div>';
  const comments = await apiFetch(`/api/comments/${toolId}`).catch(() => []);
  if (comments.length === 0) {
    list.innerHTML = '<div class="no-comments">還沒有留言，來第一個吧！</div>';
    return;
  }
  list.innerHTML = comments.map(c => `
    <div class="comment-item">
      <div class="comment-body">${esc(c.body)}</div>
      <div class="comment-time">${timeAgo(c.created_at)}</div>
    </div>`).join('');
}

async function postSheetComment() {
  if (!sheetToolId) return;
  const input = document.getElementById('sheet-comment-input');
  const body  = input.value.trim();
  if (!body) return;
  input.disabled = true;
  try {
    const comment = await apiFetch(`/api/comments/${sheetToolId}`, {
      method: 'POST', body: JSON.stringify({ body })
    });
    const list  = document.getElementById('sheet-comments-list');
    const noMsg = list.querySelector('.no-comments');
    if (noMsg) noMsg.remove();
    const el = document.createElement('div');
    el.className = 'comment-item';
    el.innerHTML = `<div class="comment-body">${esc(comment.body)}</div><div class="comment-time">剛剛</div>`;
    list.prepend(el);
    input.value = '';

    const tool = allTools.find(t => t.id === sheetToolId);
    if (tool) {
      tool.comment_count++;
      document.querySelectorAll(`.comment-toggle[data-id="${sheetToolId}"]`).forEach(btn => {
        btn.textContent = `💬 ${tool.comment_count} 則留言`;
      });
    }
  } catch (e) { alert('留言失敗：' + e.message); }
  finally { input.disabled = false; input.focus(); }
}

document.getElementById('sheet-close').addEventListener('click', closeSheet);
document.getElementById('sheet-backdrop').addEventListener('click', closeSheet);
document.getElementById('sheet-comment-submit').addEventListener('click', postSheetComment);
document.getElementById('sheet-comment-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') postSheetComment();
});

/* ── Rating ─────────────────────────────────────────────── */
async function submitRating(toolId, stars) {
  if (hasRated(toolId)) return;
  markRated(toolId, stars);
  try {
    const agg = await apiFetch(`/api/ratings/${toolId}`, {
      method: 'POST', body: JSON.stringify({ stars })
    });
    const tool = allTools.find(t => t.id === toolId);
    if (tool) { tool.avg_rating = agg.avg_rating; tool.rating_count = agg.rating_count; }
    document.querySelectorAll(`.card[data-id="${toolId}"] .card-rating`).forEach(el => {
      el.outerHTML = starsHtml(toolId, agg.avg_rating, agg.rating_count);
    });
  } catch (e) { console.error('評分失敗', e); }
}

/* ── Preview modal ──────────────────────────────────────── */
function openPreview(url, title) {
  const modal    = document.getElementById('preview-modal');
  const iframe   = document.getElementById('preview-iframe');
  const fallback = document.getElementById('modal-fallback');
  const linkBtn  = document.getElementById('modal-open-link');
  const fbLink   = document.getElementById('fallback-link');
  const titleEl  = document.getElementById('modal-title');

  titleEl.textContent = title;
  linkBtn.href = url;
  fbLink.href  = url;
  iframe.src   = '';
  fallback.classList.add('hidden');
  iframe.style.display = 'block';
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  let loaded = false;
  iframe.onload = () => { loaded = true; };
  iframe.src = url;
  setTimeout(() => {
    if (!loaded) { iframe.style.display = 'none'; fallback.classList.remove('hidden'); }
  }, 4000);
}

function closePreview() {
  const modal  = document.getElementById('preview-modal');
  const iframe = document.getElementById('preview-iframe');
  modal.classList.add('hidden');
  iframe.src = '';
  document.body.style.overflow = '';
}

/* ── Submit form ────────────────────────────────────────── */
async function handleSubmit(e) {
  e.preventDefault();
  const btn = e.target.querySelector('.submit-btn');
  btn.disabled = true;
  try {
    const tags = document.getElementById('f-tags').value
      .split(',').map(t => t.trim()).filter(Boolean);
    const tool = await apiFetch('/api/tools', {
      method: 'POST',
      body: JSON.stringify({
        title:        document.getElementById('f-title').value.trim(),
        desc:         document.getElementById('f-desc').value.trim(),
        url:          document.getElementById('f-url').value.trim(),
        creator_name: document.getElementById('f-creator').value.trim(),
        cost:         parseInt(document.getElementById('f-cost').value, 10) || 0,
        lang:         document.getElementById('f-lang').value,
        tags,
      })
    });
    allTools.unshift(tool);
    searchQuery = '';
    document.getElementById('search').value = '';
    renderAll();
    e.target.reset();
    document.getElementById('desc-count').textContent = '0 / 300';

    const flash = document.getElementById('flash');
    flash.classList.remove('hidden');
    setTimeout(() => flash.classList.add('hidden'), 4000);

    // Switch to browse tab to show the new tool
    switchTab('browse');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (err) {
    alert('提交失敗：' + err.message);
  } finally { btn.disabled = false; }
}

/* ── Creator stats lookup ───────────────────────────────── */
async function lookupCreator() {
  const name = document.getElementById('creator-name-input').value.trim();
  if (!name) return;
  const box = document.getElementById('creator-stats');
  box.classList.remove('hidden');
  box.innerHTML = '<p class="loading-text">查詢中...</p>';
  try {
    const data = await apiFetch(`/api/creators/stats?name=${encodeURIComponent(name)}`);
    const rows = data.tools.map(t =>
      `<tr><td>${esc(t.title)}</td><td>${t.cost > 0 ? t.cost + ' 點' : '免費'}</td><td>${t.usage_count}</td><td>${t.points_earned}</td></tr>`
    ).join('');
    box.innerHTML = `
      <div class="stats-summary">
        <div class="stat-item"><span class="stat-value">${data.total_uses}</span><span class="stat-label">總使用次數</span></div>
        <div class="stat-item"><span class="stat-value">${data.total_points_earned}</span><span class="stat-label">總收益（點數）</span></div>
        <div class="stat-item"><span class="stat-value">${data.tools.length}</span><span class="stat-label">工具數量</span></div>
      </div>
      <table class="stats-table">
        <thead><tr><th>工具</th><th>費用</th><th>使用次數</th><th>累積收益</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
  } catch (e) {
    box.innerHTML = `<p class="error-text">${esc(e.message)}</p>`;
  }
}

/* ── Event delegation ───────────────────────────────────── */
function attachGridEvents(container) {
  container.addEventListener('click', async e => {
    // Star rating
    const star = e.target.closest('.star');
    if (star) {
      const starsEl = star.closest('.stars');
      if (!starsEl || starsEl.classList.contains('disabled')) return;
      await submitRating(Number(starsEl.dataset.id), Number(star.dataset.v));
      return;
    }
    // Comment toggle → open bottom sheet
    const toggle = e.target.closest('.comment-toggle');
    if (toggle) {
      openSheet(Number(toggle.dataset.id), toggle.dataset.title);
      return;
    }
    // Tag chip click → filter
    const tagChip = e.target.closest('.tag[data-tag]');
    if (tagChip) {
      activeTag = tagChip.dataset.tag;
      loadTools();
      return;
    }
    // Use / Try button
    const previewBtn = e.target.closest('.preview-btn');
    if (previewBtn) {
      await useTool(
        Number(previewBtn.dataset.id),
        previewBtn.dataset.url,
        previewBtn.dataset.title,
        Number(previewBtn.dataset.cost)
      );
    }
  });

  // Stars hover
  container.addEventListener('mouseover', e => {
    const star = e.target.closest('.star');
    if (!star) return;
    const starsEl = star.closest('.stars');
    if (!starsEl || starsEl.classList.contains('disabled')) return;
    const v = Number(star.dataset.v);
    starsEl.querySelectorAll('.star').forEach(s =>
      s.classList.toggle('on', Number(s.dataset.v) <= v)
    );
  });
  container.addEventListener('mouseout', e => {
    const starsEl = e.target.closest('.stars');
    if (!starsEl || starsEl.classList.contains('disabled')) return;
    if (!starsEl.contains(e.relatedTarget)) {
      const toolId = Number(starsEl.dataset.id);
      const filled = hasRated(toolId) ? myStars(toolId) : Math.round(allTools.find(t => t.id === toolId)?.avg_rating || 0);
      starsEl.querySelectorAll('.star').forEach(s =>
        s.classList.toggle('on', Number(s.dataset.v) <= filled)
      );
    }
  });
}

attachGridEvents(document.getElementById('featured-grid'));
attachGridEvents(document.getElementById('tool-grid'));

/* ── Tag filter buttons ─────────────────────────────────── */
document.getElementById('tag-filters').addEventListener('click', e => {
  const btn = e.target.closest('.tag-btn');
  if (!btn) return;
  activeTag = btn.dataset.tag;
  document.querySelectorAll('.tag-btn').forEach(b => b.classList.toggle('active', b.dataset.tag === activeTag));
  loadTools();
});

/* ── Sort buttons ───────────────────────────────────────── */
document.querySelector('.sort-btns').addEventListener('click', e => {
  const btn = e.target.closest('.sort-btn');
  if (!btn) return;
  activeSort = btn.dataset.sort;
  document.querySelectorAll('.sort-btn').forEach(b => b.classList.toggle('active', b.dataset.sort === activeSort));
  loadTools();
});

/* ── Search ─────────────────────────────────────────────── */
document.getElementById('search').addEventListener('input', e => {
  searchQuery = e.target.value;
  renderAll();
});

/* ── Creator filter ─────────────────────────────────────── */
document.getElementById('creator-select').addEventListener('change', e => {
  activeCreator = e.target.value;
  loadTools();
});

/* ── Modal close ────────────────────────────────────────── */
document.getElementById('modal-close').addEventListener('click', closePreview);
document.getElementById('modal-backdrop').addEventListener('click', closePreview);
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closePreview(); closeSheet(); }
});

/* ── Submit form ────────────────────────────────────────── */
document.getElementById('submit-form').addEventListener('submit', handleSubmit);

/* ── Desc char counter ──────────────────────────────────── */
document.getElementById('f-desc').addEventListener('input', e => {
  document.getElementById('desc-count').textContent = `${e.target.value.length} / 300`;
});

/* ── Creator lookup ─────────────────────────────────────── */
document.getElementById('creator-lookup-btn').addEventListener('click', lookupCreator);
document.getElementById('creator-name-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') lookupCreator();
});

/* ── Scroll-to-top ──────────────────────────────────────── */
const scrollTopBtn = document.getElementById('scroll-top');
window.addEventListener('scroll', () => {
  scrollTopBtn.classList.toggle('hidden', window.scrollY < 400);
}, { passive: true });
scrollTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

/* ── Init ───────────────────────────────────────────────── */
refreshPointsUI();
loadTools();
