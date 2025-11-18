// public/contractor-dashboard.js
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

function getStored() {
  const s = sessionStorage.getItem('omni_contractor');
  return s ? JSON.parse(s) : null;
}

function setStored(obj){
  sessionStorage.setItem('omni_contractor', JSON.stringify(obj));
}

function ensureLogged(){
  const c = getStored();
  if(!c) location.href = '/contractor-login.html';
  return c;
}

async function fetchJSON(url){ const r = await fetch(url); return r.json(); }
async function postJSON(url, body){ const r = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }); return r.json(); }

document.addEventListener('DOMContentLoaded', async ()=>{
  const contractor = ensureLogged();

  // populate mini profile
  $('#miniProfile').innerHTML = `<strong>${contractor.company||contractor.name||'Contractor'}</strong><div class="muted">${contractor.phone||''}</div>`;

  // fill fields
  $('#fieldCompany').value = contractor.company || contractor.name || '';
  $('#fieldPhone').value = contractor.phone || '';
  $('#fieldService').value = contractor.service || '';
  $('#fieldTelegram').value = contractor.telegram_chat_id || contractor.telegram || '';

  // nav
  $$('.nav-btn').forEach(b => b.addEventListener('click', ()=> {
    $$('.view').forEach(v=>v.style.display='none');
    const view = b.dataset.view;
    $(`#view-${view}`).style.display = 'block';
  }));

  // logout
  $('#logoutBtn').addEventListener('click', ()=> {
    sessionStorage.removeItem('omni_contractor');
    location.href = '/';
  });

  // save profile
  $('#saveProfile').addEventListener('click', async ()=>{
    const payload = {
      id: contractor.id,
      company: $('#fieldCompany').value.trim(),
      phone: $('#fieldPhone').value.trim(),
      service: $('#fieldService').value.trim(),
      telegram_chat_id: $('#fieldTelegram').value.trim()
    };
    const j = await postJSON('/api/contractor', payload);
    if(!j.ok) return alert('Save failed: '+(j.error||'unknown'));
    // update stored
    setStored(j.contractor);
    alert('Saved');
    $('#miniProfile').innerHTML = `<strong>${j.contractor.company||j.contractor.name}</strong><div class="muted">${j.contractor.phone||''}</div>`;
  });

  // messages
  async function loadMessages(){
    const j = await fetchJSON(`/api/messages?contractorId=${contractor.id}`);
    const list = $('#messagesList');
    list.innerHTML = '';
    if(j.ok && Array.isArray(j.messages)){
      j.messages.forEach(m=>{
        const d = document.createElement('div');
        d.className = 'message-row';
        d.innerHTML = `<div class="muted small">${new Date(m.created_at).toLocaleString()}</div><div>${m.message}</div>`;
        list.appendChild(d);
      });
    } else {
      list.innerHTML = '<div class="muted">No messages</div>';
    }
  }
  await loadMessages();

  $('#sendMessage').addEventListener('click', async ()=>{
    const txt = $('#newMessage').value.trim();
    if(!txt) return;
    const j = await postJSON('/api/messages',{ contractorId: contractor.id, message: txt });
    if(!j.ok) return alert('Send failed: '+(j.error||'unknown'));
    $('#newMessage').value='';
    await loadMessages();
  });

  // reviews (load from server via /api/reviews?contractor_id=)
  async function loadReviews(){
    const res = await fetch(`/api/reviews?contractor_id=${contractor.id}`);
    const j = await res.json();
    const el = $('#reviewsList');
    el.innerHTML = '';
    if(j.ok && j.reviews && j.reviews.length){
      j.reviews.forEach(r=>{
        const d = document.createElement('div');
        d.className = 'review-row';
        d.innerHTML = `<strong>${r.reviewer_name}</strong> — ⭐ ${r.rating}<div class="muted">${r.comment}</div>`;
        el.appendChild(d);
      });
    } else {
      el.innerHTML = '<div class="muted">No reviews yet</div>';
    }
  }
  await loadReviews();
});
