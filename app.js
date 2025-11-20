// Contractor dashboard client
// IMPORTANT: set API_BASE to your Render API URL (no trailing slash)
const API_BASE = "https://service-point-sa-1.onrender.com"; // <<-- replace if needed

const state = { contractor: null, leads: [], reviews: [] };

function $(id){return document.getElementById(id)}
function q(sel){return document.querySelector(sel)}

document.addEventListener('DOMContentLoaded', ()=>{
  wireNav();
  showLoginIfNeeded();
  $('refreshBtn').addEventListener('click', refreshAll);
  $('loginBtn').addEventListener('click', doLogin);
  $('logoutBtn').addEventListener('click', doLogout);
  $('saveProfile').addEventListener('click', saveProfile);
  $('sendMsgBtn').addEventListener('click', sendMessage);
  $('upgradeBtn').addEventListener('click', ()=> alert('Contact admin to upgrade.'));
  $('saveTheme').addEventListener('click', applyTheme);
  refreshAll();
  setInterval(pollMessages, 25000);
});

function wireNav(){
  const views = ['Dashboard','Profile','Messages','Settings'];
  views.forEach(v=>{
    const id = 'nav'+v;
    const el = $(id);
    if(!el) return;
    el.addEventListener('click', ()=>{
      document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
      el.classList.add('active');
      document.querySelectorAll('.view').forEach(x=>x.classList.add('hidden'));
      $('view'+v).classList.remove('hidden');
    });
  });
}

function showLoginIfNeeded(){
  const saved = localStorage.getItem('contractor');
  if(saved){
    state.contractor = JSON.parse(saved);
    onLogin();
  } else {
    $('loginModal').style.display = 'flex';
  }
}

async function doLogin(){
  const phone = $('loginPhone').value.trim();
  const password = $('loginPassword').value;
  if(!phone||!password) return alert('Enter phone and password');
  try{
    const res = await fetch(API_BASE + '/api/contractor/login', {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({phone,password})
    });
    const j = await res.json();
    if(!j.ok) return alert('Login failed: ' + (j.error||''));
    state.contractor = j.contractor;
    localStorage.setItem('contractor', JSON.stringify(state.contractor));
    onLogin();
    $('loginModal').style.display = 'none';
  }catch(e){console.error(e); alert('Network error')}
}

function doLogout(){
  localStorage.removeItem('contractor');
  state.contractor = null;
  location.reload();
}

function onLogin(){
  $('welcome').textContent = `Welcome — ${state.contractor.company || state.contractor.name || ''}`;
  fillProfile();
  refreshAll();
}

async function refreshAll(){
  if(!state.contractor) return;
  await fetchLeads();
  await fetchReviews();
  renderLeads();
  renderStats();
  renderReviews();
}

async function fetchLeads(){
  try{
    const res = await fetch(API_BASE + '/api/leads');
    const j = await res.json();
    state.leads = (j.leads || j.leads || []).filter(l => String(l.contractor_id) === String(state.contractor.id) || !l.contractor_id && false);
  }catch(e){console.warn(e); state.leads = []}
}

function renderLeads(){
  const tbody = document.querySelector('#leadsTable tbody');
  tbody.innerHTML = '';
  state.leads.slice(0,200).forEach(l=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${new Date(l.created_at||'').toLocaleString()}</td><td>${escapeHtml(l.name)}</td><td>${escapeHtml(l.phone)}</td><td>${escapeHtml(l.service)}</td><td>${escapeHtml(l.message||'')}</td>`;
    tbody.appendChild(tr);
  });
  $('statTotal').textContent = state.leads.length;
  $('statNew').textContent = state.leads.filter(x=>new Date()-new Date(x.created_at||0)<1000*60*60*24).length;
}

async function fetchReviews(){
  try{
    const res = await fetch(API_BASE + '/api/reviews');
    const j = await res.json();
    state.reviews = j.reviews || [];
  }catch(e){state.reviews=[]}
}
function renderReviews(){
  const out = $('reviewsList');
  out.innerHTML = '';
  state.reviews.slice(0,8).forEach(r=>{
    const d = document.createElement('div');
    d.className = 'rev';
    d.innerHTML = `<strong>${escapeHtml(r.reviewer_name||r.name||'')}</strong><div class="muted">${r.rating||0} ★</div><div>${escapeHtml(r.comment||r.review||'')}</div>`;
    out.appendChild(d);
  });
  $('statReviews').textContent = state.reviews.length;
}

function fillProfile(){
  const p = state.contractor || {};
  $('profileCompany').textContent = p.company || p.name || '';
  $('profilePhone').textContent = p.phone || '';
  $('profileTelegram').textContent = p.telegram_chat_id || '-';
  $('profileCreated').textContent = p.created_at ? new Date(p.created_at).toLocaleDateString() : '-';
  $('editCompany').value = p.company || '';
  $('editPhone').value = p.phone || '';
  $('editTelegram').value = p.telegram_chat_id || '';
}

async function saveProfile(){
  const upd = {
    id: state.contractor.id,
    company: $('editCompany').value.trim(),
    phone: $('editPhone').value.trim(),
    telegram_chat_id: $('editTelegram').value.trim()
  };
  try{
    const res = await fetch(API_BASE + '/api/contractor', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(upd) });
    const j = await res.json();
    if(!j.ok) return alert('Save failed: ' + (j.error||''));
    state.contractor = j.contractor;
    localStorage.setItem('contractor', JSON.stringify(state.contractor));
    fillProfile();
    alert('Saved');
  }catch(e){console.error(e); alert('Network error')}
}

async function sendMessage(){
  const text = $('msgText').value.trim();
  if(!text) return;
  try{
    const payload = { contractorId: state.contractor.id, message: text };
    const res = await fetch(API_BASE + '/api/message', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    const j = await res.json();
    if(!j.ok) return alert('Send failed');
    $('msgText').value='';
    pollMessages();
  }catch(e){console.error(e)}
}

async function pollMessages(){
  // simple: fetch leads as proxy for messages or use /api/messages if exists
  try{
    const res = await fetch(API_BASE + '/api/contractor?id=' + encodeURIComponent(state.contractor?.id || ''));
    const j = await res.json();
    if(j.ok && j.contractor && j.contractor.inbox) {
      renderMessages(j.contractor.inbox);
      return;
    }
  }catch(e){}
  // fallback: show last leads as simple log
  renderMessages(state.leads.map(l=> ({text:`Lead: ${l.name} ${l.phone}`, ts:l.created_at}) ));
}

function renderMessages(arr){
  const list = $('messagesList');
  list.innerHTML = '';
  (arr||[]).slice(0,200).forEach(m=>{
    const d = document.createElement('div');
    d.className = 'msg';
    const when = m.ts ? new Date(m.ts).toLocaleString() : '';
    d.innerHTML = `<div class="msg-text">${escapeHtml(m.message||m.text||'')}</div><div class="msg-ts">${when}</div>`;
    list.appendChild(d);
  });
}

function applyTheme(){
  const c = $('themeColor').value || '#0a84ff';
  document.documentElement.style.setProperty('--accent', c);
  alert('Theme updated');
}

function escapeHtml(s){ if(!s) return ''; return String(s).replace(/[&<>"']/g, (m)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }
