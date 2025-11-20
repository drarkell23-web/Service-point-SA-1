// main.js — drives the main page UI and loads data from /api or local /data fallbacks
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('year').innerText = new Date().getFullYear();

  // wire top search
  document.getElementById('searchBtn').addEventListener('click', () => {
    const q = document.getElementById('searchInput').value.trim().toLowerCase();
    if (q) filterServices(q);
  });

  // load
  await loadServices();
  await loadContractors();
  await loadReviews();
  await loadStats();

  // open chat
  document.getElementById('chatOpen').addEventListener('click', () => {
    document.getElementById('chatWidget').style.display = 'flex';
  });
});

// fetch helper that falls back to /data JSON if API 404
async function safeFetch(url){
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const j = await r.json();
    return j;
  } catch(e){
    console.warn('safeFetch fail',url,e);
    return null;
  }
}

/* =========================
   SERVICES
   ========================= */
let SERVICES = [];
async function loadServices(){
  // try API, else data file
  let j = await safeFetch('/api/services');
  if (!j) j = await safeFetch('/data/services.json');
  SERVICES = (j && (j.services || j)) || [];
  renderCategories(SERVICES);
  renderServicePills(SERVICES);
  populateServiceSelect(SERVICES);
}

function renderServicePills(services){
  const container = document.getElementById('servicePills');
  container.innerHTML = '';
  // show compact set (first 80 or so)
  (services || []).slice(0, 120).forEach(s => {
    const el = document.createElement('div');
    el.className = 'service-pill';
    el.innerHTML = `<div class="name">${s.name}</div><div class="cat">${s.category || ''}</div>`;
    el.addEventListener('click', () => {
      openChatWithService(s);
    });
    container.appendChild(el);
  });
}

function filterServices(q){
  const filtered = SERVICES.filter(s => (s.name||'').toLowerCase().includes(q) || (s.category||'').toLowerCase().includes(q));
  renderServicePills(filtered);
}

/* =========================
   CATEGORIES (left sidebar)
   ========================= */
function renderCategories(services){
  const cats = Array.from(new Set((services||[]).map(s => s.category || 'Other')));
  const list = document.getElementById('categoriesList');
  list.innerHTML = '';
  cats.forEach(cat => {
    const count = services.filter(s => (s.category || '') === cat).length;
    const item = document.createElement('div');
    item.className = 'category-item';
    item.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;"><span>${cat}</span><span style="opacity:.7">${count}</span></div>`;
    item.addEventListener('click', ()=> {
      // open small dropdown modal / show only services in this category
      const filtered = SERVICES.filter(s => (s.category || '') === cat);
      renderServicePills(filtered);
    });
    list.appendChild(item);
  });
}

/* =========================
   CONTRACTORS
   ========================= */
let CONTRACTORS = [];
async function loadContractors(){
  let j = await safeFetch('/api/contractors');
  if (!j) j = await safeFetch('/data/contractors.json');
  CONTRACTORS = (j && (j.contractors || j)) || [];
  renderTopContractors();
}

function renderTopContractors(){
  const el = document.getElementById('topContractors');
  el.innerHTML = '';
  const top = (CONTRACTORS || []).slice(0,6);
  top.forEach(c => {
    const node = document.createElement('div');
    node.className = 'contractor-card';
    node.innerHTML = `<img src="${c.logo || 'assets/placeholder.png'}" alt=""><div class="meta"><strong>${c.company||c.name}</strong><div class="muted">${c.service||''}</div></div>`;
    node.addEventListener('click', ()=> window.location.href = `/c/${c.id || c.auth_id || ''}`);
    el.appendChild(node);
  });

  document.getElementById('stat-contractors').innerText = (CONTRACTORS||[]).length;
}

/* =========================
   REVIEWS / TESTIMONIALS
   ========================= */
async function loadReviews(){
  let j = await safeFetch('/api/reviews');
  if (!j) j = await safeFetch('/data/reviews.json');
  const reviews = (j && (j.reviews || j)) || [];
  const el = document.getElementById('testimonials');
  el.innerHTML = '';
  reviews.slice(0,4).forEach(r => {
    const d = document.createElement('div');
    d.className = 'note';
    d.innerHTML = `<strong>${r.reviewer_name||r.name||'Customer'}</strong><div style="margin-top:6px">${(r.comment||r.review||'Great job!').slice(0,160)}</div>`;
    el.appendChild(d);
  });
}

/* =========================
   STATS (simple counts)
   ========================= */
async function loadStats(){
  // leads count: attempt API route else fallback to data/leads.json
  try {
    const res = await fetch('/api/leads');
    if (res.ok){
      const j = await res.json();
      document.getElementById('stat-leads').innerText = (j.leads || j).length || 0;
      return;
    }
  } catch(e) {}
  // fallback to data file
  try {
    const j = await fetch('/data/leads.json').then(r=>r.json()).catch(()=>[]);
    document.getElementById('stat-leads').innerText = (j.length || 0);
  } catch(e){ document.getElementById('stat-leads').innerText = 0; }
}

/* =========================
   Helpers to open chat prefilled
   ========================= */
function openChatWithService(s){
  const chat = document.getElementById('chatWidget');
  chat.style.display = 'flex';
  addBotMessage(`You selected <strong>${s.name}</strong>. Tell me a little about the job and I'll send the lead.`);
  const select = document.getElementById('leadService');
  select.value = s.name;
  document.getElementById('contractorPick').style.display = 'block';
  showContractorOptionsForService(s);
}

/* populate chat service select */
function populateServiceSelect(services){
  const sel = document.getElementById('leadService');
  sel.innerHTML = '<option value="">Select a service</option>';
  (services || []).slice(0,400).forEach(s=>{
    const o = document.createElement('option');
    o.value = s.name;
    o.textContent = `${s.name} — ${s.category||''}`;
    sel.appendChild(o);
  });
}
