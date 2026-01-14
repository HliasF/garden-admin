const yearEl = document.getElementById("year");
yearEl.textContent = new Date().getFullYear();

// Mobile menu
const burger = document.getElementById("burger");
const mobileMenu = document.getElementById("mobileMenu");

// Accessible mobile menu: toggle, focus management, Escape to close, outside click
if (burger && mobileMenu) {
  function openMenu() {
    mobileMenu.hidden = false;
    mobileMenu.setAttribute('aria-hidden', 'false');
    burger.setAttribute('aria-expanded', 'true');
    mobileMenu.classList.add('open');
    // focus first focusable element inside menu
    const first = mobileMenu.querySelector('a, button, [tabindex]:not([tabindex="-1"])');
    first?.focus();
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('click', onDocClick);
    window.addEventListener('resize', onResize);
  }

  function closeMenu(returnFocus = true) {
    mobileMenu.hidden = true;
    mobileMenu.setAttribute('aria-hidden', 'true');
    burger.setAttribute('aria-expanded', 'false');
    mobileMenu.classList.remove('open');
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('click', onDocClick);
    window.removeEventListener('resize', onResize);
    if (returnFocus) burger.focus();
  }

  function toggleMenu() {
    const isOpen = burger.getAttribute('aria-expanded') === 'true' && !mobileMenu.hidden;
    if (isOpen) closeMenu(); else openMenu();
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') closeMenu();
    // simple trap: keep focus inside menu when open and Tab pressed
    if (e.key === 'Tab' && !mobileMenu.hidden) {
      const focusable = Array.from(mobileMenu.querySelectorAll('a, button, input, textarea, [tabindex]:not([tabindex="-1"])'))
        .filter(n => !n.hasAttribute('disabled'));
      if (focusable.length === 0) return;
      const idx = focusable.indexOf(document.activeElement);
      if (e.shiftKey && idx === 0) { e.preventDefault(); focusable[focusable.length - 1].focus(); }
      else if (!e.shiftKey && idx === focusable.length - 1) { e.preventDefault(); focusable[0].focus(); }
    }
  }

  function onDocClick(e) {
    if (!mobileMenu.contains(e.target) && e.target !== burger) closeMenu();
  }

  function onResize() {
    if (window.innerWidth > 980 && !mobileMenu.hidden) closeMenu(false);
  }

  burger.addEventListener('click', (e) => { e.stopPropagation(); toggleMenu(); });

  // Close mobile menu when a link inside it is activated
  mobileMenu.addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (a) closeMenu();
  });

  // ensure initial ARIA state
  if (!mobileMenu.hasAttribute('aria-hidden')) mobileMenu.setAttribute('aria-hidden', String(mobileMenu.hidden));
  if (!burger.hasAttribute('aria-expanded')) burger.setAttribute('aria-expanded', 'false');
}

// Contact form
const form = document.getElementById("contactForm");

// File upload / preview for garden images/docs
const UPLOAD_URL = ""; // Αν έχεις server, βάλε εδώ το endpoint π.χ. '/upload'
const fileInput = document.getElementById("gardenFiles");
const filePreview = document.getElementById("filePreview");

function formatSize(bytes){
  if(bytes < 1024) return bytes + ' B';
  if(bytes < 1024*1024) return (bytes/1024).toFixed(1) + ' KB';
  return (bytes/(1024*1024)).toFixed(1) + ' MB';
}

fileInput?.addEventListener('change', (ev) => {
  const files = Array.from(ev.target.files || []);
  filePreview.innerHTML = '';

  if(files.length === 0) return;

  const maxFiles = 12;
  const maxSize = 10 * 1024 * 1024; // 10MB per file

  if(files.length > maxFiles){
    filePreview.textContent = `Επέλεξες ${files.length} αρχεία — επιτρέπονται έως ${maxFiles}.`; return;
  }

  files.forEach(file => {
    if(file.size > maxSize){
      const el = document.createElement('div'); el.className = 'file-item'; el.textContent = `${file.name} — πολύ μεγάλο (${formatSize(file.size)})`; filePreview.appendChild(el); return;
    }

    const item = document.createElement('div'); item.className = 'thumb';
    const info = document.createElement('div'); info.className = 'thumb-info';
    info.textContent = `${file.name} · ${formatSize(file.size)}`;

    if(file.type.startsWith('image/')){
      const img = document.createElement('img');
      img.alt = file.name;
      const reader = new FileReader();
      reader.onload = () => { img.src = String(reader.result); };
      reader.readAsDataURL(file);
      item.appendChild(img);
    } else {
      const icon = document.createElement('div'); icon.className = 'file-icon'; icon.textContent = '📄'; item.appendChild(icon);
    }

    item.appendChild(info);
    filePreview.appendChild(item);
  });
});

// Enhance submit: if UPLOAD_URL set, upload files first then open mailto with link
async function uploadFilesAndSend(formEl){
  const fd = new FormData();
  const files = fileInput?.files;
  if(files && files.length){
    for(const f of files) fd.append('files', f);
  }
  fd.append('name', formEl.name.value);
  fd.append('phone', formEl.phone.value);
  fd.append('message', formEl.message.value);

  try{
    const res = await fetch(UPLOAD_URL, { method: 'POST', body: fd });
    if(!res.ok) throw new Error('upload failed');
    const json = await res.json();
    return json; // expected { urls: [...] } or similar
  }catch(err){
    console.warn('Upload failed or UPLOAD_URL not set', err);
    return null;
  }
}

// If a server URL is set, submit handler will try to upload; otherwise fallback to mailto as before.
if(form){
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.currentTarget;
    const data = new FormData(f);
    const name = data.get('name');
    const phone = data.get('phone');
    const message = data.get('message');

    const subject = encodeURIComponent('Ενδιαφέρομαι για κηπουρικές εργασίες');

    // UI: show spinner/progress and disable button
    const submitBtn = f.querySelector('.submit-btn') || f.querySelector('.btn[type="submit"]');
    const progressWrap = document.getElementById('uploadProgress');
    const progressBar = document.getElementById('progressBar');
    if(submitBtn){ submitBtn.disabled = true; submitBtn.classList.add('is-loading'); }
    if(progressWrap){ progressWrap.hidden = false; progressBar.style.width = '4%'; }

    if(UPLOAD_URL){
      const result = await uploadFilesAndSend(f);
      // if upload returns progress info you could update progressBar here
      const urls = result?.urls ? result.urls.join(', ') : 'Δεν επέστρεψε σύνδεσμο.';
      const body = encodeURIComponent(`Ονοματεπώνυμο: ${name}\nΤηλέφωνο: ${phone}\n\nΜήνυμα:\n${message}\n\nΣυνδέσεις αρχείων: ${urls}`);
      // store copy of message for admin
      saveContactMessage({ id: Date.now(), name: name || '', phone: phone || '', message: message || '', created: Date.now(), status: 'new' });
      window.location.href = `mailto:${encodeURIComponent('you@email.com')}?subject=${subject}&body=${body}`;
      if(submitBtn){ submitBtn.disabled = false; submitBtn.classList.remove('is-loading'); }
      if(progressWrap){ progressWrap.hidden = true; progressBar.style.width = '0%'; }
      return;
    }

    // Fallback: no server — open mail client and include filenames
    const files = Array.from(fileInput?.files || []).map(f => f.name).join(', ') || '—';
    const body = encodeURIComponent(`Ονοματεπώνυμο: ${name}\nΤηλέφωνο: ${phone}\n\nΜήνυμα:\n${message}\n\nΣυνημμένα (τοπικά): ${files}\n\n(Αν θέλεις, επισύναψε τα αρχεία στο email/WhatsApp πριν την αποστολή.)`);
    // save message for admin and open mail client
    saveContactMessage({ id: Date.now(), name: name || '', phone: phone || '', message: message || '', created: Date.now(), status: 'new' });
    window.location.href = `mailto:${encodeURIComponent('you@email.com')}?subject=${subject}&body=${body}`;
    // Show success toast and reset UI after short delay
    setTimeout(()=>{
      const submit = submitBtn; if(submit){ submit.disabled = false; submit.classList.remove('is-loading'); }
      if(progressWrap){ progressWrap.hidden = true; progressBar.style.width = '0%'; }
      showToast('Το μήνυμα προετοιμάστηκε — άνοιξε το email σου για αποστολή');
    }, 600);
  });
}

// Toast & progress helpers + lightbox for preview images
function showToast(text, timeout = 4200){
  const container = document.getElementById('toastContainer');
  if(!container) return;
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = text;
  container.appendChild(t);
  requestAnimationFrame(()=> t.classList.add('in'));
  setTimeout(()=>{ t.classList.remove('in'); setTimeout(()=> t.remove(), 300); }, timeout);
}

// Lightbox for image preview
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightboxImg');
const lightboxClose = document.getElementById('lightboxClose');
document.getElementById('filePreview')?.addEventListener('click', (e)=>{
  const img = e.target.closest('img');
  if(!img) return;
  if(!lightbox) return;
  lightboxImg.src = img.src;
  lightbox.hidden = false;
});
lightboxClose?.addEventListener('click', ()=>{ if(lightbox) lightbox.hidden = true; });
lightbox?.addEventListener('click', (e)=>{ if(e.target === lightbox) lightbox.hidden = true; });

// Contact cards: entrance animation + pointer reactive highlight
(() => {
  const cards = document.querySelectorAll('.contact-card');
  if(!cards || cards.length === 0) return;

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry, idx) => {
      if(entry.isIntersecting){
        // stagger appearance
        setTimeout(() => entry.target.classList.add('in'), idx * 80);
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  cards.forEach((c) => io.observe(c));

  // pointer move to update radial highlight position
  cards.forEach(c => {
    c.addEventListener('mousemove', (e) => {
      const r = c.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 100;
      const y = ((e.clientY - r.top) / r.height) * 100;
      c.style.setProperty('--mx', x + '%');
      c.style.setProperty('--my', y + '%');
    });
    c.addEventListener('mouseleave', () => { c.style.setProperty('--mx', '50%'); c.style.setProperty('--my', '50%'); });
  });

  // optional gentle float for desktop cards
  if(window.matchMedia && window.matchMedia('(min-width:600px)').matches){
    // add 'animated' to every other card for variety
    cards.forEach((c, i) => { if(i % 2 === 0) c.classList.add('animated'); });
  }
})();

/* Smooth-scroll with offset for anchor links and SVG hover/focus trigger */
(function(){
  // Smooth scroll for internal anchors (respect --scroll-offset)
  function getScrollOffset(){
    const v = getComputedStyle(document.documentElement).getPropertyValue('--scroll-offset') || ''; 
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : 96;
  }

  function smoothScrollToTarget(target){
    if(!target) return;
    const offset = getScrollOffset();
    const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
    window.scrollTo({ top: Math.max(0, Math.floor(top)), behavior: 'smooth' });

    // update hash after scrolling starts (delayed to avoid instant jump)
    const id = target.id;
    if(id){ setTimeout(()=> { history.replaceState(null, '', '#' + id); }, 520); }
  }

  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if(!href || href === '#' ) return; // ignore empty
      const target = document.querySelector(href);
      if(target){ e.preventDefault(); smoothScrollToTarget(target); }
    });
  });

  // Hover / focus synchronization for the logo
  const brand = document.querySelector('.brand');
  if(brand){
    const mark = brand.querySelector('.brand-mark');
    function addHover(){ brand.classList.add('hover'); if(mark){ mark.classList.add('hover'); const svgInline = mark.querySelector('svg'); if(svgInline) svgInline.classList.add('hover'); const obj = mark.querySelector('object'); if(obj && obj.contentDocument){ const root = obj.contentDocument.querySelector('svg'); root && root.classList.add('hover'); } }
    }
    function removeHover(){ brand.classList.remove('hover'); if(mark){ mark.classList.remove('hover'); const svgInline = mark.querySelector('svg'); if(svgInline) svgInline.classList.remove('hover'); const obj = mark.querySelector('object'); if(obj && obj.contentDocument){ const root = obj.contentDocument.querySelector('svg'); root && root.classList.remove('hover'); } }
    }

    brand.addEventListener('mouseenter', addHover);
    brand.addEventListener('mouseleave', removeHover);
    brand.addEventListener('focusin', addHover);
    brand.addEventListener('focusout', removeHover);
  }
})();

/* Menu active link handling: mark clicked/hash links as active for visual indicator */
(function(){
  const menuLinks = Array.from(document.querySelectorAll('.menu a'));
  if(menuLinks.length === 0) return;

  const headerEl = document.querySelector('.nav') || document.querySelector('.header');
  function updateScrollOffset(){
    const h = headerEl ? Math.round(headerEl.getBoundingClientRect().height + 8) : 96;
    document.documentElement.style.setProperty('--scroll-offset', `${h}px`);
    return h;
  }
  let headerHeight = updateScrollOffset();
  window.addEventListener('resize', () => { headerHeight = updateScrollOffset(); });

  // build map of hash -> { link, target }
  const linkMap = new Map();
  menuLinks.forEach(a => {
    const href = a.getAttribute('href') || '';
    if(!href.startsWith('#')) return;
    const target = document.querySelector(href);
    if(target) linkMap.set(href, { link: a, target });
  });

  function clear(){ menuLinks.forEach(a=>a.classList.remove('active')); }

  // click behavior remains
  menuLinks.forEach(a => a.addEventListener('click', () => { clear(); a.classList.add('active'); }));

  // Scrollspy using IntersectionObserver
  const entries = Array.from(linkMap.values());
  if(entries.length){
    const observer = new IntersectionObserver((obsEntries) => {
      // pick the entry with largest intersectionRatio that's intersecting
      const visible = obsEntries.filter(e => e.isIntersecting).sort((a,b) => b.intersectionRatio - a.intersectionRatio);
      if(visible.length){
        const id = '#' + visible[0].target.id;
        const info = linkMap.get(id);
        if(info){ clear(); info.link.classList.add('active'); }
      }
    }, { root: null, rootMargin: `-${headerHeight}px 0px -40% 0px`, threshold: [0.15, 0.45, 0.75] });

    entries.forEach(e => observer.observe(e.target));

    // update observer's rootMargin when resizing to keep offset accurate
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        headerHeight = updateScrollOffset();
        observer.disconnect();
        entries.forEach(e => observer.observe(e.target));
      }, 120);
    });
  }

  // on load/hashchange ensure active state
  const initial = location.hash || '#top';
  if(linkMap.has(initial)){ clear(); linkMap.get(initial).link.classList.add('active'); }
  window.addEventListener('hashchange', () => {
    const h = location.hash || '#top';
    if(linkMap.has(h)){ clear(); linkMap.get(h).link.classList.add('active'); }
  });
})();
/* Reviews + simple moderation flow: save pending, mailto admin, admin panel to approve */
(function(){
  const STORAGE_KEY = 'gardener_reviews';
  const PENDING_KEY = 'gardener_reviews_pending';
  const ADMIN_EMAIL = 'you@email.com'; // admin notification email
  const ADMIN_PASS_KEY = 'gardener_admin_hash'; // localStorage key for admin password hash

  const reviewForm = document.getElementById('reviewForm');
  const reviewList = document.getElementById('reviewList');
  const reviewMsg = document.getElementById('reviewMessage');
  const pendingListEl = document.getElementById('pendingList');
  const openAdminBtn = document.getElementById('openAdminBtn');
  const adminPanel = document.getElementById('adminPanel');
  const closeAdminBtn = document.getElementById('closeAdminBtn');
  let currentRating = 5;

  // Owner visibility: admin controls are hidden by default unless:
  // Owner visibility: session-only UI gate
  // Admin overlay is now only available when the site is served at /admin
  // and the server provides Basic Auth protection. Client-side owner flags
  // and client password modals are removed for security.

  function load(key){ try{ return JSON.parse(localStorage.getItem(key) || '[]'); }catch(e){ return []; } }
  function save(key, arr){ localStorage.setItem(key, JSON.stringify(arr)); }

  function loadReviews(){ return load(STORAGE_KEY); }
  function saveReviews(arr){ save(STORAGE_KEY, arr); }
  function loadPending(){ return load(PENDING_KEY); }
  function savePending(arr){ save(PENDING_KEY, arr); }

  function renderStars(n){ return '★'.repeat(n) + '☆'.repeat(Math.max(0,5-n)); }

  function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function renderReviews(){
    const items = loadReviews().slice().reverse();
    if(!reviewList) return;
    reviewList.innerHTML = items.length ? items.map(r => `
      <div class="review-item">
        <div style="flex:1">
          <div class="review-meta">
            <div class="review-name">${escapeHtml(r.name)}</div>
            <div class="review-stars">${renderStars(r.rating)}</div>
            <div class="review-date">${new Date(r.created).toLocaleString('el-GR')}</div>
          </div>
          <div class="review-text">${escapeHtml(r.text)}</div>
        </div>
      </div>
    `).join('') : '<p class="form-hint">Δεν υπάρχουν κριτικές ακόμη — γίνε ο πρώτος!</p>';
  }

  function renderPending(){
    if(!pendingListEl) return;
    const items = loadPending().slice().reverse();
    pendingListEl.innerHTML = items.length ? items.map(p => `
      <div class="review-item" data-id="${p.id}">
        <div style="display:flex; gap:12px; align-items:flex-start;">
          <div style="flex:1">
            <div class="review-meta">
              <div class="review-name">${escapeHtml(p.name)}</div>
              <div class="review-stars">${renderStars(p.rating)}</div>
              <div class="review-date">${new Date(p.created).toLocaleString('el-GR')}</div>
            </div>
            <div class="review-text">${escapeHtml(p.text)}</div>
          </div>
          <div style="display:flex; flex-direction:column; gap:8px;">
            <button class="btn approve-btn" data-id="${p.id}">Έγκριση</button>
            <button class="btn btn-ghost reject-btn" data-id="${p.id}">Απόρριψη</button>
          </div>
        </div>
      </div>
    `).join('') : '<p class="form-hint">Δεν υπάρχουν εκκρεμείς κριτικές.</p>';

    // wire up approve/reject
    Array.from(pendingListEl.querySelectorAll('.approve-btn')).forEach(b => b.addEventListener('click', () => approvePending(b.dataset.id)));
    Array.from(pendingListEl.querySelectorAll('.reject-btn')).forEach(b => b.addEventListener('click', () => rejectPending(b.dataset.id)));
  }

  async function approvePending(id){
    try{
      if(typeof apiPost === 'function'){
        await apiPost('/api/admin/reviews/approve', { id });
        if(document.getElementById('adminOverlay')){ renderReviewsAdmin(); }
        showToast('Η κριτική εγκρίθηκε');
        return;
      }
    }catch(e){ console.warn('API approve failed', e); }

    // fallback: localStorage behavior
    const pending = loadPending();
    const idx = pending.findIndex(p => String(p.id) === String(id));
    if(idx === -1) return;
    const [item] = pending.splice(idx,1);
    const published = loadReviews(); published.push(item); saveReviews(published); savePending(pending); renderPending(); renderReviews();
  }

  async function rejectPending(id){
    try{
      if(typeof apiPost === 'function'){
        await apiPost('/api/admin/reviews/delete', { id });
        if(document.getElementById('adminOverlay')){ renderReviewsAdmin(); }
        showToast('Η κριτική απορρίφθηκε');
        return;
      }
    }catch(e){ console.warn('API delete failed', e); }

    // fallback: localStorage behavior
    const pending = loadPending();
    const idx = pending.findIndex(p => String(p.id) === String(id));
    if(idx === -1) return;
    pending.splice(idx,1); savePending(pending); renderPending();
  }

  // Star interactions (form)
  const starsWrap = document.querySelector('#reviewForm .stars') || document.querySelector('.stars');
  if(starsWrap){
    const stars = Array.from(starsWrap.querySelectorAll('.star'));
    function setActive(n){ stars.forEach(s => s.classList.toggle('active', Number(s.dataset.value) <= n)); }
    setActive(currentRating);
    stars.forEach(s => {
      s.addEventListener('click', () => { currentRating = Number(s.dataset.value); setActive(currentRating); });
      s.addEventListener('mouseover', () => setActive(Number(s.dataset.value)));
      s.addEventListener('mouseleave', () => setActive(currentRating));
    });
  }

  if(reviewForm){
    reviewForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(reviewForm);
      const name = (fd.get('rname')||'').toString().trim();
      const text = (fd.get('rtext')||'').toString().trim();
      const rating = Number(currentRating) || 5;
      if(!name || !text){ reviewMsg.textContent = 'Συμπλήρωσε όνομα και κείμενο κριτικής.'; return; }

      // show spinner on button
      const submitBtn = reviewForm.querySelector('.submit-btn');
      submitBtn?.classList.add('is-loading'); submitBtn?.setAttribute('disabled','');

      // create pending entry
      const pending = loadPending();
      const entry = { id: Date.now(), name, text, rating, created: Date.now() };
      pending.push(entry); savePending(pending);

      // open mail client to notify admin (mailto)
      const subject = encodeURIComponent('Νέα κριτική προς έγκριση');
      const body = encodeURIComponent(`Όνομα: ${name}\nΒαθμολογία: ${rating}\nΚείμενο:\n${text}\n\nID: ${entry.id}`);
      window.location.href = `mailto:${encodeURIComponent(ADMIN_EMAIL)}?subject=${subject}&body=${body}`;

      // UI feedback
      setTimeout(()=>{
        reviewMsg.textContent = 'Η κριτική στάλθηκε προς έγκριση. Θα εμφανιστεί αφού την εγκρίνετε.';
        reviewForm.reset(); currentRating = 5; setActive && setActive(5);
        submitBtn?.classList.remove('is-loading'); submitBtn?.removeAttribute('disabled');
      }, 600);
    });
  }

  // Admin authentication helpers (sha256)
  function buf2hex(buffer){ return Array.from(new Uint8Array(buffer)).map(b=>b.toString(16).padStart(2,'0')).join(''); }
  async function sha256(str){ const data = new TextEncoder().encode(str); const hash = await crypto.subtle.digest('SHA-256', data); return buf2hex(hash); }
  // Admin behavior: session-only owner UI + password modal + dynamic overlay creation
  // Admin password is enforced server-side (Basic Auth); removed from client.
  const MESSAGES_KEY = 'gardener_messages';
  const openAdminBtnEl = openAdminBtn;

  function loadMessages(){ try{ return JSON.parse(localStorage.getItem(MESSAGES_KEY) || '[]'); }catch(e){ return []; } }
  function saveMessages(arr){ localStorage.setItem(MESSAGES_KEY, JSON.stringify(arr)); }
  // public contact endpoint (if server available) will store messages; we still
  // keep local fallback but prefer POST to /api/messages.
  async function saveContactMessage(obj){
    try{
      await fetch('/api/messages', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(obj) });
    }catch(e){ const arr = loadMessages(); arr.push(obj); saveMessages(arr); }
  }

  // client-side owner/session helpers removed — server-side Basic Auth protects /admin

  // Password modal removed: admin page is protected by server Basic Auth.

  // ------- Admin API helpers & renderers (server-backed) -------
  function handleApiAuthError(err){
    console.error(err);
    if(String(err).toLowerCase().includes('unauthorized')){
      showToast('Απαιτείται σύνδεση διαχειριστή. Ανανέωσε/συνδέσου.', 6000);
      // keep overlay open so admin can reload/login; do not auto-redirect
    }else{
      showToast('Σφάλμα διακομιστή — δοκίμασε ξανά.', 5000);
    }
  }

  async function fetchAdminReviews(){
    try{
      const res = await fetch('/api/admin/reviews', { credentials: 'same-origin' });
      if(res.status === 401) throw new Error('unauthorized');
      if(!res.ok) throw new Error('fetch failed');
      return await res.json();
    }catch(e){ handleApiAuthError(e); return { published: [], pending: [] }; }
  }

  async function fetchAdminMessages(){
    try{
      const res = await fetch('/api/admin/messages', { credentials: 'same-origin' });
      if(res.status === 401) throw new Error('unauthorized');
      if(!res.ok) throw new Error('fetch failed');
      return await res.json();
    }catch(e){ handleApiAuthError(e); return { messages: [] }; }
  }

  async function apiPost(path, body){
    try{
      const res = await fetch(path, { method: 'POST', headers: { 'Content-Type':'application/json' }, credentials: 'same-origin', body: JSON.stringify(body) });
      if(res.status === 401) throw new Error('unauthorized');
      if(!res.ok) throw new Error('request failed');
      return await res.json().catch(()=> ({}));
    }catch(e){ throw e; }
  }

  async function renderReviewsAdmin(){
    const wrap = document.getElementById('adminOverlay'); if(!wrap) return;
    const list = wrap.querySelector('#reviewsAdminList'); if(!list) return;
    list.innerHTML = '<p class="form-hint">Φόρτωση...</p>';
    const filter = wrap.querySelector('.filter-btn.active')?.dataset.filter || 'all';
    const search = (wrap.querySelector('#reviewsSearch')?.value || '').toLowerCase();
    const data = await fetchAdminReviews();
    const pending = (data.pending || []).slice().reverse();
    const published = (data.published || []).slice().reverse();

    const rows = [];
    // pending
    pending.forEach(p => {
      if(filter === 'approved') return;
      if(search && !(`${p.name} ${p.text}`).toLowerCase().includes(search)) return;
      rows.push({ type: 'pending', item: p });
    });
    // published
    published.forEach(p => {
      if(filter === 'pending') return;
      if(search && !(`${p.name} ${p.text}`).toLowerCase().includes(search)) return;
      rows.push({ type: 'published', item: p });
    });

    if(rows.length === 0){ list.innerHTML = '<p class="form-hint">Δεν βρέθηκαν κριτικές για τα κριτήρια αυτά.</p>'; return; }

    list.innerHTML = rows.map(r => {
      const it = r.item;
      if(r.type === 'pending'){
        return `
          <div class="admin-item" data-id="${it.id}">
            <div class="admin-item-main">
              <div><strong>${escapeHtml(it.name)}</strong> · ${renderStars(it.rating)} · <small>${new Date(it.created).toLocaleString('el-GR')}</small></div>
              <div class="admin-item-text">${escapeHtml(it.text)}</div>
            </div>
            <div class="admin-item-actions">
              <button class="btn approve-review" data-id="${it.id}">Έγκριση</button>
              <button class="btn btn-ghost delete-review" data-id="${it.id}">Διαγραφή</button>
            </div>
          </div>`;
      }else{
        return `
          <div class="admin-item" data-id="${it.id}">
            <div class="admin-item-main">
              <div><strong>${escapeHtml(it.name)}</strong> · ${renderStars(it.rating)} · <small>${new Date(it.created).toLocaleString('el-GR')}</small></div>
              <div class="admin-item-text">${escapeHtml(it.text)}</div>
            </div>
            <div class="admin-item-actions">
              <button class="btn unapprove-review" data-id="${it.id}">Αφαίρεση</button>
              <button class="btn btn-ghost delete-review" data-id="${it.id}">Διαγραφή</button>
            </div>
          </div>`;
      }
    }).join('');

    // wire actions
    Array.from(list.querySelectorAll('.approve-review')).forEach(b => b.addEventListener('click', async () => { const id = b.dataset.id; try{ await apiPost('/api/admin/reviews/approve', { id }); showToast('Η κριτική εγκρίθηκε'); renderReviewsAdmin(); }catch(e){ handleApiAuthError(e); }}));
    Array.from(list.querySelectorAll('.unapprove-review')).forEach(b => b.addEventListener('click', async () => { const id = b.dataset.id; try{ await apiPost('/api/admin/reviews/unapprove', { id }); showToast('Η κριτική μεταφέρθηκε σε εκκρεμότητα'); renderReviewsAdmin(); }catch(e){ handleApiAuthError(e); }}));
    Array.from(list.querySelectorAll('.delete-review')).forEach(b => b.addEventListener('click', async () => { const id = b.dataset.id; if(!confirm('Διαγραφή κριτικής; Αυτή η ενέργεια είναι μη αναστρέψιμη.')) return; try{ await apiPost('/api/admin/reviews/delete', { id }); showToast('Η κριτική διαγράφηκε'); renderReviewsAdmin(); }catch(e){ handleApiAuthError(e); }}));
  }

  async function renderMessagesAdmin(){
    const wrap = document.getElementById('adminOverlay'); if(!wrap) return;
    const list = wrap.querySelector('#messagesAdminList'); if(!list) return;
    list.innerHTML = '<p class="form-hint">Φόρτωση...</p>';
    const filter = wrap.querySelector('.msg-filter-btn.active')?.dataset.filter || 'new';
    const search = (wrap.querySelector('#messagesSearch')?.value || '').toLowerCase();
    const data = await fetchAdminMessages();
    const msgs = (data.messages || []).slice().reverse();

    const rows = msgs.filter(m => {
      if(filter === 'new' && m.status !== 'new') return false;
      if(filter === 'read' && m.status !== 'read') return false;
      if(filter === 'archived' && m.status !== 'archived') return false;
      if(search && !(`${m.name} ${m.phone} ${m.message}`).toLowerCase().includes(search)) return false;
      return true;
    });

    if(rows.length === 0){ list.innerHTML = '<p class="form-hint">Δεν υπάρχουν μηνύματα.</p>'; return; }

    list.innerHTML = rows.map(m => `
      <div class="admin-item" data-id="${m.id}">
        <div class="admin-item-main">
          <div><strong>${escapeHtml(m.name)}</strong> · <small>${new Date(m.created).toLocaleString('el-GR')}</small></div>
          <div class="admin-item-text">${escapeHtml(m.message)}<br/><small>${escapeHtml(m.phone)}</small></div>
        </div>
        <div class="admin-item-actions">
          ${m.status !== 'read' ? `<button class="btn mark-read" data-id="${m.id}">Σήμανση ως αναγνωσμένο</button>` : ''}
          ${m.status !== 'archived' ? `<button class="btn btn-ghost archive-msg" data-id="${m.id}">Αρχειοθέτηση</button>` : ''}
          <button class="btn btn-ghost delete-msg" data-id="${m.id}">Διαγραφή</button>
        </div>
      </div>
    `).join('');

    Array.from(list.querySelectorAll('.mark-read')).forEach(b => b.addEventListener('click', async () => { const id = b.dataset.id; try{ await apiPost('/api/admin/messages/mark-read', { id }); showToast('Σημειώθηκε ως αναγνωσμένο'); renderMessagesAdmin(); }catch(e){ handleApiAuthError(e); }}));
    Array.from(list.querySelectorAll('.archive-msg')).forEach(b => b.addEventListener('click', async () => { const id = b.dataset.id; try{ await apiPost('/api/admin/messages/archive', { id }); showToast('Το μήνυμα αρχειοθετήθηκε'); renderMessagesAdmin(); }catch(e){ handleApiAuthError(e); }}));
    Array.from(list.querySelectorAll('.delete-msg')).forEach(b => b.addEventListener('click', async () => { const id = b.dataset.id; if(!confirm('Διαγραφή μηνύματος;')) return; try{ await apiPost('/api/admin/messages/delete', { id }); showToast('Το μήνυμα διαγράφηκε'); renderMessagesAdmin(); }catch(e){ handleApiAuthError(e); }}));
  }

  // ------- end admin API helpers -------

  function createAdminOverlay(){
    // build overlay with admin UI (tabs, lists, filters, search)
    const wrap = document.createElement('div'); wrap.id = 'adminOverlay'; wrap.className = 'admin-overlay';
    wrap.innerHTML = `
      <div class="admin-backdrop" data-action="close"></div>
      <div class="admin-modal" role="dialog" aria-modal="true" aria-labelledby="adminTitle">
        <header class="admin-header">
          <h2 id="adminTitle">Admin Area</h2>
          <div class="admin-actions"><button id="adminCloseX" class="btn btn-ghost" aria-label="Κλείσιμο">✕</button></div>
        </header>
        <nav class="admin-tabs" role="tablist">
          <button class="tab-btn active" data-tab="reviews">Κριτικές</button>
          <button class="tab-btn" data-tab="messages">Μηνύματα</button>
        </nav>
        <section class="admin-body">
          <section id="tab-reviews" class="admin-tab" data-tab="reviews">
            <div class="admin-tools">
              <div class="filters">
                <button class="filter-btn active" data-filter="all">All</button>
                <button class="filter-btn" data-filter="pending">Pending</button>
                <button class="filter-btn" data-filter="approved">Approved</button>
              </div>
              <input id="reviewsSearch" class="admin-search" placeholder="Αναζήτηση (όνομα ή κείμενο)" />
            </div>
            <div id="reviewsAdminList" class="admin-list"></div>
          </section>
          <section id="tab-messages" class="admin-tab" data-tab="messages" hidden>
            <div class="admin-tools">
              <div class="filters">
                <button class="msg-filter-btn active" data-filter="new">New</button>
                <button class="msg-filter-btn" data-filter="read">Read</button>
                <button class="msg-filter-btn" data-filter="archived">Archived</button>
              </div>
              <input id="messagesSearch" class="admin-search" placeholder="Αναζήτηση μηνυμάτων (ονομα/τηλ/κείμενο)" />
            </div>
            <div id="messagesAdminList" class="admin-list"></div>
          </section>
        </section>
        <footer class="admin-footer"><small class="form-hint">Admin session-only UI</small></footer>
      </div>`;
    document.body.appendChild(wrap);
    document.body.style.overflow = 'hidden';

    // close handlers
    wrap.querySelector('[data-action="close"]')?.addEventListener('click', () => { wrap.remove(); document.body.style.overflow = ''; });
    wrap.querySelector('#adminCloseX')?.addEventListener('click', () => { wrap.remove(); document.body.style.overflow = ''; });
    document.addEventListener('keydown', function onEsc(e){ if(e.key === 'Escape' && document.getElementById('adminOverlay')){ document.getElementById('adminOverlay').remove(); document.body.style.overflow = ''; document.removeEventListener('keydown', onEsc); } });

    // tabs
    wrap.querySelectorAll('.admin-tabs .tab-btn').forEach(b => b.addEventListener('click', () => {
      wrap.querySelectorAll('.admin-tabs .tab-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      const tab = b.dataset.tab;
      wrap.querySelectorAll('.admin-tab').forEach(t => { if(t.dataset.tab === tab) t.hidden = false; else t.hidden = true; });
    }));

    // wire filters/search for reviews
    wrap.querySelectorAll('.filter-btn').forEach(b => b.addEventListener('click', () => { wrap.querySelectorAll('.filter-btn').forEach(x=>x.classList.remove('active')); b.classList.add('active'); renderReviewsAdmin(); }));
    wrap.querySelector('#reviewsSearch')?.addEventListener('input', () => renderReviewsAdmin());

    // wire filters/search for messages
    wrap.querySelectorAll('.msg-filter-btn').forEach(b => b.addEventListener('click', () => { wrap.querySelectorAll('.msg-filter-btn').forEach(x=>x.classList.remove('active')); b.classList.add('active'); renderMessagesAdmin(); }));
    wrap.querySelector('#messagesSearch')?.addEventListener('input', () => renderMessagesAdmin());

    // initial render
    renderReviewsAdmin(); renderMessagesAdmin();
  }

  // If we are served under /admin the server should have already challenged
  // with Basic Auth. In that case create the admin overlay automatically.
  if(location.pathname === '/admin' || location.pathname.startsWith('/admin')){
    createAdminOverlay();
  }

  // initial render
  renderReviews();
})();
