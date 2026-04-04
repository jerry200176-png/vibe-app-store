/* ── State ──────────────────────────────────────────────── */
let allTools      = [];
let activeTag     = '';
let activeSort    = 'newest';
let activeCreator = '';
let searchQuery   = '';
let sheetToolId   = null;

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

/* ── Edit token store ───────────────────────────────────── */
function getEditTokens() { return JSON.parse(localStorage.getItem('edit_tokens') || '{}'); }
function saveEditToken(toolId, token) {
  const m = getEditTokens(); m[toolId] = token; localStorage.setItem('edit_tokens', JSON.stringify(m));
}

/* ── Follow helpers ─────────────────────────────────────── */
function getFollowed() { return JSON.parse(localStorage.getItem('followed_creators') || '[]'); }
function setFollowed(list) { localStorage.setItem('followed_creators', JSON.stringify(list)); }
function isFollowing(name) { return getFollowed().some(n => n.toLowerCase() === name.toLowerCase()); }
function toggleFollow(name) {
  let list = getFollowed();
  if (isFollowing(name)) {
    list = list.filter(n => n.toLowerCase() !== name.toLowerCase());
  } else {
    list.push(name);
  }
  setFollowed(list);
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

/* ── Badge HTML ─────────────────────────────────────────── */
function badgesHtml(badges) {
  if (!badges || !badges.length) return '';
  return badges.map(b => {
    if (b === 'reviewed') return '<span class="badge badge-reviewed" title="已審核">&#10003; 已審核</span>';
    if (b === 'trusted')  return '<span class="badge badge-trusted" title="信任創作者">&#9733; 信任</span>';
    return '';
  }).join('');
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

  const followed = isFollowing(t.creator_name);
  const followCls = followed ? ' following' : '';
  const followLabel = followed ? '已追蹤' : '+ 追蹤';

  return `
    <article class="card${t.is_featured ? ' card-featured' : ''}" data-id="${t.id}">
      ${t.is_featured ? '<span class="featured-badge">精選</span>' : ''}
      <div class="card-main">
        <div class="card-head">
          <div class="card-title">
            ${esc(t.title)}
            ${badgesHtml(t.badges)}
          </div>
          ${t.cost > 0 ? `<span class="cost-chip">${t.cost} 點</span>` : `<span class="cost-chip free">免費</span>`}
        </div>
        <div class="card-desc">${esc(t.desc)}</div>
        <div class="card-meta-row">
          <span class="creator-name">by ${esc(t.creator_name)}</span>
          <button class="follow-btn${followCls}" data-creator="${esc(t.creator_name)}">${followLabel}</button>
          <span class="usage-count">${t.usage_count} 次使用</span>
        </div>
        <div class="card-tags">
          ${t.tags.map(tag => `<span class="tag" data-tag="${esc(tag)}">${esc(tag)}</span>`).join('')}
          ${t.lang ? `<span class="lang-badge">${esc(t.lang)}</span>` : ''}
        </div>
        ${starsHtml(t.id, t.avg_rating, t.rating_count)}
      </div>
      <div class="card-footer">
        <div class="card-footer-left">
          <button class="comment-toggle" data-id="${t.id}" data-title="${esc(t.title)}">
            💬 ${t.comment_count} 則留言
          </button>
          <button class="report-btn" data-type="tool" data-target="${t.id}" title="檢舉此工具">⚑</button>
        </div>
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

  // Followed creators section
  const followed = getFollowed();
  const followedSection = document.getElementById('followed-section');
  const followedGrid    = document.getElementById('followed-grid');
  if (followed.length > 0) {
    const followedTools = allTools.filter(t =>
      followed.some(f => f.toLowerCase() === t.creator_name.toLowerCase()) && matchesSearch(t)
    );
    if (followedTools.length > 0) {
      followedSection.classList.remove('hidden');
      followedGrid.innerHTML = followedTools.map(cardHtml).join('');
    } else {
      followedSection.classList.add('hidden');
      followedGrid.innerHTML = '';
    }
  } else {
    followedSection.classList.add('hidden');
    followedGrid.innerHTML = '';
  }

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
    <div class="comment-item" data-comment-id="${c.id}">
      <div class="comment-body">${esc(c.body)}</div>
      <div class="comment-time">${timeAgo(c.created_at)}</div>
      <button class="comment-report-btn" data-type="comment" data-target="${c.id}" title="檢舉此留言">⚑</button>
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
    el.dataset.commentId = comment.id;
    el.innerHTML = `<div class="comment-body">${esc(comment.body)}</div><div class="comment-time">剛剛</div><button class="comment-report-btn" data-type="comment" data-target="${comment.id}" title="檢舉此留言">⚑</button>`;
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

/* ── Report modal ──────────────────────────────────────── */
function openReportModal(targetType, targetId) {
  document.getElementById('report-target-type').value = targetType;
  document.getElementById('report-target-id').value   = targetId;
  document.getElementById('report-reason').value      = '';
  document.getElementById('report-detail').value      = '';
  document.getElementById('report-modal').classList.remove('hidden');
}

function closeReportModal() {
  document.getElementById('report-modal').classList.add('hidden');
}

document.getElementById('report-modal-close').addEventListener('click', closeReportModal);
document.querySelector('.report-modal-backdrop').addEventListener('click', closeReportModal);

document.getElementById('report-form').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = e.target.querySelector('.submit-btn');
  btn.disabled = true;
  try {
    await apiFetch('/api/reports', {
      method: 'POST',
      body: JSON.stringify({
        target_type: document.getElementById('report-target-type').value,
        target_id:   Number(document.getElementById('report-target-id').value),
        reason:      document.getElementById('report-reason').value,
        detail:      document.getElementById('report-detail').value,
      })
    });
    closeReportModal();
    alert('檢舉已送出，我們會儘快處理。');
  } catch (err) {
    alert('檢舉失敗：' + err.message);
  } finally { btn.disabled = false; }
});

/* handle report buttons in comment sheet */
document.getElementById('sheet-comments-list').addEventListener('click', e => {
  const btn = e.target.closest('.comment-report-btn');
  if (btn) openReportModal(btn.dataset.type, btn.dataset.target);
});

/* ── Guidelines modal ──────────────────────────────────── */
function openGuidelines(e) {
  if (e) e.preventDefault();
  document.getElementById('guidelines-modal').classList.remove('hidden');
}
function closeGuidelines() {
  document.getElementById('guidelines-modal').classList.add('hidden');
}
document.getElementById('guidelines-close').addEventListener('click', closeGuidelines);
document.querySelector('.guidelines-backdrop').addEventListener('click', closeGuidelines);
document.getElementById('guidelines-link').addEventListener('click', openGuidelines);
document.getElementById('privacy-link').addEventListener('click', openGuidelines);
document.getElementById('guidelines-link-submit').addEventListener('click', openGuidelines);

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

    if (tool.edit_token) {
      saveEditToken(tool.id, tool.edit_token);
    }

    e.target.reset();
    document.getElementById('desc-count').textContent = '0 / 300';

    const flash = document.getElementById('flash');
    flash.className = 'flash info';
    flash.textContent = `工具已提交！正在等待審核。${tool.edit_token ? '你的編輯密鑰已自動儲存，也可以在開發者工具 > Application > localStorage 中找到。' : ''}`;
    setTimeout(() => flash.classList.add('hidden'), 8000);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (err) {
    alert('提交失敗：' + err.message);
  } finally { btn.disabled = false; }
}

/* ── Creator Studio stats lookup ────────────────────────── */
async function lookupCreator() {
  const name = document.getElementById('creator-name-input').value.trim();
  if (!name) return;
  const box = document.getElementById('creator-stats');
  box.classList.remove('hidden');
  box.innerHTML = '<p class="loading-text">查詢中...</p>';
  try {
    const data = await apiFetch(`/api/creators/stats?name=${encodeURIComponent(name)}`);
    const rows = data.tools.map(t => {
      const statusLabel = t.status === 'active' ? '<span style="color:var(--accent)">上架中</span>'
        : t.status === 'pending' ? '<span style="color:var(--gold)">審核中</span>'
        : '<span style="color:var(--danger)">已下架</span>';
      return `<tr>
        <td>${esc(t.title)}</td>
        <td>${statusLabel}</td>
        <td>${t.cost > 0 ? t.cost + ' 點' : '免費'}</td>
        <td>${t.usage_count}</td>
        <td>${t.uses_7d}</td>
        <td>${t.uses_28d}</td>
        <td>${t.points_earned}</td>
      </tr>`;
    }).join('');

    const eligBadge = data.featured_eligible
      ? '<span class="eligibility-badge eligible">符合精選資格</span>'
      : '<span class="eligibility-badge not-eligible">尚未符合精選資格</span>';

    const strikeHtml = data.strikes > 0
      ? `<div class="strike-info"><span class="strike-count">${data.strikes} 次違規</span></div>`
      : `<div class="strike-info"><span class="strike-ok">無違規紀錄</span></div>`;

    box.innerHTML = `
      <div class="stats-summary">
        <div class="stat-item"><span class="stat-value">${data.total_uses}</span><span class="stat-label">總使用次數</span></div>
        <div class="stat-item"><span class="stat-value">${data.total_points_earned}</span><span class="stat-label">人氣指數（虛擬點數）</span></div>
        <div class="stat-item"><span class="stat-value">${data.tools.length}</span><span class="stat-label">工具數量</span></div>
      </div>
      ${strikeHtml}
      ${eligBadge}
      <table class="stats-table stats-table-gap">
        <thead><tr><th>工具</th><th>狀態</th><th>費用</th><th>使用次數</th><th>近7天</th><th>近28天</th><th>人氣指數</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
  } catch (e) {
    box.innerHTML = `<p class="error-text">${esc(e.message)}</p>`;
  }
}

/* ── Edit tool via token ────────────────────────────────── */
async function loadToolForEdit() {
  const token  = document.getElementById('edit-token-input').value.trim();
  const toolId = parseInt(document.getElementById('edit-tool-id-input').value, 10);
  if (!token || !toolId) { alert('請輸入工具 ID 和編輯密鑰'); return; }

  const panel = document.getElementById('edit-tool-panel');
  panel.classList.remove('hidden');
  panel.innerHTML = '<p class="loading-text">載入中...</p>';

  try {
    const tool = await apiFetch(`/api/tools?sort=newest`).then(tools => tools.find(t => t.id === toolId));
    if (!tool) {
      panel.innerHTML = '<p class="error-text">找不到此工具（可能還在審核中或已下架）。你仍可嘗試編輯。</p>';
    }

    const t = tool || { title: '', desc: '', url: '', tags: [], lang: '中文', cost: 0 };
    panel.innerHTML = `
      <h3>編輯工具 #${toolId}</h3>
      <form id="edit-form">
        <div class="field">
          <label>工具名稱</label>
          <input type="text" id="e-title" value="${esc(t.title)}" maxlength="80">
        </div>
        <div class="field">
          <label>簡短描述</label>
          <textarea id="e-desc" maxlength="300">${esc(t.desc)}</textarea>
        </div>
        <div class="field">
          <label>工具網址</label>
          <input type="url" id="e-url" value="${esc(t.url)}">
        </div>
        <div class="field-row">
          <div class="field">
            <label>費用（點數）</label>
            <input type="number" id="e-cost" value="${t.cost}" min="0" max="100">
          </div>
          <div class="field">
            <label>語言</label>
            <input type="text" id="e-lang" value="${esc(t.lang)}" maxlength="20">
          </div>
        </div>
        <div class="field">
          <label>標籤（逗號分隔）</label>
          <input type="text" id="e-tags" value="${esc(t.tags.join(', '))}">
        </div>
        <div class="edit-actions">
          <button type="submit" class="submit-btn">儲存變更</button>
          <button type="button" class="danger-btn" id="delete-tool-btn">刪除工具</button>
        </div>
      </form>`;

    document.getElementById('edit-form').addEventListener('submit', async ev => {
      ev.preventDefault();
      const btn = ev.target.querySelector('.submit-btn');
      btn.disabled = true;
      try {
        await apiFetch(`/api/tools/${toolId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'x-edit-token': token },
          body: JSON.stringify({
            title: document.getElementById('e-title').value.trim(),
            desc:  document.getElementById('e-desc').value.trim(),
            url:   document.getElementById('e-url').value.trim(),
            cost:  parseInt(document.getElementById('e-cost').value, 10) || 0,
            lang:  document.getElementById('e-lang').value.trim(),
            tags:  document.getElementById('e-tags').value.split(',').map(s => s.trim()).filter(Boolean),
          })
        });
        alert('工具已更新！');
        loadTools();
      } catch (err) { alert('更新失敗：' + err.message); }
      finally { btn.disabled = false; }
    });

    document.getElementById('delete-tool-btn').addEventListener('click', async () => {
      if (!confirm('確定要刪除此工具嗎？此操作無法復原。')) return;
      try {
        await apiFetch(`/api/tools/${toolId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json', 'x-edit-token': token },
        });
        alert('工具已刪除。');
        panel.innerHTML = '<p class="hint-text">工具已刪除。</p>';
        loadTools();
      } catch (err) { alert('刪除失敗：' + err.message); }
    });
  } catch (e) {
    panel.innerHTML = `<p class="error-text">${esc(e.message)}</p>`;
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
    // Comment toggle
    const toggle = e.target.closest('.comment-toggle');
    if (toggle) {
      openSheet(Number(toggle.dataset.id), toggle.dataset.title);
      return;
    }
    // Report button
    const reportBtn = e.target.closest('.report-btn');
    if (reportBtn) {
      openReportModal(reportBtn.dataset.type, reportBtn.dataset.target);
      return;
    }
    // Follow button
    const followBtn = e.target.closest('.follow-btn');
    if (followBtn) {
      const creator = followBtn.dataset.creator;
      toggleFollow(creator);
      renderAll();
      return;
    }
    // Tag chip click
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

attachGridEvents(document.getElementById('followed-grid'));
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
  if (e.key === 'Escape') { closePreview(); closeSheet(); closeReportModal(); closeGuidelines(); }
});

/* ── Submit form ────────────────────────────────────────── */
document.getElementById('submit-form').addEventListener('submit', handleSubmit);

/* ── Desc char counter ──────────────────────────────────── */
document.getElementById('f-desc').addEventListener('input', e => {
  document.getElementById('desc-count').textContent = `${e.target.value.length} / 300`;
});

/* ── Creator Studio lookup ──────────────────────────────── */
document.getElementById('creator-lookup-btn').addEventListener('click', lookupCreator);
document.getElementById('creator-name-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') lookupCreator();
});

/* ── Edit token lookup ──────────────────────────────────── */
document.getElementById('token-lookup-btn').addEventListener('click', loadToolForEdit);

/* ── Scroll-to-top ──────────────────────────────────────── */
const scrollTopBtn = document.getElementById('scroll-top');
window.addEventListener('scroll', () => {
  scrollTopBtn.classList.toggle('hidden', window.scrollY < 400);
}, { passive: true });
scrollTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

/* ── Init ───────────────────────────────────────────────── */
refreshPointsUI();
loadTools();
