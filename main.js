// main.js — homepage logic: loads /api/services and /api/contractors, handles chatbot modal and lead submit

const categoriesListEl = document.getElementById('categoriesList');
const servicesGrid = document.getElementById('servicesGrid');
const bubbleList = document.getElementById('bubbleList');
const topContractorsEl = document.getElementById('topContractors');
const testimonialsEl = document.getElementById('reviewsCarousel');
const siteLeadsCount = document.getElementById('siteLeadsCount');
const siteContractorsCount = document.getElementById('siteContractorsCount');

const leadModal = document.getElementById('leadModal');
const closeLeadModal = document.getElementById('closeLeadModal');
const leadForm = document.getElementById('leadForm');
const leadResult = document.getElementById('leadResult');

let SERVICES = [];
let CONTRACTORS = [];
let REVIEWS = [];

/* basic fetch wrapper */
async function api(path, opts={}) {
  try {
    const r = await fetch(path, opts);
    if (!r.ok) throw new Error('api error');
    return await r.json();
  } catch (e) {
    console.warn('api failed', path, e);
    return null;
  }
}

/* load initial content */
async function loadAll(){
  const s = await api('/api/services');
  if (s && s.services) SERVICES = s.services;
  const c = await api('/api/contractors');
  if (c && c.contractors) CONTRACTORS = c.contractors;
  const reviewsRaw = await api('/api/logs/reviews') || {};
  REVIEWS = Array.isArray(reviewsRaw) ? reviewsRaw : [];

  renderCategories();
  renderServices(SERVICES.slice(0, 36));
  renderBubbles();
  renderTopContractors();
  renderTestimonials();
  siteLeadsCount.textContent = (await api('/api/logs/leads')) ? (await api('/api/logs/leads')).length : '—';
  siteContractorsCount.textContent = CONTRACTORS.length || 0;
}
loadAll();

/* categories extraction */
function getCategories(){
  const cats = {};
  SERVICES.forEach(s => {
    if (!cats[s.cat]) cats[s.cat] = [];
    cats[s.cat].push(s);
  });
  return cats;
}

function renderCategories(){
  const cats = getCategories();
  categoriesListEl.innerHTML = '';
  Object.entries(cats).forEach(([name, items])=>{
    const el = document.createElement('div');
    el.className = 'cat';
    el.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center"><div>${name}</div><div class="muted">${items.length}</div></div>`;
    el.addEventListener('click', ()=> {
      renderServices(items);
      // scroll main to top
      window.scrollTo({top:0,behavior:'smooth'});
    });
    categoriesListEl.appendChild(el);
  });
}

/* services rendering */
function renderServices(list){
  servicesGrid.innerHTML = '';
  (list || []).forEach(s => {
    const card = document.createElement('div');
    card.className = 'service-card';
    card.innerHTML = `<div><div class="title">${s.name}</div><div class="desc muted">${s.cat}</div></div><div class="service-actions"><button class="btn-choose">Chat</button><button class="btn-quick">Details</button></div>`;
    card.querySelector('.btn-choose').addEventListener('click', ()=> openLeadModal(s.name));
    servicesGrid.appendChild(card);
  });
}

/* bubbles: show highlighted contractors or promotions on right */
function renderBubbles(){
  bubbleList.innerHTML = '';
  const top = CONTRACTORS.slice(0,8);
  top.forEach(c => {
    const b = document.createElement('div'); b.className='bubble';
    b.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center"><div><strong>${c.company||c.name}</strong><div class="muted">${c.category||''}</div></div><div class="muted">⭐ ${c.rating||4.6}</div></div>`;
    b.addEventListener('click', ()=> {
      // go to contractor public page
      window.location.href = `/c/${c.id}`;
    });
    bubbleList.appendChild(b);
  });
}

/* top contractors */
function renderTopContractors(){
  topContractorsEl.innerHTML = '';
  const top = CONTRACTORS.slice(0,6);
  top.forEach(c=>{
    const el = document.createElement('div'); el.style.marginBottom='6px';
    el.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center"><div><strong>${c.company||c.name}</strong><div class="muted">${c.category}</div></div><div><a href="/c/${c.id}" class="btn-quick">View</a></div></div>`;
    topContractorsEl.appendChild(el);
  });
}

/* testimonials */
function renderTestimonials(){
  testimonialsEl.innerHTML = '';
  const reviews = REVIEWS.slice(0,6);
  if (!reviews.length) { testimonialsEl.innerHTML='<div class="muted">No reviews yet</div>'; return; }
  reviews.forEach(r=>{
    const el = document.createElement('div'); el.style.marginBottom='8px';
    el.innerHTML = `<div><strong>${r.reviewer||'Customer'}</strong> <span class="muted">• ${new Date(r.ts||r.created||Date.now()).toLocaleDateString()}</span><div class="muted">${r.comment||r.text}</div></div>`;
    testimonialsEl.appendChild(el);
  });
}

/* lead modal handlers */
function openLeadModal(serviceName){
  document.getElementById('leadService').value = serviceName;
  leadResult.textContent = '';
  leadModal.classList.remove('hidden');
}
closeLeadModal.addEventListener('click', ()=> leadModal.classList.add('hidden'));
document.getElementById('leadCancel').addEventListener('click', ()=> leadModal.classList.add('hidden'));

leadForm.addEventListener('submit', async (e)=>{
  e.preventDefault();
  leadResult.textContent = 'Sending...';
  const form = new FormData(leadForm);
  const payload = {
    name: form.get('name'),
    phone: form.get('phone'),
    email: form.get('email'),
    service: form.get('service'),
    details: form.get('details'),
    contractorId: null
  };

  // Attempt server POST
  try {
    const res = await fetch('/api/lead', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    if (res.ok) {
      leadResult.textContent = 'Request sent — contractor will be notified. You will also receive confirmation.';
      leadForm.reset();
      // increment locally
      siteLeadsCount.textContent = (parseInt(siteLeadsCount.textContent) || 0) + 1;
      setTimeout(()=> leadModal.classList.add('hidden'), 1400);
      return;
    } else {
      throw new Error('server error');
    }
  } catch (err) {
    console.warn('lead send failed', err);
    // fallback: if contractor email exist open mailto; otherwise copy to clipboard
    leadResult.textContent = 'Server unreachable — attempting email fallback...';
    const contractors = CONTRACTORS;
    const contractor = contractors.find(c => (c.category||'').toLowerCase() === (payload.service||'').toLowerCase()) || contractors[0];
    if (contractor && contractor.email) {
      const subj = encodeURIComponent(`Lead: ${payload.name} — ${payload.service}`);
      const body = encodeURIComponent(`${payload.details}\n\nContact: ${payload.name}\nPhone: ${payload.phone}\nEmail: ${payload.email}`);
      window.location.href = `mailto:${contractor.email}?subject=${subj}&body=${body}`;
      leadResult.textContent = 'Opened mail app for fallback. If nothing happened, the message copied to clipboard.';
      try { await navigator.clipboard.writeText(JSON.stringify(payload)); } catch(e){}
    } else {
      try { await navigator.clipboard.writeText(JSON.stringify(payload)); leadResult.textContent = 'No server or email available — lead copied to clipboard.'; } catch(e){ leadResult.textContent = 'Failed to send lead — contact support.'; }
    }
    setTimeout(()=> leadModal.classList.add('hidden'), 1800);
  }
});

/* admin quick access (floating) */
document.getElementById('adminBtn').addEventListener('click', ()=> {
  // reveal floating admin button and navigate
  window.location.href = '/admin-dashboard.html';
});
document.getElementById('floatingAdmin').addEventListener('click', ()=> window.location.href = '/admin-dashboard.html');

/* small search */
document.getElementById('searchInput').addEventListener('input', (e)=>{
  const q = e.target.value.trim().toLowerCase();
  if (!q) return renderServices(SERVICES.slice(0,36));
  const filtered = SERVICES.filter(s => s.name.toLowerCase().includes(q) || s.cat.toLowerCase().includes(q));
  renderServices(filtered);
});
