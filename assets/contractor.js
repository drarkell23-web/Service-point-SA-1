
// contractor dashboard frontend (static, talks to server)
const $ = id => document.getElementById(id);
const contractor = JSON.parse(localStorage.getItem('contractor')||'null');

if(!contractor){
  // if not logged in, redirect to login page
  if(location.pathname.endsWith('login.html')===false){
    location.href = 'login.html';
  }
} else {
  document.getElementById('companyName').innerText = contractor.company || 'Contractor';
  // load profile
  document.getElementById('profileBox').innerHTML = `<div><strong>${contractor.company}</strong><div>${contractor.phone||''}</div><div>${contractor.telegram_chat_id||''}</div></div>`;
  // fetch leads for this contractor (server must support /api/leads?contractor_id=... or fallback local)
  fetch('/api/leads').then(r=>r.json()).then(j=>{
    let arr = j.leads || j || [];
    // filter by contractor id if present
    arr = arr.filter(l=> (l.contractor_id && (l.contractor_id==contractor.id || l.contractor_id==contractor.auth_id)) || (!l.contractor_id));
    const el = document.getElementById('leadsList');
    if(!arr.length) el.innerHTML = '<div>No leads yet</div>';
    else el.innerHTML = arr.map(l=>`<div class="lead"><strong>${l.name}</strong> ${l.phone} — ${l.service}<div class="muted">${l.message||''}</div></div>`).join('');
  }).catch(e=>{ document.getElementById('leadsList').innerText = 'Failed to load leads'; });
}

// nav handlers
['profile','leads','telegram','customise'].forEach(k=>{
  const el = document.getElementById('nav-'+k);
  if(el) el.addEventListener('click', ()=>{
    document.querySelectorAll('.panel').forEach(p=>p.classList.add('hidden'));
    document.getElementById('panel-'+k).classList.remove('hidden');
  });
});
document.getElementById('nav-logout').addEventListener('click', ()=>{ localStorage.removeItem('contractor'); location.href='login.html'; });

// save custom styles
const saveStyle = document.getElementById('saveStyle');
if(saveStyle) saveStyle.addEventListener('click', ()=>{
  const c = document.getElementById('accentColor').value;
  document.documentElement.style.setProperty('--accent', c);
  alert('Saved (local)');
});
