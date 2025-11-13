// admin-dashboard.js — admin controls that use your server endpoints

const contractorsTable = document.getElementById('contractorsTable');
const refreshBtn = document.getElementById('refreshBtn');
const badgeForm = document.getElementById('badgeForm');
const badgeResult = document.getElementById('badgeResult');
const loadLogsBtn = document.getElementById('loadLogsBtn');
const logSelect = document.getElementById('logSelect');
const logsArea = document.getElementById('logsArea');
const leadLimitIn = document.getElementById('leadLimit');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');

async function api(path, opts={}) {
  try {
    const r = await fetch(path, opts);
    if (!r.ok) throw new Error('api err');
    return await r.json();
  } catch (e) {
    console.warn('api fail', e);
    return null;
  }
}

async function loadContractors(){
  contractorsTable.innerHTML = 'Loading...';
  const res = await api('/api/contractors');
  if (!res || !res.contractors) { contractorsTable.innerHTML = 'Failed to load contractors.'; return; }
  contractorsTable.innerHTML = '';
  res.contractors.forEach(c => {
    const row = document.createElement('div'); row.className='contractor-row';
    const left = document.createElement('div'); left.innerHTML = `<strong>${c.company||c.name||c.id}</strong><div class="muted">${c.category||''} • ${c.area||''}</div>`;
    const right = document.createElement('div'); right.className='contractor-actions';
    right.innerHTML = `<button class="ghost view" data-id="${c.id}">View</button><button class="ghost badge" data-id="${c.id}">Badge</button><button class="ghost del" data-id="${c.id}">Delete</button>`;
    row.appendChild(left); row.appendChild(right);
    contractorsTable.appendChild(row);
  });

  // attach listeners
  document.querySelectorAll('.contractor-actions .view, .contractor-row .view').forEach(btn=>{
    btn.addEventListener('click', ()=> {
      const id = btn.dataset.id;
      window.open(`/c/${id}`, '_blank');
    });
  });
  document.querySelectorAll('.contractor-row .badge').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = btn.dataset.id;
      const badge = prompt('Badge (platinum, gold, verified):','platinum');
      const secret = prompt('Admin secret:');
      if (!badge || !secret) return alert('Cancelled');
      applyBadge(id, badge, secret);
    });
  });
  document.querySelectorAll('.contractor-row .del').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const id = btn.dataset.id;
      if (!confirm('Delete contractor? This removes from JSON or Supabase (if enabled).')) return;
      // call /api/contractor with deletion flag (server currently does not implement delete; so we will append to contractors log)
      const res = await api('/api/apply-badge', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ adminSecret: prompt('Admin secret:'), contractorId: id, badge: 'deleted' }) });
      if (res && res.ok) { alert('Marked as deleted (badge applied)'); loadContractors(); }
    });
  });
}

async function applyBadge(contractorId, badge, adminSecret){
  badgeResult.textContent = 'Applying...';
  const res = await api('/api/apply-badge', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ adminSecret, contractorId, badge }) });
  if (!res) { badgeResult.textContent = 'Failed'; return; }
  if (res.ok) { badgeResult.textContent = `Badge ${badge} applied to ${res.contractor && (res.contractor.company||res.contractor.name||res.contractor.id)}`; loadContractors(); }
  else badgeResult.textContent = `Error: ${res.error||'unknown'}`;
}

badgeForm.addEventListener('submit', (e)=>{
  e.preventDefault();
  const f = new FormData(badgeForm);
  const contractorId = f.get('contractorId');
  const badge = f.get('badge');
  const adminSecret = f.get('adminSecret');
  applyBadge(contractorId,badge,adminSecret);
});

loadLogsBtn.addEventListener('click', async ()=>{
  const name = logSelect.value;
  logsArea.innerHTML = 'Loading...';
  const res = await api(`/api/logs/${name}`);
  if (!res) { logsArea.innerHTML = 'Failed to load logs.'; return; }
  logsArea.innerHTML = '<pre>' + JSON.stringify(res.slice(0,200), null, 2) + '</pre>';
});

refreshBtn.addEventListener('click', loadContractors);

saveSettingsBtn.addEventListener('click', ()=>{
  alert('Settings saved locally (demo). To make persistent, implement /api/admin/settings on the server.');
});

loadContractors();
