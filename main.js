// main.js — loads services, contractors, handles lead modal & sending
const $ = id => document.getElementById(id);

let SERVICES = [];
let CONTRACTORS = [];
let SELECTED_SERVICE = null;
let TESTIMONIALS = [
  { name: "Sarah", text: "Fast, clear pricing and great contractors." },
  { name: "Thabo", text: "Saved me a fortune. Highly recommended." },
  { name: "Lina", text: "Professional and quick response." }
];

// helper: fetch JSON with fallback
async function fetchJSON(url, opts){
  try {
    const r = await fetch(url, opts);
    if (!r.ok) throw new Error('network');
    return await r.json();
  } catch (e) {
    console.warn('fetch fail', url, e);
    return null;
  }
}

/* ============================
   LOAD SERVICES & CATEGORIES
   ============================ */
async function loadServices(){
  const res = await fetchJSON('/api/services');
  SERVICES = (res && res.services) ? res.services : [];

  // standardize field names: category name is 'cat' or 'category'
  SERVICES = SERVICES.map(s => ({
    id: s.id || s.name || Math.random().toString(36).slice(2,8),
    cat: s.cat || s.category || 'Other',
    name: s.name || s.title || 'Service'
  }));

  // build categories list
  const cats = {};
  SERVICES.forEach(s => {
    if (!s.name) return;
    // remove weird endings like "service 28" (heuristic)
    s.name = s.name.replace(/\s+service\s*\d+$/i, '').trim();
    cats[s.cat] = cats[s.cat] || [];
    // prevent duplicates
    if (!cats[s.cat].some(x => x.name === s.name)) cats[s.cat].push(s);
  });

  const catEl = $('categories');
  catEl.innerHTML = '';
  Object.keys(cats).sort().forEach(cat => {
    const block = document.createElement('div'); block.className='category-block';
    const title = document.createElement('div'); title.className='category-title'; title.textContent = cat;
    const list = document.createElement('div'); list.className='category-list';
    cats[cat].forEach(srv => {
      const item = document.createElement('div'); item.className='category-item'; item.textContent = srv.name;
      item.onclick = () => filterByService(srv.name);
      list.appendChild(item);
    });
    block.appendChild(title);
    block.appendChild(list);
    catEl.appendChild(block);
  });

  // show all service cards
  renderServiceCards(SERVICES);
}

/* filter & search */
function filterByService(name){
  // scroll center and highlight matching cards (filter)
  const filtered = SERVICES.filter(s => s.name.toLowerCase().includes(name.toLowerCase()));
  renderServiceCards(filtered);
  // open modal for the exact service if name exact match exists
  const exact = SERVICES.find(s => s.name.toLowerCase() === name.toLowerCase());
  if (exact) openLeadModal(exact);
}

function renderServiceCards(list){
  const grid = $('serviceGrid');
  grid.innerHTML = '';
  if (!list || list.length === 0) {
    grid.innerHTML = '<div class="muted">No services found</div>';
    return;
  }
  list.forEach(s => {
    const card = document.createElement('div'); card.className='service-card';
    card.innerHTML = `<h4>${s.name}</h4><p>${s.cat}</p>`;
    card.onclick = () => openLeadModal(s);
    grid.appendChild(card);
  });
}

/* ============================
   LOAD CONTRACTORS (RIGHT SIDE)
   ============================ */
async function loadContractors(){
  const res = await fetchJSON('/api/contractors');
  CONTRACTORS = (res && res.contractors) ? res.contractors : [];

  // populate top contractors (first 6)
  const top = $('topContractors'); top.innerHTML = '';
  CONTRACTORS.slice(0,6).forEach(c => {
    const el = document.createElement('div'); el.className='con-card';
    const avatar = document.createElement('div'); avatar.className='con-avatar';
    if (c.logo_url) {
      avatar.style.backgroundImage = `url(${c.logo_url})`;
      avatar.style.backgroundSize = 'cover';
      avatar.textContent = '';
    } else {
      avatar.textContent = (c.name || c.company_name || 'CT').slice(0,2).toUpperCase();
    }
    const info = document.createElement('div'); info.className='con-info';
    info.innerHTML = `<b>${c.name || c.company_name || 'Contractor'}</b><div class="muted">${c.service || ''}</div><div class="muted small">☎ ${c.phone || '-'}</div>`;
    el.appendChild(avatar); el.appendChild(info);
    // clicking contractor sets the "send to" select in modal
    el.onclick = () => {
      openLeadModalForContractor(c);
    };
    top.appendChild(el);
  });
}

/* ============================
   TESTIMONIALS ROTATION
   ============================ */
function loadTestimonials(){
  const el = $('testimonials'); el.innerHTML = '';
  TESTIMONIALS.forEach(t => {
    const d = document.createElement('div'); d.className='testimonial';
    d.innerHTML = `<strong>${t.name}</strong><div class="muted small">${t.text}</div>`;
    el.appendChild(d);
  });
  // simple fade/rotate
  let idx = 0;
  setInterval(()=>{
    const nodes = el.querySelectorAll('.testimonial');
    nodes.forEach((n,i)=> n.style.display = (i === idx ? 'block' : 'none'));
    idx = (idx + 1) % nodes.length;
  }, 3800);
}

/* ============================
   LEAD MODAL
   ============================ */
function openLeadModal(serviceObj){
  SELECTED_SERVICE = serviceObj;
  $('modalService').value = serviceObj.name || serviceObj;
  $('modalName').value = '';
  $('modalPhone').value = '';
  $('modalEmail').value = '';
  $('modalMessage').value = '';
  // populate chooseContractor list
  const sel = $('chooseContractor'); sel.innerHTML = '<option value="">Send to admin (default)</option>';
  CONTRACTORS.slice(0,20).forEach(c => {
    const o = document.createElement('option'); o.value = c.id || c.phone || ''; o.textContent = `${c.name || c.company_name || 'Contractor'} — ${c.service || ''}`;
    sel.appendChild(o);
  });
  $('leadModal').classList.remove('hidden');
}

function openLeadModalForContractor(c){
  // open modal with service blank and pre-fill contractor selection
  SELECTED_SERVICE = { name: '' };
  $('modalService').value = '';
  $('modalName').value = '';
  $('modalPhone').value = '';
  $('modalEmail').value = '';
  $('modalMessage').value = '';
  const sel = $('chooseContractor'); sel.innerHTML = `<option value="${c.id || c.phone}">Send to: ${c.name || c.company_name}</option><option value="">Send to admin</option>`;
  $('leadModal').classList.remove('hidden');
}

function closeLeadModal(){
  $('leadModal').classList.add('hidden');
}

async function submitLead(){
  const payload = {
    name: $('modalName').value.trim(),
    phone: $('modalPhone').value.trim(),
    email: $('modalEmail').value.trim(),
    service: $('modalService').value || (SELECTED_SERVICE && SELECTED_SERVICE.name) || '',
    message: $('modalMessage').value.trim(),
    contractor_id: $('chooseContractor').value || null
  };

  if (!payload.name || !payload.phone) {
    alert('Please give your name and phone so contractors can contact you.');
    return;
  }

  // disable button while sending
  const btn = $('sendLeadBtn'); btn.disabled = true; btn.textContent = 'Sending...';

  const res = await fetch('/api/lead', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (res.ok) {
    alert('Lead sent — contractors and admin will be notified. Check your phone for replies.');
    closeLeadModal();
  } else {
    alert('Failed to send lead — please try again.');
  }

  btn.disabled = false; btn.textContent = 'Send Request';
}

/* ============================
   SEARCH
   ============================ */
document.addEventListener('DOMContentLoaded', ()=>{
  $('serviceSearch').addEventListener('input', (e)=>{
    const q = e.target.value.trim().toLowerCase();
    if (!q) renderServiceCards(SERVICES);
    else renderServiceCards(SERVICES.filter(s => s.name.toLowerCase().includes(q) || (s.cat||'').toLowerCase().includes(q)));
  });

  // modal send
  $('sendLeadBtn').addEventListener('click', submitLead);
  // close on ESC
  window.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') closeLeadModal(); });

  // initial loads
  loadServices();
  loadContractors();
  loadTestimonials();
});
