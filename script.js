/* ══════════════════════════════════════════════
   GitHub Issue Tracker — app.js
   Handles: auth, theme toggle, API calls,
   tab filtering, search, card render, modals.
══════════════════════════════════════════════ */

'use strict';

/* ── Config ── */
const API_BASE  = 'https://phi-lab-server.vercel.app/api/v1/lab';
const DEMO_USER = 'admin';
const DEMO_PASS = 'admin123';

/* ── State ── */
let allIssues  = [];
let currentTab = 'all';

/* ── DOM Refs ── */
const loginPage      = document.getElementById('login-page');
const mainPage       = document.getElementById('main-page');
const loginError     = document.getElementById('login-error');
const loadingOverlay = document.getElementById('loading-overlay');
const cardsGrid      = document.getElementById('cards-grid');
const emptyState     = document.getElementById('empty-state');
const issueCount     = document.getElementById('issue-count');
const openCountLbl   = document.getElementById('open-count-label');
const closedCountLbl = document.getElementById('closed-count-label');
const modalOverlay   = document.getElementById('modal-overlay');
const newIssueOverlay= document.getElementById('new-issue-overlay');
const themeToggle    = document.getElementById('theme-toggle');
const themeIcon      = document.getElementById('theme-icon');


/* ════════════════════════════════
   THEME TOGGLE
   One toggle switches data-theme
   on <html>; all CSS vars update.
════════════════════════════════ */
function getTheme()       { return document.documentElement.getAttribute('data-theme'); }
function setTheme(theme)  {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('it-theme', theme);
  themeIcon.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
}

// Restore saved theme on load
(function initTheme() {
  const saved = localStorage.getItem('it-theme') || 'dark';
  setTheme(saved);
})();

themeToggle.addEventListener('click', () => {
  setTheme(getTheme() === 'dark' ? 'light' : 'dark');
});


/* ════════════════════════════════
   AUTH
════════════════════════════════ */
function doLogin() {
  const u = document.getElementById('username').value.trim();
  const p = document.getElementById('password').value.trim();

  if (u === DEMO_USER && p === DEMO_PASS) {
    loginError.style.display = 'none';
    loginPage.style.display  = 'none';
    mainPage.style.display   = 'block';
    loadIssues();
  } else {
    loginError.style.display = 'block';
  }
}

document.getElementById('signin-btn').addEventListener('click', doLogin);
document.getElementById('username').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
document.getElementById('password').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });

document.getElementById('logout-btn').addEventListener('click', () => {
  mainPage.style.display  = 'none';
  loginPage.style.display = 'flex';
  document.getElementById('username').value = '';
  document.getElementById('password').value = '';
  allIssues  = [];
  currentTab = 'all';
});


/* ════════════════════════════════
   LOADING SPINNER
════════════════════════════════ */
function showLoading() { loadingOverlay.classList.add('active'); }
function hideLoading() { loadingOverlay.classList.remove('active'); }


/* ════════════════════════════════
   API — FETCH ALL ISSUES
════════════════════════════════ */
async function loadIssues() {
  showLoading();
  try {
    const res  = await fetch(`${API_BASE}/issues`);
    const data = await res.json();
    allIssues  = Array.isArray(data) ? data : (data.issues || data.data || []);
    updateCounts();
    renderCards(filtered());
  } catch (err) {
    console.error('Failed to load issues:', err);
    renderCards([]);
  }
  hideLoading();
}


/* ════════════════════════════════
   API — SEARCH
════════════════════════════════ */
async function doSearch(q) {
  if (!q.trim()) {
    renderCards(filtered());
    issueCount.textContent = filtered().length;
    return;
  }
  showLoading();
  try {
    const res     = await fetch(`${API_BASE}/issues/search?q=${encodeURIComponent(q)}`);
    const data    = await res.json();
    const results = Array.isArray(data) ? data : (data.issues || data.data || []);
    renderCards(results);
    issueCount.textContent = results.length;
  } catch (err) {
    console.error('Search failed:', err);
    renderCards([]);
  }
  hideLoading();
}

document.getElementById('search-btn').addEventListener('click', () => {
  doSearch(document.getElementById('search-input').value);
});
document.getElementById('search-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') doSearch(document.getElementById('search-input').value);
});


/* ════════════════════════════════
   TABS
════════════════════════════════ */
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.className = 'tab-btn');
    currentTab = btn.dataset.tab;
    btn.classList.add(`active-${currentTab}`);
    document.getElementById('search-input').value = '';
    const items = filtered();
    renderCards(items);
    issueCount.textContent = items.length;
  });
});

function filtered() {
  if (currentTab === 'all') return allIssues;
  return allIssues.filter(i =>
    (i.state || i.status || '').toLowerCase() === currentTab
  );
}

function updateCounts() {
  const open   = allIssues.filter(i => (i.state || i.status || '').toLowerCase() === 'open').length;
  const closed = allIssues.filter(i => (i.state || i.status || '').toLowerCase() === 'closed').length;
  issueCount.textContent    = allIssues.length;
  openCountLbl.textContent  = `${open} Open`;
  closedCountLbl.textContent= `${closed} Closed`;
}


/* ════════════════════════════════
   RENDER CARDS
════════════════════════════════ */
function renderCards(issues) {
  cardsGrid.innerHTML = '';

  if (!issues.length) {
    emptyState.style.display = 'block';
    issueCount.textContent   = 0;
    return;
  }

  emptyState.style.display = 'none';
  issueCount.textContent   = issues.length;

  issues.forEach((issue, idx) => {
    const status   = (issue.state || issue.status || 'open').toLowerCase();
    const isOpen   = status === 'open';
    const priority = (issue.priority || '').toLowerCase();
    const label    = issue.label || issue.labels || '';
    const author   = issue.author || issue.user?.login || issue.created_by || 'Unknown';
    const createdAt= issue.created_at || issue.createdAt || '';
    const date     = createdAt
      ? new Date(createdAt).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })
      : '';
    const initials = author.substring(0, 2).toUpperCase();

    const card = document.createElement('div');
    card.className = 'issue-card';
    card.style.animationDelay = `${idx * 0.04}s`;

    card.innerHTML = `
      <div class="card-top-border ${isOpen ? 'open' : 'closed'}"></div>
      <div class="card-body">
        <div class="card-title">${escHtml(issue.title || 'Untitled')}</div>
        <div class="card-description">${escHtml(issue.description || issue.body || 'No description provided.')}</div>
        <div class="card-meta">
          <span class="badge ${isOpen ? 'badge-open' : 'badge-closed'}">
            <i class="fa-solid ${isOpen ? 'fa-circle-dot' : 'fa-circle-check'}"></i>
            ${isOpen ? 'Open' : 'Closed'}
          </span>
          ${priority ? `<span class="badge badge-${priorityClass(priority)}">${capitalize(priority)}</span>` : ''}
          ${label    ? `<span class="badge badge-label"><i class="fa-solid fa-tag"></i> ${escHtml(labelText(label))}</span>` : ''}
        </div>
      </div>
      <div class="card-footer">
        <div class="card-author">
          <span class="avatar-sm">${initials}</span>
          ${escHtml(author)}
        </div>
        <span class="card-date">${date}</span>
      </div>
    `;

    card.addEventListener('click', () => openDetailModal(issue));
    cardsGrid.appendChild(card);
  });
}


/* ════════════════════════════════
   ISSUE DETAIL MODAL
════════════════════════════════ */
async function openDetailModal(issue) {
  let full = issue;
  const id = issue.id || issue.number;

  if (id) {
    try {
      const res  = await fetch(`${API_BASE}/issue/${id}`);
      const data = await res.json();
      full = data.issue || data.data || data || issue;
    } catch (e) { /* use card data as fallback */ }
  }

  const status   = (full.state || full.status || 'open').toLowerCase();
  const isOpen   = status === 'open';
  const priority = full.priority || '—';
  const label    = full.label || full.labels || '—';
  const author   = full.author || full.user?.login || full.created_by || 'Unknown';
  const createdAt= full.created_at || full.createdAt || '';
  const date     = createdAt
    ? new Date(createdAt).toLocaleString('en-US', { dateStyle:'medium', timeStyle:'short' })
    : '—';

  document.getElementById('modal-top-border').className = `modal-top-border ${isOpen ? 'open' : 'closed'}`;
  document.getElementById('modal-title').textContent    = full.title || 'Untitled';
  document.getElementById('modal-desc').textContent     = full.description || full.body || 'No description provided.';

  document.getElementById('modal-meta').innerHTML = `
    <div class="meta-item">
      <div class="meta-label">Status</div>
      <div class="meta-value">
        <span class="badge ${isOpen ? 'badge-open' : 'badge-closed'}">
          <i class="fa-solid ${isOpen ? 'fa-circle-dot' : 'fa-circle-check'}"></i>
          ${isOpen ? 'Open' : 'Closed'}
        </span>
      </div>
    </div>
    <div class="meta-item">
      <div class="meta-label">Author</div>
      <div class="meta-value" style="display:flex;align-items:center;gap:6px;">
        <span class="avatar-sm">${author.substring(0,2).toUpperCase()}</span>
        ${escHtml(author)}
      </div>
    </div>
    <div class="meta-item">
      <div class="meta-label">Priority</div>
      <div class="meta-value">
        ${priority !== '—'
          ? `<span class="badge badge-${priorityClass(priority.toLowerCase())}">${capitalize(priority)}</span>`
          : '—'}
      </div>
    </div>
    <div class="meta-item">
      <div class="meta-label">Label</div>
      <div class="meta-value">
        ${label !== '—'
          ? `<span class="badge badge-label"><i class="fa-solid fa-tag"></i> ${escHtml(labelText(label))}</span>`
          : '—'}
      </div>
    </div>
    <div class="meta-item" style="grid-column:1/-1;">
      <div class="meta-label">Created At</div>
      <div class="meta-value" style="font-family:'JetBrains Mono',monospace;font-size:12px;">${date}</div>
    </div>
    ${full.number ? `
    <div class="meta-item">
      <div class="meta-label">Issue #</div>
      <div class="meta-value" style="font-family:'JetBrains Mono',monospace;">#${full.number}</div>
    </div>` : ''}
  `;

  modalOverlay.classList.add('active');
}

document.getElementById('modal-close').addEventListener('click', () => modalOverlay.classList.remove('active'));
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) modalOverlay.classList.remove('active'); });


/* ════════════════════════════════
   NEW ISSUE MODAL
════════════════════════════════ */
document.getElementById('new-issue-btn').addEventListener('click', () => {
  document.getElementById('ni-title').value    = '';
  document.getElementById('ni-desc').value     = '';
  document.getElementById('ni-priority').value = 'medium';
  document.getElementById('ni-label').value    = '';
  document.getElementById('ni-error').style.display = 'none';
  newIssueOverlay.classList.add('active');
});

document.getElementById('new-issue-close').addEventListener('click', () => newIssueOverlay.classList.remove('active'));
newIssueOverlay.addEventListener('click', e => { if (e.target === newIssueOverlay) newIssueOverlay.classList.remove('active'); });

document.getElementById('ni-submit').addEventListener('click', () => {
  const title    = document.getElementById('ni-title').value.trim();
  const desc     = document.getElementById('ni-desc').value.trim();
  const priority = document.getElementById('ni-priority').value;
  const label    = document.getElementById('ni-label').value.trim();

  if (!title) {
    document.getElementById('ni-error').style.display = 'block';
    return;
  }
  document.getElementById('ni-error').style.display = 'none';

  // Add to local state (no write API available)
  const newIssue = {
    id:          Date.now(),
    title,
    description: desc,
    state:       'open',
    priority,
    label,
    author:      'admin',
    created_at:  new Date().toISOString(),
  };

  allIssues.unshift(newIssue);
  updateCounts();
  renderCards(filtered());
  newIssueOverlay.classList.remove('active');
});


/* ════════════════════════════════
   KEYBOARD GLOBAL
════════════════════════════════ */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    modalOverlay.classList.remove('active');
    newIssueOverlay.classList.remove('active');
  }
});


/* ════════════════════════════════
   HELPERS
════════════════════════════════ */
function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

function priorityClass(p) {
  if (p === 'high')   return 'high';
  if (p === 'medium') return 'medium';
  return 'low';
}

function labelText(label) {
  return Array.isArray(label) ? label.join(', ') : String(label);
}
