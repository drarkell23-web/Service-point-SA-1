// chatbot.js — simple chat widget that sends lead to /api/lead
const $ = sel => document.querySelector(sel);

document.addEventListener('DOMContentLoaded', ()=>{
  const openBtn = document.getElementById('openChatBtn');
  const chat = document.getElementById('chatWidget');
  const close = document.getElementById('chatClose');
  const form = document.getElementById('leadForm');
  const messages = document.getElementById('chatMessages');

  openBtn.addEventListener('click', ()=> chat.style.display = 'block');
  close.addEventListener('click', ()=> chat.style.display = 'none');

  form.addEventListener('submit', async (ev)=>{
    ev.preventDefault();
    await submitLead();
  });
});

function addBotMessage(text){
  const m = document.createElement('div');
  m.className = 'msg bot';
  m.innerText = text;
  appendMessage(m);
}

function addUserMessage(text){
  const m = document.createElement('div');
  m.className = 'msg user';
  m.innerText = text;
  appendMessage(m);
}

function appendMessage(node){
  const area = document.getElementById('chatMessages');
  if(!area) return;
  area.appendChild(node);
  area.scrollTop = area.scrollHeight;
}

async function submitLead(){
  const name = document.getElementById('leadName').value.trim();
  const phone = document.getElementById('leadPhone').value.trim();
  const email = document.getElementById('leadEmail').value.trim();
  const service = document.getElementById('leadService').value.trim();
  const message = document.getElementById('leadMessage').value.trim();

  if(!name || !phone || !service){
    addBotMessage('Please enter your name, phone and service.');
    return;
  }

  addUserMessage(`${name} — ${phone}`);
  addBotMessage('Sending your request...');

  const payload = { name, phone, email, service, message, source: 'chat' };

  try {
    const res = await fetch('/api/lead', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });

    const j = await res.json();
    if(j.ok){
      addBotMessage('✅ Request sent. You will be contacted shortly.');
      document.getElementById('leadForm').reset();
      setTimeout(()=>{ document.getElementById('chatWidget').style.display = 'none'; }, 1200);
    } else {
      addBotMessage('❌ Failed to send request: ' + (j.error || 'unknown'));
    }
  } catch (err){
    addBotMessage('Network error sending lead.');
    console.error(err);
  }
}

window.submitLead = submitLead;
