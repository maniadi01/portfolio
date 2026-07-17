/**
 * Main site behavior: nav, hero timecode, fetching + rendering videos
 * from Supabase, category filters, the video modal, and the contact form.
 */

let ALL_VIDEOS = [];
let ACTIVE_CATEGORY = 'All';

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initMobileMenu();
  initTimecode();
  initFooterYear();
  initScrollReveal();
  initModal();
  initContactForm();
  loadVideos();
});

/* ---------- Navbar ---------- */
function initNavbar() {
  const nav = document.getElementById('navbar');
  if (!nav) return;
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 40);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

function initMobileMenu() {
  const toggle = document.getElementById('navToggle');
  const mobile = document.getElementById('navMobile');
  if (!toggle || !mobile) return;

  function setOpen(isOpen) {
    mobile.classList.toggle('open', isOpen);
    toggle.classList.toggle('open', isOpen);
    toggle.setAttribute('aria-expanded', String(isOpen));
    document.body.style.overflow = isOpen ? 'hidden' : '';
  }

  toggle.addEventListener('click', () => setOpen(!mobile.classList.contains('open')));
  mobile.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setOpen(false)));
}

/* ---------- Hero timecode (atmospheric, not a real clock) ---------- */
function initTimecode() {
  const el = document.getElementById('heroTimecode');
  if (!el) return;
  const start = Date.now();
  setInterval(() => {
    const elapsed = Date.now() - start;
    const totalSeconds = Math.floor(elapsed / 1000);
    const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const s = String(totalSeconds % 60).padStart(2, '0');
    const f = String(Math.floor((elapsed % 1000) / 42)).padStart(2, '0');
    el.textContent = `${h}:${m}:${s}:${f}`;
  }, 42);
}

function initFooterYear() {
  const el = document.getElementById('year');
  if (el) el.textContent = new Date().getFullYear();
}

/* ---------- Scroll reveal ---------- */
function initScrollReveal() {
  window.__revealObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
}
function observeReveal(el) {
  if (window.__revealObserver) window.__revealObserver.observe(el);
  else el.classList.add('in-view');
}

/* ---------- Video modal ---------- */
function initModal() {
  const modal = document.getElementById('videoModal');
  const iframe = document.getElementById('modalIframe');
  const closeBtn = document.getElementById('modalClose');
  if (!modal || !iframe) return;

  function close() {
    modal.classList.remove('active');
    iframe.src = '';
    document.body.style.overflow = '';
  }

  closeBtn.addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

  window.__openVideoModal = (video) => {
    iframe.src = buildEmbedUrl(video);
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  };
}

/* Builds a player embed URL. Vimeo unlisted videos store an id like
   "123456789/abcd1234ef" (see admin.js parseVideoUrl) — the part after
   the slash is a privacy hash that must be passed as ?h= or the player
   shows a "this video is private" error instead of playing. */
function buildEmbedUrl(video) {
  if (video.platform === 'vimeo') {
    if (video.video_id.includes('/')) {
      const [id, hash] = video.video_id.split('/');
      return `https://player.vimeo.com/video/${id}?h=${hash}&autoplay=1&title=0&byline=0`;
    }
    return `https://player.vimeo.com/video/${video.video_id}?autoplay=1&title=0&byline=0`;
  }
  return `https://www.youtube.com/embed/${video.video_id}?autoplay=1&rel=0`;
}

/* ---------- Loading + rendering videos ---------- */
async function loadVideos() {
  const grid = document.getElementById('videoGrid');
  const filtersEl = document.getElementById('filters');
  if (!grid) return;

  if (!SUPABASE_CONFIGURED) {
    filtersEl.innerHTML = '';
    grid.innerHTML = stateBlock(
      'Connect your database to go live',
      'This grid fills automatically once Supabase is connected. Paste your project URL and anon key into <code>js/config.js</code>, run <code>supabase/schema.sql</code> in the SQL editor, then add your first video from <code>admin.html</code>.'
    );
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from('videos')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) throw error;
    ALL_VIDEOS = data || [];

    if (ALL_VIDEOS.length === 0) {
      filtersEl.innerHTML = '';
      grid.innerHTML = stateBlock(
        'Your reel starts here',
        'No projects yet. Open <code>admin.html</code>, paste a YouTube or Vimeo link, and your first project will appear here instantly.'
      );
      return;
    }

    renderFilters();
    renderGrid();
  } catch (err) {
    console.error(err);
    filtersEl.innerHTML = '';
    grid.innerHTML = stateBlock(
      "Couldn't load the reel",
      'Double check the schema from <code>supabase/schema.sql</code> has been run and the keys in <code>js/config.js</code> are correct.'
    );
  }
}

function stateBlock(title, note) {
  return `<div class="state-block"><h3>${title}</h3><p>${note}</p></div>`;
}

function renderFilters() {
  const filtersEl = document.getElementById('filters');
  filtersEl.innerHTML = '';
  const categories = ['All', ...new Set(ALL_VIDEOS.map(v => v.category).filter(Boolean))];

  categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'filter-btn' + (cat === ACTIVE_CATEGORY ? ' active' : '');
    btn.textContent = cat;
    btn.type = 'button';
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', String(cat === ACTIVE_CATEGORY));
    btn.addEventListener('click', () => {
      ACTIVE_CATEGORY = cat;
      filtersEl.querySelectorAll('.filter-btn').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      renderGrid();
    });
    filtersEl.appendChild(btn);
  });
}

const PLAY_ICON = `<svg viewBox="0 0 60 60" fill="none" aria-hidden="true"><circle cx="30" cy="30" r="29" fill="rgba(12,13,13,0.55)" stroke="white" stroke-opacity="0.5"/><path d="M24 19L42 30L24 41V19Z" fill="white"/></svg>`;

function renderGrid() {
  const grid = document.getElementById('videoGrid');
  const list = ACTIVE_CATEGORY === 'All' ? ALL_VIDEOS : ALL_VIDEOS.filter(v => v.category === ACTIVE_CATEGORY);

  if (list.length === 0) {
    grid.innerHTML = stateBlock('Nothing here yet', 'Try a different filter.');
    return;
  }

  grid.innerHTML = list.map(v => `
    <article class="card ${v.featured ? 'card--featured' : ''}" data-id="${v.id}" tabindex="0" role="button" aria-label="Play ${escapeHtml(v.title)}">
      <div class="card__thumb">
        <img src="${v.thumbnail_url || ''}" alt="" loading="lazy">
        <div class="card__play">${PLAY_ICON}</div>
        <span class="card__tag">${escapeHtml(v.category)}</span>
        ${v.featured ? '<span class="card__featured-badge">Featured</span>' : ''}
        <div class="card__scrub"><div class="card__scrub-fill"></div></div>
      </div>
      <div class="card__body">
        <h3 class="card__title">${escapeHtml(v.title)}</h3>
        <div class="card__meta">
          <span>${escapeHtml(v.client || '')}</span>
          <span>${v.year || ''}</span>
        </div>
      </div>
    </article>
  `).join('');

  grid.querySelectorAll('.card').forEach(card => {
    observeReveal(card);
    const open = () => {
      const video = ALL_VIDEOS.find(v => String(v.id) === card.dataset.id);
      if (video && window.__openVideoModal) window.__openVideoModal(video);
    };
    card.addEventListener('click', open);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
    });
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str ?? '');
  return div.innerHTML;
}

/* ---------- Contact form ---------- */
function initContactForm() {
  const form = document.getElementById('contactForm');
  const msgEl = document.getElementById('formMsg');
  const submitBtn = document.getElementById('formSubmit');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msgEl.className = 'form-msg';

    if (!SUPABASE_CONFIGURED) {
      msgEl.textContent = "Contact form isn't connected yet — add your Supabase keys to js/config.js.";
      msgEl.classList.add('show', 'error');
      return;
    }

    const name = document.getElementById('cName').value.trim();
    const email = document.getElementById('cEmail').value.trim();
    const message = document.getElementById('cMessage').value.trim();

    submitBtn.disabled = true;
    const originalLabel = submitBtn.textContent;
    submitBtn.innerHTML = '<span class="spinner"></span> Sending…';

    try {
      const { error: emailError } = await supabaseClient.functions.invoke(
  "send-contact-email",
  {
    body: {
      name,
      email,
      message,
    },
  }
);

if (emailError) {
  console.error("Email failed:", emailError);
}
    } catch (err) {
      console.error(err);
      msgEl.textContent = 'Something went wrong sending that — please try again or email me directly.';
      msgEl.classList.add('show', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalLabel;
    }
  });
}
