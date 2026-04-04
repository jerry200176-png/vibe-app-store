let adminKey = '';

function adminFetch(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', 'x-admin-key': adminKey, ...(opts.headers || {}) };
  return fetch(path, { ...opts, headers }).then(async r => {
    if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || r.statusText); }
    return r.json();
  });
}

function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

async function moderateTool(id, action) {
  const reason = action === 'reject' ? prompt('拒絕原因（選填）：', '') : '';
  try {
    await adminFetch(`/api/admin/tools/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ action, reason: reason || action }),
    });
    loadAll();
  } catch (e) { alert('操作失敗：' + e.message); }
}

async function resolveReport(id, action) {
  try {
    await adminFetch(`/api/admin/reports/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ action }),
    });
    loadAll();
  } catch (e) { alert('操作失敗：' + e.message); }
}

async function loadAll() {
  try {
    const [stats, tools, reports, violations] = await Promise.all([
      adminFetch('/api/admin/stats'),
      adminFetch('/api/admin/tools/pending'),
      adminFetch('/api/admin/reports'),
      adminFetch('/api/admin/violations'),
    ]);

    document.getElementById('admin-content').classList.remove('admin-hidden');

    document.getElementById('dash-cards').innerHTML = `
      <div class="stat-item dash-card"><span class="stat-value">${stats.pending_tools}</span><span class="stat-label">待審核</span></div>
      <div class="stat-item dash-card"><span class="stat-value">${stats.pending_reports}</span><span class="stat-label">待處理檢舉</span></div>
      <div class="stat-item dash-card"><span class="stat-value">${stats.total_violations}</span><span class="stat-label">累計違規</span></div>
      <div class="stat-item dash-card"><span class="stat-value">${stats.total_tools}</span><span class="stat-label">總工具數</span></div>`;

    const pt = document.getElementById('pending-tools');
    pt.innerHTML = tools.length === 0 ? '<p class="empty-admin">沒有待審核的工具。</p>' :
      tools.map(t => `
        <div class="admin-item" data-id="${t.id}">
          <div class="admin-item-head">
            <span class="admin-item-title">${esc(t.title)}</span>
            <span class="admin-item-meta">#${t.id} · ${esc(t.creator_name)}</span>
          </div>
          <div class="admin-item-desc">${esc(t.desc)}</div>
          <div class="admin-item-meta" style="margin-bottom:8px">
            <a href="${esc(t.url)}" target="_blank" rel="noopener">${esc(t.url)}</a>
          </div>
          <div class="admin-item-actions">
            <button class="admin-btn approve" data-action="approve" data-id="${t.id}">核准上架</button>
            <button class="admin-btn reject" data-action="reject" data-id="${t.id}">拒絕</button>
          </div>
        </div>`).join('');

    pt.addEventListener('click', e => {
      const btn = e.target.closest('[data-action]');
      if (btn) moderateTool(Number(btn.dataset.id), btn.dataset.action);
    });

    const pr = document.getElementById('pending-reports');
    pr.innerHTML = reports.length === 0 ? '<p class="empty-admin">沒有待處理的檢舉。</p>' :
      reports.map(r => `
        <div class="admin-item" data-id="${r.id}">
          <div class="admin-item-head">
            <span class="admin-item-title">${esc(r.target_type)} #${r.target_id}</span>
            <span class="admin-item-meta">原因: ${esc(r.reason)}</span>
          </div>
          ${r.detail ? `<div class="admin-item-desc">${esc(r.detail)}</div>` : ''}
          <div class="admin-item-actions">
            <button class="admin-btn approve" data-raction="resolve" data-rid="${r.id}">確認違規</button>
            <button class="admin-btn dismiss" data-raction="dismiss" data-rid="${r.id}">駁回</button>
          </div>
        </div>`).join('');

    pr.addEventListener('click', e => {
      const btn = e.target.closest('[data-raction]');
      if (btn) resolveReport(Number(btn.dataset.rid), btn.dataset.raction);
    });

    const vl = document.getElementById('violations-list');
    vl.innerHTML = violations.length === 0 ? '<p class="empty-admin">沒有違規紀錄。</p>' :
      violations.map(v => `
        <div class="admin-item">
          <div class="admin-item-head">
            <span class="admin-item-title">${esc(v.creator_name)}</span>
            <span class="admin-item-meta">工具 #${v.tool_id || '-'}</span>
          </div>
          <div class="admin-item-desc">原因: ${esc(v.reason)}</div>
        </div>`).join('');

  } catch (e) {
    alert('載入失敗：' + e.message);
  }
}

document.getElementById('admin-login-btn').addEventListener('click', () => {
  adminKey = document.getElementById('admin-key').value.trim();
  if (!adminKey) return;
  loadAll();
});
document.getElementById('admin-key').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('admin-login-btn').click();
});
