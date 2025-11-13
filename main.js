// main.js — hybrid main page with confetti/graffiti on lead send
const $ = id => document.getElementById(id);

let SERVICES = [];
let CONTRACTORS = [];
let SELECTED_SERVICE = null;
let TESTIMONIALS = [
  { name: "Sarah", text: "Fast, clear pricing and great contractors." },
  { name: "Thabo", text: "Saved me a fortune. Highly recommended." },
  { name: "Lina", text: "Professional and quick response." }
];

// ---------- fetch helper ----------
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

  SERVICES = SERVICES.map(s => ({
    id: s.id || s.name || Math.random().toString(36).slice(2,8),
    cat: s.cat || s.category || 'Other',
    name: s.name || s.title || 'Service'
  }));

  const cats = {};
  SERVICES.forEach(s => {
    if (!s.name) return;
    s.name = s.name.replace(/\s+service\s*\d+$/i, '').trim();
    cats[s.cat] = cats[s.cat] || [];
    if (!cats[s.cat].some(x => x.name === s.name)) cats[s.cat].push(s);
  });

  const catEl = $('categories'); catEl.innerHTML = '';
  Object.keys(cats).sort().forEach(cat => {
    const block = document.createElement('div'); block.className='category-block';
    const title = document.createElement('div'); title.className='category-title'; title.textContent = cat;
    const list = document.createElement('div'); list.className='category-list';
    cats[cat].forEach(srv => {
      const item = document.createElement('div'); item.className='category-item'; item.textContent = srv.name;
      item.onclick = () => filterByService(srv.name);
      list.appendChild(item);
    });
    block.appendChild(title); block.appendChild(list); catEl.appendChild(block);
  });

  renderServiceCards(SERVICES);
}

/* filter & render */
function filterByService(name){
  const filtered = SERVICES.filter(s => s.name.toLowerCase().includes(name.toLowerCase()));
  renderServiceCards(filtered);
  const exact = SERVICES.find(s => s.name.toLowerCase() === name.toLowerCase());
  if (exact) openLeadModal(exact);
}

function renderServiceCards(list){
  const grid = $('serviceGrid'); grid.innerHTML = '';
  if (!list || list.length === 0) { grid.innerHTML = '<div class="muted">No services found</div>'; return; }
  list.forEach(s => {
    const card = document.createElement('div'); card.className='service-card';
    card.innerHTML = `<h4>${s.name}</h4><p>${s.cat}</p>`;
    card.onclick = () => openLeadModal(s);
    grid.appendChild(card);
  });
}

/* ============================
   LOAD CONTRACTORS (RIGHT)
   ============================ */
async function loadContractors(){
  const res = await fetchJSON('/api/contractors');
  CONTRACTORS = (res && res.contractors) ? res.contractors : [];

  const top = $('topContractors'); top.innerHTML = '';
  CONTRACTORS.slice(0,6).forEach(c => {
    const el = document.createElement('div'); el.className='con-card';
    const avatar = document.createElement('div'); avatar.className='con-avatar';
    if (c.logo_url) { avatar.style.backgroundImage = `url(${c.logo_url})`; avatar.style.backgroundSize = 'cover'; avatar.textContent = ''; }
    else avatar.textContent = (c.name || c.company_name || 'CT').slice(0,2).toUpperCase();
    const info = document.createElement('div'); info.className='con-info';
    info.innerHTML = `<b>${c.name || c.company_name || 'Contractor'}</b><div class="muted">${c.service || ''}</div><div class="muted small">☎ ${c.phone || '-'}</div>`;
    el.appendChild(avatar); el.appendChild(info);
    el.onclick = () => openLeadModalForContractor(c);
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
  const sel = $('chooseContractor'); sel.innerHTML = '<option value="">Send to admin (default)</option>';
  CONTRACTORS.slice(0,20).forEach(c => {
    const o = document.createElement('option'); o.value = c.id || c.phone || ''; o.textContent = `${c.name || c.company_name || 'Contractor'} — ${c.service || ''}`;
    sel.appendChild(o);
  });
  $('leadModal').classList.remove('hidden');
}

function openLeadModalForContractor(c){
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

/* ---------- Celebration: confetti + graffiti ---------- */

/* Canvas confetti burst */
function fireConfettiBurst() {
  // create canvas if not present
  let canvas = document.getElementById('confettiCanvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'confettiCanvas';
    canvas.style.position = 'fixed';
    canvas.style.left = 0;
    canvas.style.top = 0;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);
  }
  const ctx = canvas.getContext('2d');
  const particles = [];
  const colors = ['#6f4cff','#2ec1ff','#ffd166','#ff6b6b','#7efc6b'];
  for (let i=0;i<140;i++){
    particles.push({
      x: canvas.width/2,
      y: canvas.height/3,
      vx: (Math.random()-0.5) * 8,
      vy: (Math.random()-1.5) * 8,
      r: Math.random()*6 + 4,
      color: colors[Math.floor(Math.random()*colors.length)],
      life: 80 + Math.floor(Math.random()*40)
    });
  }
  let t = 0;
  function step(){
    t++;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    for (let i=0;i<particles.length;i++){
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.18; // gravity
      p.life--;
      ctx.beginPath();
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.r, p.r*0.6);
      ctx.closePath();
    }
    // remove dead
    if (particles.every(p => p.life <= 0)) {
      canvas.remove();
      return;
    }
    requestAnimationFrame(step);
  }
  step();
}

/* Graffiti paint drops: falling colored blobs that splash */
function startGraffitiSplash(durationMs = 3000) {
  const container = document.createElement('div');
  container.className = 'graffiti-container';
  container.style.position = 'fixed';
  container.style.left = 0;
  container.style.top = 0;
  container.style.width = '100%';
  container.style.height = '100%';
  container.style.pointerEvents = 'none';
  document.body.appendChild(container);

  const colors = ['#6f4cff','#2ec1ff','#ffd166','#ff6b6b','#7efc6b','#b28bff','#ffb3e6'];
  const count = 22;
  const start = Date.now();

  function createDrop() {
    const drop = document.createElement('div');
    drop.className = 'graffiti-drop';
    const size = 16 + Math.random()*36;
    const left = Math.random()*100;
    const color = colors[Math.floor(Math.random()*colors.length)];
    drop.style.position = 'absolute';
    drop.style.left = left + 'vw';
    drop.style.top = '-50px';
    drop.style.width = size + 'px';
    drop.style.height = size + 'px';
    drop.style.borderRadius = '50%';
    drop.style.background = color;
    drop.style.opacity = 0.95;
    drop.style.transform = `translateY(0)`;
    drop.style.transition = `transform ${1.2 + Math.random()*0.8}s cubic-bezier(.2,.8,.3,1), opacity 0.6s`;
    container.appendChild(drop);

    // force reflow
    void drop.offsetWidth;
    const fallY = window.innerHeight - (50 + Math.random()*120);
    drop.style.transform = `translateY(${fallY}px)`;

    // after fall, create splash
    setTimeout(()=> {
      for (let i=0;i<6;i++){
        const s = document.createElement('div');
        s.style.width = (4+Math.random()*8) + 'px';
        s.style.height = (2+Math.random()*6) + 'px';
        s.style.position = 'absolute';
        s.style.left = (parseFloat(drop.style.left) + (Math.random()*60-30)) + 'px';
        s.style.top = (fallY + window.scrollY + 10 + Math.random()*8) + 'px';
        s.style.background = color;
        s.style.opacity = 0.9;
        s.style.borderRadius = '50%';
        s.style.transform = `translateY(0)`;
        s.style.transition = `transform ${0.9 + Math.random()*0.6}s ease-out, opacity 0.6s`;
        container.appendChild(s);
        // animate splash outwards then fade
        setTimeout(()=> s.style.transform = `translateY(${(Math.random()*-40)}px) translateX(${(Math.random()*80-40)}px)`, 30);
        setTimeout(()=> s.style.opacity = '0', 600);
        setTimeout(()=> s.remove(), 1400);
      }
      drop.style.opacity = '0'; 
      setTimeout(()=> drop.remove(), 800);
    }, 1200 + Math.random()*600);
  }

  // create drops periodically
  const it = setInterval(()=> {
    createDrop();
    if (Date.now() - start > durationMs) {
      clearInterval(it);
      setTimeout(()=> container.remove(), 1800);
    }
  }, 140);
}

/* show both effects */
function celebrate() {
  try { fireConfettiBurst(); } catch(e){ console.warn(e); }
  try { startGraffitiSplash(3600); } catch(e){ console.warn(e); }
}

/* ============================
   SUBMIT LEAD (with celebration)
   ============================ */
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

  const btn = $('sendLeadBtn'); btn.disabled = true; btn.textContent = 'Sending...';
  try {
    const res = await fetch('/api/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      // celebration
      celebrate();
      // small success UX: change button, then reset
      btn.textContent = 'Sent!';
      setTimeout(()=> {
        btn.disabled = false; btn.textContent = 'Send Request';
        closeLeadModal();
      }, 1600);
      return;
    } else {
      alert('Failed to send lead — please try again.');
    }
  } catch (e) {
    console.warn('lead send error', e);
    alert('Failed to send lead — network error.');
  } finally {
    btn.disabled = false; btn.textContent = 'Send Request';
  }
}

/* ============================
   SEARCH & INIT
   ============================ */
document.addEventListener('DOMContentLoaded', ()=>{
  $('serviceSearch').addEventListener('input', (e)=>{
    const q = e.target.value.trim().toLowerCase();
    if (!q) renderServiceCards(SERVICES);
    else renderServiceCards(SERVICES.filter(s => s.name.toLowerCase().includes(q) || (s.cat||'').toLowerCase().includes(q)));
  });
  $('sendLeadBtn').addEventListener('click', submitLead);
  window.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') closeLeadModal(); });

  loadServices();
  loadContractors();
  loadTestimonials();

  // resize confetti canvas on window resize
  window.addEventListener('resize', ()=> {
    const canvas = document.getElementById('confettiCanvas');
    if (canvas) { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  });
});
