'use strict';

const BASE_PATH = location.pathname === '/food' || location.pathname.startsWith('/food/') ? '/food' : '';
const withBase = (url) => BASE_PATH + (url.startsWith('/') ? url : '/' + url);
const $ = (selector) => document.querySelector(selector);
const money = (cents) => (Number(cents || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const PHOTOS = {
  mountain: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Montanhas_da_Serra_da_mantiqueira.jpg?width=1600',
  burger: 'https://images.unsplash.com/photo-1713330801172-03f8d1c0dde7?auto=format&fit=crop&w=1000&q=82',
  chicken: 'https://images.unsplash.com/photo-1703219342329-fce8488cf443?auto=format&fit=crop&w=1000&q=82',
  fries: 'https://images.unsplash.com/photo-1716973208261-46f8ee456c43?auto=format&fit=crop&w=1000&q=82',
  cheeseBread: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/P%C3%A3o_de_queijo.jpg?width=1000',
  cake: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/ChocolateCake.jpg?width=1000',
  juice: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/OrangeJuice.jpg?width=900'
};

const DEFAULT_ADS = [
  { title: 'Sabores que aproximam', message: 'Mais que uma refeição: uma experiência na Mantiqueira.', media_url: PHOTOS.mountain, duration_seconds: 9, credit: 'Serra da Mantiqueira • Wikimedia Commons' },
  { title: 'Pão de Queijo Artesanal', message: 'Um clássico mineiro para qualquer hora do dia.', media_url: PHOTOS.cheeseBread, duration_seconds: 8, credit: 'Pão de queijo • Wikimedia Commons' },
  { title: 'Lanches, sabores e boas histórias', message: 'Monte seu pedido do seu jeito.', media_url: PHOTOS.burger, duration_seconds: 8, credit: 'Foto demonstrativa • Unsplash' },
  { title: 'Doces que fazem memórias', message: 'Finalize seu momento com um toque especial.', media_url: PHOTOS.cake, duration_seconds: 8, credit: 'Foto demonstrativa • Wikimedia Commons' }
];

const state = {
  bootstrap: null,
  mode: 'DINE_IN',
  cart: new Map(),
  screen: 'welcome',
  adTimer: null,
  cartTimer: null,
  adRotateTimer: null,
  adIndex: 0,
  ads: DEFAULT_ADS
};

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function assetUrl(url) {
  if (!url) return '';
  return /^(?:https?:|data:|blob:)/i.test(url) ? url : withBase(url);
}

function normalize(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function friendlyName(name) {
  const n = normalize(name);
  if (n === 'lanche da casa') return 'Hambúrguer Vale da Mantiqueira';
  if (n === 'sanduiche de frango') return 'Sanduíche de Frango com Requeijão';
  if (n === 'batata crocante') return 'Batata Rústica';
  if (n === 'sobremesa da casa') return 'Bolo de Chocolate';
  if (n === 'refrigerante 500 ml') return 'Suco Natural de Laranja';
  if (n === 'combo classico') return 'Combo Mantiqueira';
  return name;
}

function photoFor(item) {
  if (item.image_url) return assetUrl(item.image_url);
  const n = normalize(item.name);
  const categoryName = normalize(state.bootstrap?.categories?.find((c) => c.id === item.category_id)?.name);
  if (n.includes('pao de queijo')) return PHOTOS.cheeseBread;
  if (n.includes('frango') || n.includes('sanduiche')) return PHOTOS.chicken;
  if (n.includes('batata')) return PHOTOS.fries;
  if (n.includes('bolo') || n.includes('sobremesa') || categoryName.includes('doce')) return PHOTOS.cake;
  if (n.includes('suco') || n.includes('refrigerante')) return PHOTOS.juice;
  if (n.includes('combo') || n.includes('lanche') || n.includes('hamburg')) return PHOTOS.burger;
  if (categoryName.includes('bebida')) return PHOTOS.juice;
  return PHOTOS.burger;
}

function categoryIcon(category) {
  const s = normalize(category.slug || category.name);
  if (s.includes('bebida')) return '<svg viewBox="0 0 32 32"><path d="M10 5h12l-2 22h-8L10 5Zm2 6h8M21 3l4-2"/></svg>';
  if (s.includes('doce')) return '<svg viewBox="0 0 32 32"><path d="M9 15h14l-2 12H11L9 15Zm2-2c0-5 3-8 5-8s5 3 5 8M16 5V2"/></svg>';
  if (s.includes('cafe')) return '<svg viewBox="0 0 32 32"><path d="M7 12h16v8a7 7 0 0 1-7 7h-2a7 7 0 0 1-7-7v-8Zm16 2h2a4 4 0 0 1 0 8h-3M11 8c-2-2 2-3 0-5m6 5c-2-2 2-3 0-5"/></svg>';
  if (s.includes('acompan')) return '<svg viewBox="0 0 32 32"><path d="M8 11h16l-2 16H10L8 11Zm3 0 1-7m4 7V4m5 7-1-7"/></svg>';
  if (s.includes('combo')) return '<svg viewBox="0 0 32 32"><path d="M6 20h20M8 17c1-6 5-9 8-9s7 3 8 9M7 23h18l-2 4H9l-2-4ZM24 5h4l-1 15"/></svg>';
  return '<svg viewBox="0 0 32 32"><path d="M6 20h20M8 17c1-6 5-9 8-9s7 3 8 9M7 23h18l-2 4H9l-2-4Z"/></svg>';
}

function show(id) {
  document.querySelectorAll('.screen').forEach((screen) => screen.classList.add('hidden'));
  $('#' + id).classList.remove('hidden');
  state.screen = id;
  window.scrollTo(0, 0);
}

function toast(message) {
  const host = $('#toast');
  host.textContent = message;
  host.classList.remove('hidden');
  clearTimeout(host._timer);
  host._timer = setTimeout(() => host.classList.add('hidden'), 2200);
}

async function boot() {
  state.bootstrap = await fetch(withBase('/api/public/bootstrap')).then((response) => {
    if (!response.ok) throw new Error('Falha ao carregar cardápio');
    return response.json();
  });
  const liveAds = (state.bootstrap.ads || []).filter((ad) => ad.media_type === 'IMAGE' && ad.media_url).map((ad) => ({ ...ad, media_url: assetUrl(ad.media_url), credit: '' }));
  state.ads = liveAds.length ? liveAds : DEFAULT_ADS;
  renderCategories();
  renderAd(0);
  document.body.addEventListener('pointerdown', activity, { passive: true });
  document.body.addEventListener('keydown', activity);
  armIdle();
}

function renderAd(index) {
  if (!state.ads.length) return;
  const ad = state.ads[index % state.ads.length];
  state.adIndex = index % state.ads.length;
  $('#adMedia').style.backgroundImage = `url("${String(ad.media_url).replace(/"/g, '%22')}")`;
  $('#adEyebrow').textContent = state.adIndex === 0 ? 'Sabores que aproximam' : 'Vale da Mantiqueira';
  $('#adTitle').innerHTML = esc(ad.title || 'Vale da Mantiqueira').replace(/\n/g, '<br>');
  $('#adMessage').textContent = ad.message || '';
  $('#photoCredit').textContent = ad.credit || 'Campanha Vale da Mantiqueira';
  clearTimeout(state.adRotateTimer);
  state.adRotateTimer = setTimeout(() => renderAd(state.adIndex + 1), Math.max(5, Number(ad.duration_seconds) || 8) * 1000);
}

function showIdle() {
  if (state.cart.size) return;
  $('#adOverlay').classList.remove('hidden');
  renderAd(state.adIndex);
}

function hideIdle() {
  $('#adOverlay').classList.add('hidden');
  clearTimeout(state.adRotateTimer);
}

function activity() {
  armIdle();
  if (state.cart.size) armCartReset();
}

function armIdle() {
  clearTimeout(state.adTimer);
  const seconds = Number(state.bootstrap?.settings?.idle_ad_seconds) || 45;
  state.adTimer = setTimeout(() => {
    if (!state.cart.size && state.screen !== 'payment') showIdle();
  }, seconds * 1000);
}

function armCartReset() {
  clearTimeout(state.cartTimer);
  const seconds = Number(state.bootstrap?.settings?.abandoned_cart_seconds) || 120;
  state.cartTimer = setTimeout(() => {
    if (!state.cart.size) return;
    if (confirm('Seu pedido ficou parado. Deseja continuar?')) armCartReset();
    else resetOrder(true);
  }, seconds * 1000);
}

function startOrder() {
  hideIdle();
  show('welcome');
}

function renderCategories() {
  const host = $('#categories');
  host.innerHTML = '';
  const cats = [...(state.bootstrap.categories || []), { id: 'combos', name: 'Combos', slug: 'combos' }];
  cats.forEach((category, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'category-btn' + (index === 0 ? ' active' : '');
    button.innerHTML = `<span class="category-icon">${categoryIcon(category)}</span><span>${esc(category.name)}</span>`;
    button.addEventListener('click', () => selectCategory(category.id, button));
    host.appendChild(button);
  });
  if (cats[0]) selectCategory(cats[0].id, host.firstElementChild);
}

function selectCategory(id, button) {
  document.querySelectorAll('.category-btn').forEach((item) => item.classList.remove('active'));
  button?.classList.add('active');
  const combo = id === 'combos';
  const category = state.bootstrap.categories.find((c) => c.id === id);
  $('#categoryTitle').textContent = combo ? 'Combos' : (category?.name || 'Cardápio');
  const items = combo
    ? (state.bootstrap.combos || []).map((item) => ({ ...item, type: 'combo' }))
    : (state.bootstrap.products || []).filter((item) => item.category_id === id).map((item) => ({ ...item, type: 'product' }));
  renderProducts(items);
}

function renderProducts(items) {
  const host = $('#products');
  host.innerHTML = '';
  if (!items.length) {
    host.innerHTML = '<div class="empty-products"><span>♧</span><strong>Nenhum item disponível nesta categoria.</strong></div>';
    return;
  }
  items.forEach((item) => {
    const article = document.createElement('article');
    article.className = 'product-card';
    const display = friendlyName(item.name);
    const photo = photoFor(item);
    article.innerHTML = `
      <div class="product-photo"><img src="${esc(photo)}" alt="${esc(display)}" loading="eager"></div>
      <div class="product-info">
        ${item.type === 'combo' ? '<span class="combo-label">COMBO</span>' : ''}
        <h3>${esc(display)}</h3>
        <p>${esc(item.description || '')}</p>
        <strong class="product-price">${money(item.price_cents)}</strong>
        <button class="add-product" type="button"><span>+</span> Adicionar</button>
      </div>`;
    article.querySelector('img').addEventListener('error', (event) => { event.currentTarget.src = PHOTOS.burger; }, { once: true });
    article.querySelector('.add-product').addEventListener('click', () => addItem(item));
    host.appendChild(article);
  });
}

function addItem(item) {
  const key = `${item.type}:${item.id}`;
  const row = state.cart.get(key) || { ...item, quantity: 0 };
  row.quantity += 1;
  state.cart.set(key, row);
  updateTotal();
  toast(`${friendlyName(item.name)} adicionado`);
  armCartReset();
}

function totalCents() {
  return [...state.cart.values()].reduce((sum, item) => sum + Number(item.price_cents) * Number(item.quantity), 0);
}

function updateTotal() {
  const formatted = money(totalCents());
  $('#cartTotal').textContent = formatted;
  $('#reviewTotal').textContent = formatted;
  $('#reviewHeaderTotal').textContent = formatted;
  $('#paymentTotal').textContent = formatted;
  $('#continueBtn').disabled = !state.cart.size;
}

function renderReview() {
  const host = $('#reviewItems');
  host.innerHTML = '';
  [...state.cart.entries()].forEach(([key, item]) => {
    const row = document.createElement('article');
    row.className = 'summary-row';
    row.innerHTML = `
      <img src="${esc(photoFor(item))}" alt="">
      <div class="summary-copy"><strong>${esc(friendlyName(item.name))}</strong><small>${esc(item.description || '')}</small>
        <div class="summary-qty"><button data-delta="-1" type="button">−</button><b>${item.quantity}</b><button data-delta="1" type="button">+</button></div>
      </div>
      <strong class="summary-price">${money(item.price_cents * item.quantity)}</strong>
      <button class="remove-item" type="button" aria-label="Remover">×</button>`;
    row.querySelectorAll('[data-delta]').forEach((button) => button.addEventListener('click', () => changeQty(key, Number(button.dataset.delta))));
    row.querySelector('.remove-item').addEventListener('click', () => removeItem(key));
    host.appendChild(row);
  });
  updateTotal();
}

function changeQty(key, delta) {
  const item = state.cart.get(key);
  if (!item) return;
  item.quantity += delta;
  if (item.quantity <= 0) state.cart.delete(key);
  else state.cart.set(key, item);
  updateTotal();
  if (!state.cart.size) return show('catalog');
  renderReview();
}

function removeItem(key) {
  state.cart.delete(key);
  updateTotal();
  if (!state.cart.size) show('catalog');
  else renderReview();
}

async function api(url, options = {}) {
  const response = await fetch(withBase(url), {
    headers: { 'content-type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || data.error || 'Erro');
  return data;
}

async function pay(method) {
  try {
    document.querySelectorAll('[data-payment]').forEach((button) => { button.disabled = true; });
    const payload = {
      service_mode: state.mode,
      customer_name: $('#customerName').value.trim() || null,
      items: [...state.cart.values()].map((item) => ({ type: item.type, id: item.id, quantity: item.quantity }))
    };
    const created = await api('/api/public/orders', { method: 'POST', body: JSON.stringify(payload) });
    const payment = await api(`/api/public/orders/${created.id}/pay`, { method: 'POST', body: JSON.stringify({ method }) });
    if (payment.status === 'APPROVED') finish(payment.order);
    else {
      toast('Aguardando confirmação no terminal...');
      await pollOrder(created.id);
    }
  } catch (error) {
    toast(error.message || 'Falha no pagamento');
    document.querySelectorAll('[data-payment]').forEach((button) => { button.disabled = false; });
  }
}

async function pollOrder(id) {
  for (let attempt = 0; attempt < 90; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const order = await api(`/api/public/orders/${id}`);
    if (['QUEUED', 'PREPARING', 'READY'].includes(order.status)) return finish(order);
    if (order.status === 'PAYMENT_FAILED') throw new Error('Pagamento não aprovado');
  }
  throw new Error('Tempo de pagamento excedido');
}

function finish(order) {
  $('#orderNumber').textContent = order.order_number;
  $('#finishName').textContent = order.customer_name ? `${order.customer_name}, guarde o número abaixo.` : 'Guarde o número abaixo.';
  state.cart.clear();
  updateTotal();
  show('finish');
}

function resetOrder(toIdle = false) {
  state.cart.clear();
  $('#customerName').value = '';
  updateTotal();
  renderCategories();
  show('welcome');
  if (toIdle) showIdle();
  armIdle();
}

$('#startOrderBtn').addEventListener('click', startOrder);
$('#adOverlay').addEventListener('click', (event) => { if (!event.target.closest('.photo-credit')) startOrder(); });
document.querySelectorAll('[data-mode]').forEach((button) => button.addEventListener('click', () => { state.mode = button.dataset.mode; show('catalog'); }));
$('#continueBtn').addEventListener('click', () => { renderReview(); show('review'); });
$('#nameStepBtn').addEventListener('click', () => show('nameStep'));
$('#paymentStepBtn').addEventListener('click', () => show('payment'));
$('#skipName').addEventListener('click', () => { $('#customerName').value = ''; show('payment'); });
document.querySelectorAll('[data-payment]').forEach((button) => button.addEventListener('click', () => pay(button.dataset.payment)));
document.querySelectorAll('[data-back]').forEach((button) => button.addEventListener('click', () => show(button.dataset.back)));
$('#newOrder').addEventListener('click', () => resetOrder(true));
$('#cancelOrder').addEventListener('click', () => { if (confirm('Cancelar este pedido?')) resetOrder(true); });
$('#accessibilityBtn').addEventListener('click', () => document.body.classList.toggle('large-text'));
$('#accessibilityCatalog').addEventListener('click', () => document.body.classList.toggle('large-text'));

boot().catch((error) => toast('Falha ao carregar cardápio: ' + error.message));
