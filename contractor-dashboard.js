// contractor-dashboard.js
// Frontend logic for contractor dashboard
// Uses server endpoints:
// GET /api/services
// GET /api/contractors
// POST /api/contractor
// POST /api/message
// POST /api/review
// GET /api/logs/messages (fallback)

const el = id => document.getElementById(id);

let currentProfile = { id: null };

// helpers
async function api(path, opts = {}) {
  try {
    const r = await fetch(path, opts);
    if (!r.ok) throw new Error('network');
    return await r.json();
  } catch (e) {
    console.warn('api fail', path, e);
    return null;
  }
}

function showToast(msg) {
  alert(msg);
}

/* ---------- init ---------- */
document.addEventListener('DOMContentLoaded', init);

async function init(){
  // load categories into select
  const s = await api('/api/services');
  const sel = el('fieldService');
  if (s && s.services) {
    const cats = [...new Map(s.services.map(x => [x.name, x])).values()];
    sel.innerHTML = `<option value="">Select service</option>`;
    cats.slice(0,200).forEach(it => {
      const opt = document.createElement('option');
      opt.value = it.name;
      opt.textContent = it.name;
      sel.appendChild(opt);
    });
  }

  // wire inputs
  el('saveProfileBtn').addEventListener('click', saveProfile);
  el('uploadLogoBtn').addEventListener('click', applyLogoFromInputs);
  el('logoInput').addEventListener('change', handleLogoSelect);
  el('msgSend').addEventListener('click', sendMessageToAdmin);
  el('submitReview').addEventListener('click', submitReview);
  el('visitPublicBtn').addEventListener('click', openPublicPage);
  el('upgradeBtn').addEventListener('click', ()=> showToast('Upgrade flow (Stripe) not wired. Contact admin.)'));

  // load local contractor (if stored previously in localStorage)
  const local = localStorage.getItem('omni_contractor_profile');
  if (local) {
    try { currentProfile = JSON.parse(local); } catch(e){ currentProfile = {}; }
    populateProfile(currentProfile);
  }

  // also attempt to fetch contractor list from server to find current phone user (if we had id)
  const contractorsRes = await api('/api/contractors');
  if (contractorsRes && contractorsRes.contractors) {
    // if currentProfile.phone exists, find the full profile from server
    if (currentProfile.phone) {
      const found = contractorsRes.contractors.find(c => c.phone === currentProfile.phone || c.id === currentProfile.id);
      if (found) { currentProfile = found; populateProfile(found); localStorage.setItem('omni_contractor_profile', JSON.stringify(found)); }
    }
    // show reviews and messages
    renderContractorReviews();
    renderChatHistory();
  }
  renderPreview();
}

/* ---------- profile ---------- */
function populateProfile(p) {
  el('fieldName').value = p.name || p.company || '';
  el('fieldPhone').value = p.phone || '';
  el('fieldEmail').value = p.email || '';
  el('fieldService').value = p.service || p.service || '';
  el('fieldTelegramToken').value = p.telegramToken || p.telegram_token || '';
  el('fieldTelegramChatId').value = p.telegramChatId || p.telegram_chat_id || '';
  el('logoURL').value = p.logoURL || '';
  if (p.logoBase64) {
    setLogoPreview(p.logoBase64);
  } else if (p.logoURL) {
    setLogoPreview(p.logoURL);
  }
  // color
  el('colorPicker').value = p.themeColor || '#6f4cff';
  el('hueRange').value = p.themeHue || 240;
  applyTheme(p.themeColor || '#6f4cff', p.themeHue || 240);
}

async function saveProfile(){
  const profile = {
    id: currentProfile.id || `ct-${Date.now()}`,
    name: el('fieldName').value.trim(),
    phone: el('fieldPhone').value.trim(),
    email: el('fieldEmail').value.trim(),
    service: el('fieldService').value,
    telegramToken: el('fieldTelegramToken').value.trim(),
    telegramChatId: el('fieldTelegramChatId').value.trim(),
    logoURL: el('logoURL').value.trim(),
    logoBase64: currentProfile.logoBase64 || null,
    themeColor: el('colorPicker').value,
    themeHue: el('hueRange').value,
    updated: new Date().toISOString()
  };

  // Save locally
  localStorage.setItem('omni_contractor_profile', JSON.stringify(profile));
  currentProfile = profile;

  // Send to server
  const res = await api('/api/contractor', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(profile) });
  if (res && res.ok) {
    showToast('Profile saved. Admin will be notified.');
    renderPreview();
  } else {
    showToast('Failed to save profile (server). Saved locally.');
  }
}

/* ---------- logo handling ---------- */
let selectedLogoFile = null;
function handleLogoSelect(e){
  const f = e.target.files?.[0];
  if (!f) return;
  selectedLogoFile = f;
  // preview via FileReader
  const reader = new FileReader();
  reader.onload = () => {
    setLogoPreview(reader.result);
    // store base64 temporarily
    currentProfile.logoBase64 = reader.result;
    localStorage.setItem('omni_contractor_profile', JSON.stringify(currentProfile));
  };
  reader.readAsDataURL(f);
}

function setLogoPreview(src) {
  const logoEl = el('logoPreview');
  const previewLogo = el('previewLogo');
  if (src.startsWith('data:') || src.startsWith('http')) {
    logoEl.style.backgroundImage = `url(${src})`;
    logoEl.textContent = '';
    previewLogo.style.backgroundImage = `url(${src})`;
    previewLogo.textContent = '';
  } else {
    logoEl.style.backgroundImage = '';
    previewLogo.style.backgroundImage = '';
    logoEl.textContent = (currentProfile.name || 'OM').slice(0,2).toUpperCase();
    previewLogo.textContent = (currentProfile.name || 'OM').slice(0,2).toUpperCase();
  }
}

async function applyLogoFromInputs(){
  const url = el('logoURL').value.trim();
  if (url) {
    currentProfile.logoURL = url;
    currentProfile.logoBase64 = currentProfile.logoBase64 || null;
    localStorage.setItem('omni_contractor_profile', JSON.stringify(currentProfile));
    setLogoPreview(url);
    showToast('Logo applied from URL. Save profile to persist.');
    return;
  }
  if (currentProfile.logoBase64) {
    showToast('Embedded logo ready. Save profile to persist.');
    return;
  }
  showToast('No logo provided. Choose a file or paste a URL.');
}

/* ---------- messages (contractor -> admin) ---------- */
async function sendMessageToAdmin(){
  const msg = el('msgInput').value.trim();
  if (!msg) return;
  // require profile id or phone
  const payload = { contractorId: currentProfile.id || currentProfile.phone || 'unknown', message: msg };
  const res = await api('/api/message', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
  if (res && res.ok) {
    appendChat(`You: ${msg}`);
    el('msgInput').value = '';
    showToast('Message sent to admin.');
  } else {
    showToast('Failed to send message.');
  }
}

function appendChat(text){
  const box = el('chatBox');
  const d = document.createElement('div');
  d.textContent = text;
  d.style.marginBottom = '6px';
  box.prepend(d);
}

/* populate chat history from logs */
async function renderChatHistory(){
  const logs = await api('/api/logs/messages');
  if (!Array.isArray(logs)) return;
  // show last 30
  const last = logs.filter(l => (l.contractorId === currentProfile.id || l.contractorId === currentProfile.phone)).slice(0,30);
  const box = el('chatBox'); box.innerHTML = '';
  last.forEach(l => {
    const d = document.createElement('div');
    d.textContent = `${new Date(l.ts||l.created_at||Date.now()).toLocaleString()} — ${l.message || JSON.stringify(l)}`;
    box.appendChild(d);
  });
}

/* ---------- reviews ---------- */
async function renderContractorReviews(){
  const revs = await api('/api/logs/reviews');
  const list = el('reviewsList');
  list.innerHTML = '';
  if (!Array.isArray(revs) || revs.length === 0){ list.innerHTML = '<div class="muted small">No reviews yet</div>'; return; }
  const mine = revs.filter(r => r.contractor === (currentProfile.id || currentProfile.phone) || r.contractor === currentProfile.id);
  (mine.slice(0,30)).forEach(r=>{
    const div = document.createElement('div'); div.className = 'review';
    div.innerHTML = `<strong>${r.name||r.reviewer||'Customer'}</strong> — ⭐ ${r.rating||r.stars||5}<div class="muted small">${r.comment||r.text||''}</div>`;
    if (r.images && r.images.length) {
      const imgWrap = document.createElement('div'); imgWrap.style.display='flex'; imgWrap.style.gap='6px'; imgWrap.style.marginTop='6px';
      r.images.forEach(u=>{
        const i = document.createElement('img'); i.src = u; i.style.width='72px'; i.style.height='54px'; i.style.objectFit='cover'; i.style.borderRadius='6px';
        imgWrap.appendChild(i);
      });
      div.appendChild(imgWrap);
    }
    list.appendChild(div);
  });
}

/* submit review (uses /api/review with FormData) */
async function submitReview(){
  const name = el('reviewName').value.trim();
  const stars = el('reviewStars').value;
  const comment = el('reviewComment').value.trim();
  const files = el('reviewImages').files;

  // FormData send to /api/review (server handles multer)
  const fd = new FormData();
  fd.append('contractor', currentProfile.id || currentProfile.phone || 'unknown');
  fd.append('name', name || 'Client');
  fd.append('rating', stars);
  fd.append('comment', comment);
  for (let i=0;i<files.length;i++) fd.append('images', files[i]);

  const res = await fetch('/api/review', { method:'POST', body: fd });
  const data = await res.json();
  if (data && data.ok) {
    showToast('Review submitted. It may be pending moderation.');
    el('reviewName').value=''; el('reviewComment').value=''; el('reviewImages').value='';
    renderContractorReviews();
  } else {
    showToast('Failed to submit review.');
  }
}

/* ---------- analytics placeholder (tiny chart) ---------- */
function drawChart(){
  const c = el('leadsChart'); if (!c) return;
  const ctx = c.getContext('2d');
  // sample data
  const values = [2,4,1,5,3,6,4];
  const w = c.width; const h = c.height;
  ctx.clearRect(0,0,w,h);
  ctx.fillStyle = 'rgba(111,76,255,0.08)';
  ctx.fillRect(0,0,w,h);
  // draw bars
  const barW = w / values.length;
  ctx.fillStyle = '#6f4cff';
  values.forEach((v,i)=>{
    const bh = (v / 8) * (h-20);
    ctx.fillRect(i*barW + 8, h - bh - 10, barW - 16, bh);
  });
}

/* ---------- profile preview & theme ---------- */
function renderPreview(){
  el('previewName').textContent = currentProfile.name || 'Your Company';
  el('previewService').textContent = currentProfile.service || 'Service category';
  el('previewRating').textContent = `⭐ ${currentProfile.rating || 4.8} (demo)`;
  if (currentProfile.logoBase64) setLogoPreview(currentProfile.logoBase64);
  applyTheme(el('colorPicker').value, el('hueRange').value);
}

function applyTheme(color, hue){
  document.documentElement.style.setProperty('--accent', color || '#6f4cff');
  document.documentElement.style.setProperty('--accent-hue', hue || 240);
}

/* open public contractor page */
function openPublicPage(){
  const id = currentProfile.id || currentProfile.phone || '';
  if (!id) return showToast('No profile id yet — save profile first.');
  window.open(`/c/${id}`, '_blank');
}

/* ---------- utility: find profile id from local storage ---------- */
window.saveProfileLocally = saveProfile;

// run some initial renders
setTimeout(()=>{
  drawChart();
}, 600);
