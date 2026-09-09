'use strict';
const params = new URLSearchParams(location.search);
let station = (params.get('station') || 'KITCHEN').toUpperCase();
const $ = (selector) => document.querySelector(selector);

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { 'content-type': 'application/json', ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Erro no KDS');
  return data;
}

function nextStatus(current) {
  if (current === 'QUEUED') return ['PREPARING', 'Iniciar'];
  if (current === 'PREPARING') return ['READY', 'Pronto'];
  return ['DELIVERED', 'Entregue'];
}

async function setOrderStatus(id, status) {
  await api(`/api/ops/orders/${id}/status`, { method: 'POST', body: JSON.stringify({ status }) });
  await load();
}

async function load() {
  $('#stationTitle').textContent = station === 'BAR' ? 'Bebidas' : 'Cozinha';
  const rows = await api(`/api/ops/kds?station=${station}`);
  const host = $('#tickets');
  host.innerHTML = '';
  for (const order of rows) {
    const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
    const [status, label] = nextStatus(order.status);
    const ticket = document.createElement('article');
    ticket.className = 'ticket';
    ticket.innerHTML = `<h2>${escapeHtml(order.order_number)}</h2><div>${escapeHtml(order.customer_name || 'Sem nome')} • ${order.service_mode === 'TAKEAWAY' ? 'Levar' : 'Comer aqui'}</div><ul>${items.map((item) => `<li><strong>${item.quantity}x</strong> ${escapeHtml(item.name)}${item.notes ? `<br><small>${escapeHtml(item.notes)}</small>` : ''}</li>`).join('')}</ul><span class="pill">${escapeHtml(order.status)}</span>`;
    const button = document.createElement('button');
    button.className = 'primary';
    button.textContent = label;
    button.addEventListener('click', () => setOrderStatus(order.id, status));
    ticket.appendChild(button);
    host.appendChild(ticket);
  }
}

$('#switchBtn').addEventListener('click', () => {
  station = station === 'KITCHEN' ? 'BAR' : 'KITCHEN';
  history.replaceState(null, '', `?station=${station}`);
  load().catch(console.error);
});

load().catch(console.error);
setInterval(() => load().catch(() => {}), 3000);
