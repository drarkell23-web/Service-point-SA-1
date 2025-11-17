// assets/main.js
// Handles loading services, contractors, reviews + UI interactions

const API = {
  services: '/api/services',
  contractors: '/api/contractors',
  reviews: '/api/reviews',
  lead: '/api/lead'
};

let SERVICES = [];
let CONTRACTORS = [];
let REVIEWS = [];
let filteredServices = [];
let page = 1;
const PER_PAGE = 24;

document.addEventListener('DOMContentLoaded', async () => {
  await loadServices();
  await loadContractors();
  await loadReviews();
  wireUI();
  renderCategories();
  applySearchFromQuery();
});

async function loadServices(){
  try{
    const r = await fetch(API.services);
    const j = await r.json();
    SERVICES = (j.services || j || []);
    filteredServices = SERVICES.slice();
    renderServices();
    renderPagination();
    populateServiceSelect();
  }catch(e){ console.warn('services load failed', e); document.getElementById('servicesGrid').textContent = 'Services unavailable.' }
}

async function loadContractors(){
  try{
    const r = await fetch(API.contractors);
    const j = await r.json();
    CONTRACTORS = (j.contractors || j || []);
    renderTopContractors();
  }catch(e){ console.warn('contractors load failed', e) }
}

async function loadReviews(){
  try{
    const r = await fetch(API.reviews);
    const j = await r.json();
    REVIEWS = (j.reviews || j || []);
    renderTestimonials();
  }catch(e){ console.warn('reviews load failed', e) }
}

/* UI wiring */
function wireUI(){
  document.getElementById('searchBtn').addEventListener('click', onSearch);
  document.getElementById('searchInput').addEventListener('keydown', (e)=>{ if(e.key==='Enter') onSearch() });

  // chat open/close
  document.getElementById('chatOpen').addEventListener('click', ()=> {
    document.getElementById('chatModal').classList.remove('hidden');
    addBotMessage('Hi — tell me what you need or choose a service.');
  });
  document.getElementById('chatClose').addEventListener('click', ()=> document.getElementById('chatModal').classList.add('hidden'));

  // lead form submit (chat)
  const leadForm = document.getElementById('leadForm');
  leadForm.addEventListener('submit', async (ev)=>{
    ev.preventDefault();
    await submitLeadFromChat();
  });
}

/* search */
function onSearch(){
  const q = document.getElementById('searchInput').value.trim().toLowerCase();
  if(!q){ filteredServices = SERVICES.slice(); page=1; renderServices(); renderPagination(); return; }
  filteredServices = SERVICES.filter(s => (s.name||'').toLowerCase().includes(q) || (s.category||'').toLowerCase().includes(q));
  page = 1; renderServices(); renderPagination();
}

/* render categories */
function renderCategories(){
  const cats = {};
  SERVICES.forEach(s => {
    const c = s.category || 'Other';
    cats[c] = (cats[c] || 0) + 1;
  });

  const wrapper = document.getElementById('sidebarCats');
  wrapper.innerHTML = '';
  Object.keys(cats).sort().forEach(cat => {
    const btn = document.createElement('div');
    btn.className = 'cat-btn';
    btn.innerHTML = `<span>${cat}</span><span class="cat-count">${cats[cat]}</span>`;
    btn.addEventListener('click', ()=> { filteredServices = SERVICES.filter(x => (x.category||'')===cat); page=1; renderServices(); renderPagination(); });
    wrapper.appendChild(btn);
  });

  const allBtn = document.createElement('div');
  allBtn.className = 'cat-btn';
  allBtn.style.marginTop = '12px';
  allBtn.textContent = 'All Services';
  allBtn.addEventListener('click', ()=>{ filteredServices = SERVICES.slice(); page=1; renderServices(); renderPagination(); });
  wrapper.prepend(allBtn);
}

/* render services (paged) */
function renderServices(){
  const grid = document.getElementById('servicesGrid');
  grid.innerHTML = '';

  const start = (page-1)*PER_PAGE;
  const pageItems = filteredServices.slice(start, start+PER_PAGE);

  pageItems.forEach(s=>{
    const div = document.createElement('div');
    div.className = 'service-pill';
    div.innerHTML = `<div class="service-title">${escapeHtml(s.name||'Unnamed')}</div><div class="service-sub">${escapeHtml(s.category||'')}</div>`;
    div.addEventListener('click', ()=> onServiceClick(s));
    grid.appendChild(div);
  });

  if(pageItems.length===0){
    grid.innerHTML = '<div style="color:var(--muted);padding:12px">No services found.</div>';
  }
}

/* pagination */
function renderPagination(){
  const total = Math.ceil(filteredServices.length / PER_PAGE);
  const el = document.getElementById('pagination');
  el.innerHTML = '';
  if(total<=1) return;

  for(let i=1;i<=total;i++){
    const b = document.createElement('button');
    b.className = 'page-btn' + (i===page ? ' active':'' );
    b.textContent = i;
    b.addEventListener('click', ()=> { page = i; renderServices(); renderPagination(); });
    el.appendChild(b);
  }
}

/* top contractors */
function renderTopContractors(){
  const contEl = document.getElementById('topContractors');
  contEl.innerHTML = '';
  const top = (CONTRACTORS.slice(0,6));
  top.forEach(c=>{
    const row = document.createElement('div');
    row.className = 'contractor-row';
    row.innerHTML = `<img src="${c.logo_url || 'assets/anon.png'}" /><div style="flex:1"><strong>${escapeHtml(c.company||c.name||'Contractor')}</strong><div class="muted">${escapeHtml(c.main_service || c.service || '')}</div></div>`;
    row.addEventListener('click', ()=> window.location.href = `/c.html?id=${c.id}`);
    contEl.appendChild(row);
  });
}

/* testimonials */
function renderTestimonials(){
  const el = document.getElementById('testimonials');
  el.innerHTML = '';
  (REVIEWS || []).slice(0,6).forEach(r => {
    const node = document.createElement('div');
    node.className = 'test';
    node.innerHTML = `<div style="font-weight:600">${escapeHtml(r.reviewer_name || r.name || '')}</div><div style="margin-top:6px;color:var(--muted)">${escapeHtml(r.comment || r.review || '')}</div>`;
    el.appendChild(node);
  });
}

/* service click opens chat and preselects service */
function onServiceClick(s){
  // open chat
  document.getElementById('chatModal').classList.remove('hidden');
  addBotMessage(`You selected <strong>${s.name}</strong>. Pick a contractor or send request.`);
  // prefill service
  const leadService = document.getElementById('leadService');
  leadService.innerHTML = `<option value="${escapeHtml(s.name)}">${escapeHtml(s.name)}</option>`;
  // show contractor options for this service
  showContractorOptionsForService(s);
}

/* populate chat service select (and search) */
function populateServiceSelect(){
  const sel = document.getElementById('leadService');
  sel.innerHTML = '<option value="">Select service</option>';
  (SERVICES.slice(0,400)).forEach(s=>{
    const o = document.createElement('option');
    o.value = s.name;
    o.textContent = s.name;
    sel.appendChild(o);
  });
}

/* show contractor options for a service */
function showContractorOptionsForService(s){
  const holder = document.getElementById('contractorOptions');
  holder.innerHTML = '';
  const matches = (CONTRACTORS||[]).filter(c => {
    const svc = (c.service || c.main_service || '').toLowerCase();
    return svc.includes((s.name||'').split(' ')[0].toLowerCase());
  });

  const top = matches.length ? matches.slice(0,5) : (CONTRACTORS||[]).slice(0,5);

  top.forEach(c => {
    const card = document.createElement('div');
    card.className = 'contractor-card';
    card.innerHTML = `<div><strong>${escapeHtml(c.company||c.name||'Contractor')}</strong><div class="meta">${escapeHtml(c.main_service || c.service || '')}</div></div><button class="btn small">Pick</button>`;
    card.querySelector('button').addEventListener('click', ()=>{
      // set selected contractor in form hidden field
      document.getElementById('contractorIdHidden').value = c.id;
      addBotMessage(`You chose <strong>${escapeHtml(c.company||c.name)}</strong>. I will attempt to send lead to them.`);
    });
    holder.appendChild(card);
  });

  // if none, show message
  if(top.length===0) holder.innerHTML = '<div style="color:var(--muted)">No contractors specific to this service — we will find the best fit.</div>';
}

/* chat flow helper messages */
function addBotMessage(text){
  const flow = document.getElementById('chatFlow');
  const d = document.createElement('div');
  d.className = 'msg bot';
  d.innerHTML = text;
  flow.appendChild(d);
  flow.scrollTop = flow.scrollHeight;
}
function addUserMessage(text){
  const flow = document.getElementById('chatFlow');
  const d = document.createElement('div');
  d.className = 'msg user';
  d.textContent = text;
  flow.appendChild(d);
  flow.scrollTop = flow.scrollHeight;
}

/* submit lead from chat */
async function submitLeadFromChat(){
  const name = document.getElementById('leadName').value.trim();
  const phone = document.getElementById('leadPhone').value.trim();
  const email = document.getElementById('leadEmail').value.trim();
  const service = document.getElementById('leadService').value.trim();
  const message = document.getElementById('leadMessage').value.trim();
  const contractor_id = document.getElementById('contractorIdHidden').value || null;

  if(!name || !phone || !service){
    addBotMessage('Please enter your name, phone and a service.');
    return;
  }

  addUserMessage(`${name} — ${phone}`);
  addBotMessage('Sending your request...');

  try{
    const res = await fetch(API.lead, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, email, service, message, contractor_id })
    });
    const j = await res.json();
    if(j.ok){
      addBotMessage('✅ Request sent. You will be contacted shortly.');
      document.getElementById('leadForm').reset();
      document.getElementById('contractorOptions').innerHTML = '';
      setTimeout(()=> document.getElementById('chatModal').classList.add('hidden'), 1300);
    } else {
      addBotMessage('❌ Failed to send lead — please try again.');
      console.error(j);
    }
  }catch(err){
    addBotMessage('Network error sending lead.');
    console.error(err);
  }
}

/* apply search from querystring if present */
function applySearchFromQuery(){
  const qp = new URLSearchParams(location.search);
  const q = qp.get('q');
  if(q){
    document.getElementById('searchInput').value = q;
    onSearch();
  }
}

/* simple escaping */
function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c]); }
