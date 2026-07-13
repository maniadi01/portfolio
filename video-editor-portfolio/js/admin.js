/**
 * Admin dashboard: auth gate, add/edit/delete videos, reordering,
 * and the contact-message inbox. Everything here requires a signed-in
 * Supabase session — enforced both here and by the RLS policies in
 * supabase/schema.sql (this file alone is not the security boundary).
 */

let EDITING_ID = null;
let PARSED = null;
let VIDEOS_CACHE = [];
let MESSAGES_CACHE = [];

document.addEventListener('DOMContentLoaded', async () => {
  if (!SUPABASE_CONFIGURED) {
    const err = document.getElementById('loginError');
    err.textContent = "Supabase isn't connected yet — add your project keys to js/config.js first.";
    err.classList.add('show', 'error');
    document.getElementById('loginSubmit').disabled = true;
    return;
  }

  initTabs();
  initLoginForm();
  initSignOut();
  initVideoForm();

  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) enterDashboard(session);

  supabaseClient.auth.onAuthStateChange((event, newSession) => {
    if (event === 'SIGNED_IN' && newSession) enterDashboard(newSession);
    if (event === 'SIGNED_OUT') exitDashboard();
  });
});

/* ---------- Auth ---------- */
function enterDashboard(session) {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('adminShell').style.display = 'block';
  document.getElementById('loggedInAs').textContent = session.user.email;
  loadVideosTable();
  loadMessagesTable();
}

function exitDashboard() {
  document.getElementById('adminShell').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
}

function initLoginForm() {
  const form = document.getElementById('loginForm');
  const errorEl = document.getElementById('loginError');
  const submitBtn = document.getElementById('loginSubmit');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.className = 'form-msg';
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Signing in…';

    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

    submitBtn.disabled = false;
    submitBtn.textContent = 'Sign In';

    if (error) {
      errorEl.textContent = error.message || 'Sign in failed — check your email and password.';
      errorEl.classList.add('show', 'error');
    }
  });
}

function initSignOut() {
  document.getElementById('signOutBtn').addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
  });
}

/* ---------- Tabs ---------- */
function initTabs() {
  const tabs = document.querySelectorAll('.admin-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
      document.getElementById('panel-' + tab.dataset.tab).classList.add('active');
    });
  });
}

/* ---------- URL parsing + thumbnail lookup ---------- */
function parseVideoUrl(url) {
  url = url.trim();

  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return { platform: 'youtube', id: ytMatch[1] };

  // Captures the numeric ID and, if present, the privacy hash Vimeo
  // appends for unlisted videos (vimeo.com/123456789/abcd1234ef).
  const vimeoMatch = url.match(/vimeo\.com\/(?:.*\/)?(\d+)(?:\/([a-z0-9]+))?/i);
  if (vimeoMatch) {
    const id = vimeoMatch[2] ? `${vimeoMatch[1]}/${vimeoMatch[2]}` : vimeoMatch[1];
    return { platform: 'vimeo', id };
  }

  return null;
}

function resolveYoutubeThumb(id) {
  return new Promise((resolve) => {
    const maxres = `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
    const hq = `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
    const img = new Image();
    img.onload = () => resolve(img.naturalWidth > 120 ? maxres : hq);
    img.onerror = () => resolve(hq);
    img.src = maxres;
  });
}

async function fetchThumbnail(platform, id) {
  if (platform === 'youtube') return resolveYoutubeThumb(id);
  if (platform === 'vimeo') {
    try {
      const res = await fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent('https://vimeo.com/' + id)}`);
      if (!res.ok) throw new Error('oEmbed request failed');
      const data = await res.json();
      return data.thumbnail_url || null;
    } catch (e) {
      console.error(e);
      return null;
    }
  }
  return null;
}

/* ---------- Add / edit video form ---------- */
function initVideoForm() {
  const urlInput = document.getElementById('vUrl');
  const statusEl = document.getElementById('vUrlStatus');
  const previewEl = document.getElementById('vThumbPreview');
  let debounceTimer;

  urlInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => handleUrlParse(urlInput.value), 400);
  });

  async function handleUrlParse(url) {
    if (!url.trim()) {
      PARSED = null;
      statusEl.textContent = '';
      previewEl.classList.remove('show');
      return;
    }
    const parsed = parseVideoUrl(url);
    if (!parsed) {
      PARSED = null;
      statusEl.textContent = "Couldn't recognize that as a YouTube or Vimeo link.";
      previewEl.classList.remove('show');
      return;
    }
    const label = parsed.platform === 'youtube' ? 'YouTube' : 'Vimeo';
    statusEl.textContent = `Detected: ${label} · fetching thumbnail…`;
    const thumb = await fetchThumbnail(parsed.platform, parsed.id);
    PARSED = { ...parsed, thumbnail: thumb, url };
    if (thumb) {
      previewEl.innerHTML = `<img src="${thumb}" alt="">`;
      previewEl.classList.add('show');
      statusEl.textContent = `Detected: ${label} ✓`;
    } else {
      previewEl.classList.remove('show');
      statusEl.textContent = `Detected: ${label} (no thumbnail found — that's fine, it'll still work)`;
    }
  }

  document.getElementById('videoForm').addEventListener('submit', submitVideoForm);
  document.getElementById('videoFormCancel').addEventListener('click', resetVideoForm);
}

async function submitVideoForm(e) {
  e.preventDefault();
  const msgEl = document.getElementById('videoFormMsg');
  const submitBtn = document.getElementById('videoFormSubmit');
  msgEl.className = 'form-msg';

  const title = document.getElementById('vTitle').value.trim();
  const description = document.getElementById('vDescription').value.trim();
  const category = document.getElementById('vCategory').value.trim() || 'General';
  const client = document.getElementById('vClient').value.trim();
  const yearRaw = document.getElementById('vYear').value;
  const year = yearRaw ? parseInt(yearRaw, 10) : null;
  const order = parseInt(document.getElementById('vOrder').value || '0', 10);
  const featured = document.getElementById('vFeatured').checked;
  const urlValue = document.getElementById('vUrl').value.trim();

  let parsed = PARSED && PARSED.url === urlValue ? PARSED : null;
  if (!parsed) {
    const quick = parseVideoUrl(urlValue);
    if (!quick) {
      msgEl.textContent = "That doesn't look like a valid YouTube or Vimeo URL.";
      msgEl.classList.add('show', 'error');
      return;
    }
    const thumb = await fetchThumbnail(quick.platform, quick.id);
    parsed = { ...quick, thumbnail: thumb, url: urlValue };
  }

  const payload = {
    title,
    description,
    category,
    platform: parsed.platform,
    video_id: parsed.id,
    video_url: urlValue,
    thumbnail_url: parsed.thumbnail,
    client,
    year,
    featured,
    display_order: isNaN(order) ? 0 : order,
  };

  submitBtn.disabled = true;
  const originalLabel = submitBtn.textContent;
  submitBtn.innerHTML = '<span class="spinner"></span> Saving…';

  try {
    let error;
    if (EDITING_ID) {
      ({ error } = await supabaseClient.from('videos').update(payload).eq('id', EDITING_ID));
    } else {
      ({ error } = await supabaseClient.from('videos').insert([payload]));
    }
    if (error) throw error;

    msgEl.textContent = EDITING_ID ? 'Video updated.' : 'Video added — check the Manage tab or your live site.';
    msgEl.classList.add('show', 'success');
    resetVideoForm();
    loadVideosTable();
  } catch (err) {
    console.error(err);
    msgEl.textContent = err.message || 'Something went wrong saving that video.';
    msgEl.classList.add('show', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalLabel;
  }
}

function resetVideoForm() {
  document.getElementById('videoForm').reset();
  document.getElementById('vThumbPreview').classList.remove('show');
  document.getElementById('vUrlStatus').textContent = '';
  document.getElementById('videoFormCancel').style.display = 'none';
  document.getElementById('videoFormSubmit').textContent = 'Add Video';
  document.getElementById('formTitle').textContent = 'Add a new video';
  EDITING_ID = null;
  PARSED = null;
}

/* ---------- Manage videos table ---------- */
async function loadVideosTable() {
  const tbody = document.getElementById('videosTableBody');
  tbody.innerHTML = `<tr class="empty-row"><td colspan="7">Loading…</td></tr>`;

  const { data, error } = await supabaseClient
    .from('videos')
    .select('*')
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="7">Couldn't load videos: ${escapeHtml(error.message)}</td></tr>`;
    return;
  }

  VIDEOS_CACHE = data || [];

  if (VIDEOS_CACHE.length === 0) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="7">No videos yet — add your first one above.</td></tr>`;
    return;
  }

  tbody.innerHTML = VIDEOS_CACHE.map(v => `
    <tr data-id="${v.id}">
      <td><img src="${v.thumbnail_url || ''}" alt=""></td>
      <td class="title-cell">${escapeHtml(v.title)}<span>${escapeHtml(v.category)}</span></td>
      <td>${escapeHtml(v.client || '—')}</td>
      <td>${v.year || '—'}</td>
      <td><input type="number" class="order-input" value="${v.display_order}" data-action="order"></td>
      <td><input type="checkbox" data-action="featured" ${v.featured ? 'checked' : ''}></td>
      <td>
        <button class="icon-btn" data-action="edit" type="button">Edit</button>
        <button class="icon-btn danger" data-action="delete" type="button">Delete</button>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('tr[data-id]').forEach(row => {
    const id = row.dataset.id;
    row.querySelector('[data-action="edit"]').addEventListener('click', () => editVideo(id));
    row.querySelector('[data-action="delete"]').addEventListener('click', () => deleteVideo(id));
    row.querySelector('[data-action="order"]').addEventListener('change', (e) => updateOrder(id, e.target.value));
    row.querySelector('[data-action="featured"]').addEventListener('change', (e) => updateFeatured(id, e.target.checked));
  });
}

function editVideo(id) {
  const v = VIDEOS_CACHE.find(x => String(x.id) === String(id));
  if (!v) return;

  document.getElementById('vUrl').value = v.video_url;
  document.getElementById('vTitle').value = v.title;
  document.getElementById('vDescription').value = v.description || '';
  document.getElementById('vCategory').value = v.category;
  document.getElementById('vClient').value = v.client || '';
  document.getElementById('vYear').value = v.year || '';
  document.getElementById('vOrder').value = v.display_order;
  document.getElementById('vFeatured').checked = !!v.featured;

  const previewEl = document.getElementById('vThumbPreview');
  if (v.thumbnail_url) {
    previewEl.innerHTML = `<img src="${v.thumbnail_url}" alt="">`;
    previewEl.classList.add('show');
  } else {
    previewEl.classList.remove('show');
  }
  document.getElementById('vUrlStatus').textContent = `Detected: ${v.platform === 'youtube' ? 'YouTube' : 'Vimeo'} ✓`;

  EDITING_ID = v.id;
  PARSED = { platform: v.platform, id: v.video_id, thumbnail: v.thumbnail_url, url: v.video_url };

  document.getElementById('formTitle').textContent = 'Edit video';
  document.getElementById('videoFormSubmit').textContent = 'Update Video';
  document.getElementById('videoFormCancel').style.display = 'inline-flex';

  document.querySelector('.admin-tab[data-tab="add"]').click();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function deleteVideo(id) {
  if (!confirm("Delete this video? This can't be undone.")) return;
  const { error } = await supabaseClient.from('videos').delete().eq('id', id);
  if (error) { alert('Delete failed: ' + error.message); return; }
  loadVideosTable();
}

async function updateOrder(id, value) {
  const order = parseInt(value, 10);
  const { error } = await supabaseClient.from('videos').update({ display_order: isNaN(order) ? 0 : order }).eq('id', id);
  if (error) alert('Could not update order: ' + error.message);
}

async function updateFeatured(id, checked) {
  const { error } = await supabaseClient.from('videos').update({ featured: checked }).eq('id', id);
  if (error) alert('Could not update: ' + error.message);
}

/* ---------- Messages ---------- */
async function loadMessagesTable() {
  const tbody = document.getElementById('messagesTableBody');
  tbody.innerHTML = `<tr class="empty-row"><td colspan="4">Loading…</td></tr>`;

  const { data, error } = await supabaseClient
    .from('messages')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="4">Couldn't load messages: ${escapeHtml(error.message)}</td></tr>`;
    return;
  }

  MESSAGES_CACHE = data || [];
  updateUnreadBadge();

  if (MESSAGES_CACHE.length === 0) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="4">No messages yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = MESSAGES_CACHE.map(m => `
    <tr class="msg-row ${m.is_read ? '' : 'unread'}" data-id="${m.id}">
      <td class="title-cell">${escapeHtml(m.name)}<span>${escapeHtml(m.email)}</span></td>
      <td>${escapeHtml(truncate(m.message, 60))}</td>
      <td>${formatDate(m.created_at)}</td>
      <td><button class="icon-btn danger" data-action="delete-msg" type="button">Delete</button></td>
    </tr>
    <tr class="msg-body-row" data-body-for="${m.id}"><td colspan="4">${escapeHtml(m.message)}</td></tr>
  `).join('');

  tbody.querySelectorAll('.msg-row').forEach(row => {
    const id = row.dataset.id;
    row.addEventListener('click', (e) => {
      if (e.target.closest('[data-action="delete-msg"]')) return;
      toggleMessage(id);
    });
    row.querySelector('[data-action="delete-msg"]').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteMessage(id);
    });
  });
}

function toggleMessage(id) {
  const bodyRow = document.querySelector(`.msg-body-row[data-body-for="${id}"]`);
  if (!bodyRow) return;
  const isOpening = !bodyRow.classList.contains('open');
  document.querySelectorAll('.msg-body-row.open').forEach(r => r.classList.remove('open'));
  if (isOpening) bodyRow.classList.add('open');

  const msg = MESSAGES_CACHE.find(m => String(m.id) === String(id));
  if (isOpening && msg && !msg.is_read) {
    supabaseClient.from('messages').update({ is_read: true }).eq('id', id).then(({ error }) => {
      if (error) return;
      msg.is_read = true;
      const row = document.querySelector(`.msg-row[data-id="${id}"]`);
      if (row) row.classList.remove('unread');
      updateUnreadBadge();
    });
  }
}

async function deleteMessage(id) {
  if (!confirm('Delete this message?')) return;
  const { error } = await supabaseClient.from('messages').delete().eq('id', id);
  if (error) { alert('Delete failed: ' + error.message); return; }
  loadMessagesTable();
}

function updateUnreadBadge() {
  const count = MESSAGES_CACHE.filter(m => !m.is_read).length;
  const badge = document.getElementById('unreadBadge');
  if (count > 0) {
    badge.textContent = String(count);
    badge.style.display = 'inline-flex';
  } else {
    badge.style.display = 'none';
  }
}

/* ---------- Helpers ---------- */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str ?? '');
  return div.innerHTML;
}

function truncate(str, len) {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '…' : str;
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
}
