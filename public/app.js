/* ── State ──────────────────────────────────────────────── */
let allTools    = [];
let activeTag   = '';
let activeSort  = 'newest';
let searchQuery = '';

/* ── localStorage helpers ───────────────────────────────── */
function getRated()   { return JSON.parse(localStorage.getItem('rated_tools')   || '{}'); }
function getMyStars() { return JSON.parse(localStorage.getItem('my_stars')      || '{}'); }
function markRated(id, stars) {
  const r = getRated();   r[id] = true;    localStorage.setItem('rated_tools', JSON.stringify(r));
  const s = getMyStars(); s[id] = stars;   localStorage.setItem('my_stars',    JSON.stringify(s));
}
function hasRated(id) { return !!getRated()[id]; }
function myStars(id)  { return getMyStars()[id] || 0; }

/* ── Utils ──────────────────────────────────────────────── */
function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function timeAgo(ts) {
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 60)   return '剛剛';
  if (diff < 3600) return Math.floor(diff/60)   + ' 分鐘前';
  if (diff < 86400)return Math.floor(diff/3600) + ' 小時前';
  return Math.floor(diff/86400) + ' 天前';
}

/* ── API calls ──────────────────────────────────────────── */
async function apiFetch(path, opts = {}) {
  const res = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...opts });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || res.statusText); }
  return res.json();
}

async function loadTools() {
  const params = new URLSearchParams({ sort: activeSort });
  if (activeTag) params.set('tag', activeTag);
  allTools = await apiFetch(`/api/tools?${params}`);
  renderAll();
}

/* ── Tag filters ────────────────────────────────────────── */
function buildTagFilters() {
  const tags = [...new Set(allTools.flatMap(t => t.tags))].sort();
  const wrap = document.getElementById('tag-filters');
  wrap.innerHTML = `<button class="tag-btn ${activeTag===''?'active':''}" data-tag="">全部</button>`
    + tags.map(t => `<button class="tag-btn ${activeTag===t?'active':''}" data-tag="${esc(t)}">${esc(t)}</button>`).join('');
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
    ? `<span class="rating-info"><b>${avgRating}</b> (${ratingCount} 人評分)</span>`
    : `<span class="rating-info">尚無評分</span>`;
  const note = rated ? `<span class="rating-note">已評分</span>` : '';
  return `
    <div class="card-rating">
      <div class="stars${disabled}" data-id="${toolId}">${stars}</div>
      ${info}${note}
    </div>`;
}

/* ── Render tools ───────────────────────────────────────── */
function renderAll() {
  buildTagFilters();

  const q = searchQuery.toLowerCase().trim();
  const filtered = q
    ? allTools.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.desc.toLowerCase().includes(q) ||
        t.tags.some(tag => tag.toLowerCase().includes(q))
      )
    : allTools;

  document.getElementById('tool-count').textContent  = filtered.length + ' 個工具';
  document.getElementById('header-count').textContent = allTools.length + ' 個工具';

  const grid = document.getElementById('tool-grid');
  if (filtered.length === 0) {
    grid.innerHTML = `<div class="empty"><span>🔍</span>${q ? '找不到符合「'+esc(q)+'」的工具' : '還沒有工具，快來提交第一個！'}</div>`;
    return;
  }

  grid.innerHTML = filtered.map(t => `
    <article class="card" data-id="${t.id}">
      <div class="card-main">
        <div class="card-title">${esc(t.title)}</div>
        <div class="card-desc">${esc(t.desc)}</div>
        <div class="card-tags">
          ${t.tags.map(tag => `<span class="tag">${esc(tag)}</span>`).join('')}
          ${t.lang ? `<span class="lang-badge">${esc(t.lang)}</span>` : ''}
        </div>
        ${starsHtml(t.id, t.avg_rating, t.rating_count)}
      </div>
      <div class="card-footer">
        <button class="comment-toggle" data-id="${t.id}">
          💬 ${t.comment_count} 則留言
        </button>
        <button class="try-btn preview-btn" data-url="${esc(t.url)}" data-title="${esc(t.title)}">立即試用 →</button>
      </div>
      <div class="comments-panel" id="comments-${t.id}"></div>
    </article>
  `).join('');
}

/* ── Comments panel ─────────────────────────────────────── */
async function openComments(toolId) {
  const panel = document.getElementById(`comments-${toolId}`);
  if (panel.classList.contains('open')) { panel.classList.remove('open'); return; }

  panel.classList.add('open');
  panel.innerHTML = `<div class="comments-list"><div class="no-comments">載入中...</div></div>`;

  const comments = await apiFetch(`/api/comments/${toolId}`).catch(() => []);
  const listHtml = comments.length === 0
    ? `<div class="no-comments">還沒有留言，來第一個吧！</div>`
    : comments.map(c => `
        <div class="comment-item">
          <div class="comment-body">${esc(c.body)}</div>
          <div class="comment-time">${timeAgo(c.created_at)}</div>
        </div>`).join('');

  panel.innerHTML = `
    <div class="comments-list">${listHtml}</div>
    <div class="comment-form">
      <input class="comment-input" type="text" placeholder="留下你的想法..." maxlength="500">
      <button class="comment-submit" data-id="${toolId}">送出</button>
    </div>`;
}

async function postComment(toolId, input) {
  const body = input.value.trim();
  if (!body) return;
  input.disabled = true;
  try {
    const comment = await apiFetch(`/api/comments/${toolId}`, {
      method: 'POST', body: JSON.stringify({ body })
    });
    const panel = document.getElementById(`comments-${toolId}`);
    const list  = panel.querySelector('.comments-list');
    const noMsg = list.querySelector('.no-comments');
    if (noMsg) noMsg.remove();
    const el = document.createElement('div');
    el.className = 'comment-item';
    el.innerHTML = `<div class="comment-body">${esc(comment.body)}</div><div class="comment-time">剛剛</div>`;
    list.prepend(el);
    input.value = '';

    // Update comment count on card footer toggle
    const toggle = document.querySelector(`.comment-toggle[data-id="${toolId}"]`);
    if (toggle) {
      const tool = allTools.find(t => t.id === toolId);
      if (tool) { tool.comment_count++; toggle.textContent = `💬 ${tool.comment_count} 則留言`; }
    }
  } catch (e) { alert('留言失敗：' + e.message); }
  finally { input.disabled = false; input.focus(); }
}

/* ── Rating ─────────────────────────────────────────────── */
async function submitRating(toolId, stars) {
  if (hasRated(toolId)) return;
  markRated(toolId, stars);

  try {
    const agg = await apiFetch(`/api/ratings/${toolId}`, {
      method: 'POST', body: JSON.stringify({ stars })
    });
    // Update local data and re-render just this card's rating section
    const tool = allTools.find(t => t.id === toolId);
    if (tool) { tool.avg_rating = agg.avg_rating; tool.rating_count = agg.rating_count; }
    const card = document.querySelector(`.card[data-id="${toolId}"]`);
    if (card) {
      const ratingEl = card.querySelector('.card-rating');
      if (ratingEl) ratingEl.outerHTML = starsHtml(toolId, agg.avg_rating, agg.rating_count);
    }
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

  // Load iframe; detect failure via timeout (X-Frame-Options is silent)
  let loaded = false;
  iframe.onload = () => { loaded = true; };
  iframe.src = url;
  setTimeout(() => {
    if (!loaded) {
      iframe.style.display = 'none';
      fallback.classList.remove('hidden');
    }
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
        title: document.getElementById('f-title').value.trim(),
        desc:  document.getElementById('f-desc').value.trim(),
        url:   document.getElementById('f-url').value.trim(),
        lang:  document.getElementById('f-lang').value,
        tags,
      })
    });
    allTools.unshift(tool);
    searchQuery = '';
    document.getElementById('search').value = '';
    renderAll();
    e.target.reset();
    const flash = document.getElementById('flash');
    flash.classList.remove('hidden');
    setTimeout(() => flash.classList.add('hidden'), 4000);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (err) {
    alert('提交失敗：' + err.message);
  } finally {
    btn.disabled = false;
  }
}

/* ── Event delegation ───────────────────────────────────── */
document.getElementById('tool-grid').addEventListener('click', async e => {
  // Star rating
  const star = e.target.closest('.star');
  if (star) {
    const starsEl = star.closest('.stars');
    if (!starsEl || starsEl.classList.contains('disabled')) return;
    const toolId = Number(starsEl.dataset.id);
    const stars  = Number(star.dataset.v);
    await submitRating(toolId, stars);
    return;
  }
  // Comment toggle
  const toggle = e.target.closest('.comment-toggle');
  if (toggle) { await openComments(Number(toggle.dataset.id)); return; }

  // Comment submit
  const commentBtn = e.target.closest('.comment-submit');
  if (commentBtn) {
    const toolId = Number(commentBtn.dataset.id);
    const input  = commentBtn.closest('.comment-form').querySelector('.comment-input');
    await postComment(toolId, input);
    return;
  }
  // Preview button
  const previewBtn = e.target.closest('.preview-btn');
  if (previewBtn) { openPreview(previewBtn.dataset.url, previewBtn.dataset.title); }
});

// Comment input enter key
document.getElementById('tool-grid').addEventListener('keydown', async e => {
  if (e.key !== 'Enter') return;
  const input = e.target.closest('.comment-input');
  if (!input) return;
  const btn = input.closest('.comment-form').querySelector('.comment-submit');
  await postComment(Number(btn.dataset.id), input);
});

// Stars hover effect (pure JS, handles hover-before logic)
document.getElementById('tool-grid').addEventListener('mouseover', e => {
  const star = e.target.closest('.star');
  if (!star) return;
  const starsEl = star.closest('.stars');
  if (!starsEl || starsEl.classList.contains('disabled')) return;
  const v = Number(star.dataset.v);
  starsEl.querySelectorAll('.star').forEach(s => {
    s.classList.toggle('on', Number(s.dataset.v) <= v);
  });
});
document.getElementById('tool-grid').addEventListener('mouseout', e => {
  const starsEl = e.target.closest('.stars');
  if (!starsEl || starsEl.classList.contains('disabled')) return;
  // If leaving the entire stars widget, restore to rated/avg state
  if (!starsEl.contains(e.relatedTarget)) {
    const toolId = Number(starsEl.dataset.id);
    const rated  = hasRated(toolId);
    const filled = rated ? myStars(toolId) : Math.round(allTools.find(t=>t.id===toolId)?.avg_rating||0);
    starsEl.querySelectorAll('.star').forEach(s => {
      s.classList.toggle('on', Number(s.dataset.v) <= filled);
    });
  }
});

// Tag filter
document.getElementById('tag-filters').addEventListener('click', e => {
  const btn = e.target.closest('.tag-btn');
  if (!btn) return;
  activeTag = btn.dataset.tag;
  document.querySelectorAll('.tag-btn').forEach(b => b.classList.toggle('active', b.dataset.tag === activeTag));
  loadTools();
});

// Sort
document.querySelector('.sort-btns').addEventListener('click', e => {
  const btn = e.target.closest('.sort-btn');
  if (!btn) return;
  activeSort = btn.dataset.sort;
  document.querySelectorAll('.sort-btn').forEach(b => b.classList.toggle('active', b.dataset.sort === activeSort));
  loadTools();
});

// Search
document.getElementById('search').addEventListener('input', e => {
  searchQuery = e.target.value;
  renderAll();
});

// Modal close
document.getElementById('modal-close').addEventListener('click', closePreview);
document.getElementById('modal-backdrop').addEventListener('click', closePreview);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closePreview(); });

// Submit form
document.getElementById('submit-form').addEventListener('submit', handleSubmit);

/* ── Init ───────────────────────────────────────────────── */
loadTools();
