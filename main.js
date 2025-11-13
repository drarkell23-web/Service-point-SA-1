// main.js - main UI glue for homepage
// Assumes services.js is loaded and window.SERVICES is available.
// Sends leads to /api/lead (server) and optionally to Telegram directly (disabled by default).
// Replace ADMIN_VISIBLE = true to show Admin button (be cautious).
// TELEGRAM direct-send is disabled by default (recommended).

const ADMIN_VISIBLE = false; // set true only if you want Admin button visible (or server.api-admin-secret)
const TELEGRAM_DIRECT_SEND = false; // DANGEROUS - don't enable unless you understand token will be public
const TELEGRAM_BOT_TOKEN = ""; // leave blank; if you set TELEGRAM_DIRECT_SEND=true, set token here
const TELEGRAM_CHAT_ID = "8187670531"; // admin/chat id (as provided)

/* ---- UTILS ---- */
function el(q,root=document) { return root.querySelector(q) }
function elAll(q,root=document){ return Array.from(root.querySelectorAll(q)) }

/* ---- Sidebar ----- */
(function buildSidebar(){
  const container = document.getElementById('categoriesRoot');
  // group by cat
  const map = {};
  (window.SERVICES||[]).forEach(s => {
    if (!map[s.cat]) map[s.cat] = [];
    map[s.cat].push(s);
  });
  Object.keys(map).forEach(cat => {
    const group = document.createElement('div'); group.className='cat-group';
    const head = document.createElement('div'); head.className='cat-head'; head.innerHTML = `<span>${cat}</span><span class="chev">▸</span>`;
    const items = document.createElement('div'); items.className='cat-items';
    map[cat].forEach(s=>{
      const b = document.createElement('div'); b.className='cat-item'; b.textContent = s.name; b.dataset.sid = s.id;
      b.addEventListener('click', ()=> { openService(s); });
      items.appendChild(b);
    });
    head.addEventListener('click', ()=> {
      const open = items.style.display === 'flex';
      items.style.display = open ? 'none' : 'flex';
      head.querySelector('.chev').textContent = open ? '▸' : '▾';
    });
    group.appendChild(head);
    group.appendChild(items);
    container.appendChild(group);
  });

  // admin visibility
  if (ADMIN_VISIBLE) {
    el('#btnAdmin').style.display = "inline-block";
  }
})();

/* ---- Popular services grid ---- */
(function buildPopularGrid(){
  const grid = el('#popularGrid');
  const top = (window.SERVICES||[]).slice(0, 36);
  top.forEach(s => {
    const tile = document.createElement('div'); tile.className='service-tile';
    tile.innerHTML = `<div class="service-name">${s.name}</div><div class="service-meta">${s.cat}</div><div style="flex:1"></div><button class="choose-btn">Choose</button>`;
    tile.querySelector('.choose-btn').addEventListener('click', ()=> openService(s));
    grid.appendChild(tile);
  });
})();

/* ---- Top contractors (dummy data) ---- */
(function buildTopContractors(){
  const wrap = el('#topContractorsRow');
  const sample = [
    { id:'c1', company:'Premier Plumbing', phone:'072 555 111', rating:4.9, badge:'platinum' },
    { id:'c2', company:'Shield Security', phone:'072 555 222', rating:4.8, badge:'gold' },
    { id:'c3', company:'Fresh Cleaners', phone:'072 555 333', rating:4.7, badge:'silver' },
  ];
  sample.forEach(c=>{
    const card = document.createElement('div'); card.className='contractor-card';
    card.innerHTML = `<img class="logo" src="/data/uploads/assets/ChatGPT_Image_Nov_13_2025_05_08_40_AM.png" alt="logo"><div class="contractor-info"><div class="contractor-name">${c.company}</div><div class="contractor-meta">${c.phone} • ⭐ ${c.rating}</div></div><div><img class="badge-img" style="width:44px;height:44px" src="/data/uploads/assets/badges/${c.badge}.png" alt="${c.badge}"></div>`;
    card.addEventListener('click', ()=> openService({ id:'', cat:'Top Contractors', name: c.company }));
    wrap.appendChild(card);
  });
})();

/* ---- Testimonials ---- */
(function buildTestimonials(){
  const wrap = el('#testimonialsRow');
  const t = [
    { name:'Janine P', text:'Quick, professional and affordable.' },
    { name:'Sipho M', text:'Amazing response and punctual.' },
    { name:'Daniela R', text:'Very happy with the job done. Highly recommended.' }
  ];
  t.forEach(x=>{
    const c = document.createElement('div'); c.className='test-card';
    c.innerHTML = `<div style="font-weight:800">${x.name}</div><div class="small-muted">${x.text}</div>`;
    wrap.appendChild(c);
  });
})();

/* ---- Service open / modal / chat flow ---- */
function openService(s){
  // set chosen service for chat
  el('#chosenService').textContent = s.name + " — " + s.cat;
  // find contractors matching
  const contractors = (window.CONTRACTORS || [
    { id:'c1', company:'Premier Plumbing', phone:'072555111', rating:4.9, badge:'platinum' },
    { id:'c4', company:'Quick Fix', phone:'072555777', rating:4.6, badge:'silver' }
  ]);
  const matched = contractors.filter(c => (c.company && c.company.toLowerCase().includes(s.cat.split(' ')[0].toLowerCase())) || true ).slice(0,6);
  const top3 = matched.sort((a,b)=> (b.rating||0)-(a.rating||0)).slice(0,3);
  const topWrap = el('#chatTop3'); topWrap.innerHTML='';
  top3.forEach(c=>{
    const d = document.createElement('div'); d.className='mini-panel'; d.innerHTML = `<strong>${c.company}</strong><div class="small-muted">⭐ ${c.rating} • ${c.phone}</div>`;
    topWrap.appendChild(d);
  });

  // show chat modal
  el('#chatModal').style.display = 'block';
  el('#chatModal').setAttribute('aria-hidden','false');
  el('#chatStepService').style.display = 'block';
  el('#leadForm').style.display = 'none';
  el('#chatResult').style.display = 'none';
}

/* chat btns */
el('#chatToggle').addEventListener('click', ()=> {
  const vis = el('#chatModal').style.display === 'block';
  el('#chatModal').style.display = vis ? 'none' : 'block';
});
el('#chatClose').addEventListener('click', ()=> el('#chatModal').style.display = 'none');

el('#btnProceed').addEventListener('click', ()=> {
  el('#chatStepService').style.display = 'none';
  el('#leadForm').style.display = 'block';
});

/* back from lead form */
el('#btnBack').addEventListener('click', ()=> {
  el('#leadForm').style.display = 'none';
  el('#chatStepService').style.display = 'block';
});

/* submit lead */
el('#leadForm').addEventListener('submit', async (e)=> {
  e.preventDefault();
  const fd = new FormData(e.target);
  const payload = {
    name: fd.get('name'),
    phone: fd.get('phone'),
    email: fd.get('email'),
    address: fd.get('address'),
    when: fd.get('when'),
    details: fd.get('details'),
    service: el('#chosenService').textContent,
    source: 'web'
  };

  // POST to server API (recommended)
  try {
    const res = await fetch('/api/lead', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload) });
    const j = await res.json();
    if (j && j.ok) {
      showChatResult(true);
      // optionally send directly to telegram if enabled (dangerous)
      if (TELEGRAM_DIRECT_SEND && TELEGRAM_BOT_TOKEN) {
        const text = `<b>New lead</b>\n${payload.name}\n${payload.phone}\nService: ${payload.service}\n${payload.details}`;
        fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode:'HTML' })});
      }
    } else {
      showChatResult(false);
    }
  } catch (err) {
    console.error(err);
    showChatResult(false);
  }
});

function showChatResult(ok){
  el('#leadForm').style.display = 'none';
  el('#chatStepService').style.display = 'none';
  const r = el('#chatResult'); r.style.display = 'block';
  if (ok) r.innerHTML = `<div class="mini-panel"><strong>✅ Request sent</strong><div class="small-muted">Contractors will contact you shortly.</div></div>`;
  else r.innerHTML = `<div class="mini-panel"><strong>❌ Failed to send</strong><div class="small-muted">Try again later.</div></div>`;
}

/* small helpers for service modal (if used) */
el('#closeServiceModal')?.addEventListener('click', ()=> { el('#serviceModal').style.display = 'none'; });
