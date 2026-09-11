(() => {
  'use strict';

  const STORAGE_KEY = 'totem-food-skin';
  const AUTH_KEY = 'totem-food-settings-auth';
  const DEFAULT_SKIN = 'vale_official';
  const BASE_PATH = location.pathname === '/food' || location.pathname.startsWith('/food/') ? '/food' : '';
  const withBase = (url) => BASE_PATH + (url.startsWith('/') ? url : '/' + url);

  const SKINS = {
    vale_official: {
      label: 'Vale da Mantiqueira Oficial',
      description: 'Identidade oficial do hotel: verde, verde-claro, amarelo e fundo branco.',
      themeColor: '#006b3c',
      swatches: ['#006b3c', '#73b842', '#f6c515', '#ffffff']
    },
    mantiqueira_natural: {
      label: 'Mantiqueira Natural',
      description: 'Visual gastronômico original com tons de mata, creme e madeira.',
      themeColor: '#174f32',
      swatches: ['#174f32', '#22663f', '#f7f1e6', '#6e5841']
    }
  };

  const $ = (selector) => document.querySelector(selector);
  let pendingSkin = null;

  function normalizeSkin(name) {
    return Object.prototype.hasOwnProperty.call(SKINS, name) ? name : DEFAULT_SKIN;
  }

  function activeSkin() {
    return normalizeSkin(document.body?.dataset.skin || localStorage.getItem(STORAGE_KEY) || DEFAULT_SKIN);
  }

  function applySkin(name, persist = true) {
    const skinName = normalizeSkin(name);
    const skin = SKINS[skinName];
    if (document.body) document.body.dataset.skin = skinName;
    if (persist) localStorage.setItem(STORAGE_KEY, skinName);

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', skin.themeColor);

    document.querySelectorAll('[data-skin-label]').forEach((node) => {
      node.textContent = skin.label;
    });
    document.dispatchEvent(new CustomEvent('food:skin-changed', { detail: { skin: skinName } }));
    return skinName;
  }

  function modal(name, open) {
    const host = document.getElementById(name);
    if (!host) return;
    host.classList.toggle('hidden', !open);
    host.setAttribute('aria-hidden', open ? 'false' : 'true');
    document.body.classList.toggle('modal-open', open || !!document.querySelector('.food-modal:not(.hidden)'));
    if (open) setTimeout(() => host.querySelector('input,button,select')?.focus(), 20);
  }

  function closeAll() {
    document.querySelectorAll('.food-modal').forEach((host) => {
      host.classList.add('hidden');
      host.setAttribute('aria-hidden', 'true');
    });
    document.body.classList.remove('modal-open');
  }

  function authHeader() {
    return sessionStorage.getItem(AUTH_KEY) || '';
  }

  function renderSkinCards() {
    const grid = $('#skinGrid');
    if (!grid) return;
    const selected = normalizeSkin(pendingSkin || activeSkin());
    grid.innerHTML = Object.entries(SKINS).map(([value, skin]) => `
      <button type="button" class="skin-card ${value === selected ? 'selected' : ''}" data-skin-choice="${value}" aria-pressed="${value === selected ? 'true' : 'false'}">
        <span class="skin-card-preview skin-card-preview--${value}">
          <span class="mini-header"></span>
          <span class="mini-body"><i></i><i></i></span>
          <span class="mini-footer"></span>
        </span>
        <span class="skin-card-copy">
          <strong>${skin.label}</strong>
          <small>${skin.description}</small>
          <span class="skin-swatches">${skin.swatches.map((color) => `<i style="--swatch:${color}"></i>`).join('')}</span>
        </span>
        <span class="skin-check">✓</span>
      </button>`).join('');

    grid.querySelectorAll('[data-skin-choice]').forEach((button) => {
      button.addEventListener('click', () => {
        pendingSkin = normalizeSkin(button.dataset.skinChoice);
        applySkin(pendingSkin, false);
        renderSkinCards();
      });
    });
  }

  function openSettings() {
    pendingSkin = activeSkin();
    renderSkinCards();
    $('#currentSkinName') && ($('#currentSkinName').textContent = SKINS[pendingSkin].label);
    modal('settingsModal', true);
  }

  async function validateAdmin() {
    const user = ($('#settingsUser')?.value || 'admin').trim();
    const password = $('#settingsPassword')?.value || '';
    const error = $('#settingsLoginError');
    if (error) error.textContent = '';
    if (!user || !password) {
      if (error) error.textContent = 'Informe usuário e senha.';
      return;
    }

    const token = 'Basic ' + btoa(unescape(encodeURIComponent(`${user}:${password}`)));
    const button = $('#settingsLoginBtn');
    if (button) button.disabled = true;
    try {
      const response = await fetch(withBase('/api/admin/summary'), {
        headers: { Authorization: token },
        cache: 'no-store'
      });
      if (!response.ok) throw new Error(response.status === 401 ? 'Usuário ou senha inválidos.' : `Falha de autenticação (HTTP ${response.status}).`);
      sessionStorage.setItem(AUTH_KEY, token);
      $('#settingsPassword').value = '';
      modal('settingsLoginModal', false);
      openSettings();
    } catch (err) {
      if (error) error.textContent = err.message;
    } finally {
      if (button) button.disabled = false;
    }
  }

  function requestSettings() {
    if (authHeader()) openSettings();
    else modal('settingsLoginModal', true);
  }

  function saveSettings() {
    const selected = normalizeSkin(pendingSkin || activeSkin());
    applySkin(selected, true);
    const message = $('#settingsSavedMessage');
    if (message) {
      message.textContent = `Skin “${SKINS[selected].label}” salva neste totem.`;
      message.classList.add('show');
      setTimeout(() => message.classList.remove('show'), 2400);
    }
    setTimeout(() => modal('settingsModal', false), 450);
  }

  function cancelSettings() {
    applySkin(localStorage.getItem(STORAGE_KEY) || DEFAULT_SKIN, false);
    pendingSkin = null;
    modal('settingsModal', false);
  }

  function bind() {
    $('#settingsBtn')?.addEventListener('click', requestSettings);
    $('#settingsLoginBtn')?.addEventListener('click', validateAdmin);
    $('#settingsPassword')?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') validateAdmin();
    });
    $('#saveSkinBtn')?.addEventListener('click', saveSettings);
    $('#cancelSkinBtn')?.addEventListener('click', cancelSettings);
    $('#logoutSettingsBtn')?.addEventListener('click', () => {
      sessionStorage.removeItem(AUTH_KEY);
      closeAll();
    });
    document.querySelectorAll('[data-close-food-modal]').forEach((button) => {
      button.addEventListener('click', () => {
        const target = button.closest('.food-modal');
        if (target?.id === 'settingsModal') cancelSettings();
        else modal(target?.id, false);
      });
    });
    document.querySelectorAll('.food-modal').forEach((host) => {
      host.addEventListener('pointerdown', (event) => {
        if (event.target !== host) return;
        if (host.id === 'settingsModal') cancelSettings();
        else modal(host.id, false);
      });
    });
  }

  const initial = normalizeSkin(localStorage.getItem(STORAGE_KEY) || DEFAULT_SKIN);
  if (document.body) applySkin(initial, false);

  document.addEventListener('DOMContentLoaded', () => {
    applySkin(initial, false);
    bind();
    renderSkinCards();
  });

  window.foodTheme = { skins: SKINS, applySkin, activeSkin, requestSettings };
})();
