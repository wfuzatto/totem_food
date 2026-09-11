(() => {
  'use strict';

  const STORAGE_KEY = 'totem-food-skin';
  const LEGACY_LOGO_KEY = 'totem-food-brand-logo';
  const AUTH_KEY = 'totem-food-settings-auth';
  const DEFAULT_SKIN = 'vale_official';
  const TECHNICAL_ADMIN_USER = 'admin';
  const BASE_PATH = location.pathname === '/food' || location.pathname.startsWith('/food/') ? '/food' : '';
  const withBase = (url) => BASE_PATH + (url.startsWith('/') ? url : '/' + url);
  if(!document.querySelector('link[data-food-media-settings]')){const l=document.createElement('link');l.rel='stylesheet';l.href=withBase('/media-settings.css?v=20260910-1');l.dataset.foodMediaSettings='1';document.head.appendChild(l)}

  const SKINS = {
    vale_official: { label:'Vale da Mantiqueira Oficial', description:'Identidade oficial do hotel: verde, verde-claro, amarelo e fundo branco.', themeColor:'#006b3c', swatches:['#006b3c','#73b842','#f6c515','#ffffff'] },
    mantiqueira_natural: { label:'Mantiqueira Natural', description:'Visual gastronômico original com tons de mata, creme e madeira.', themeColor:'#174f32', swatches:['#174f32','#22663f','#f7f1e6','#6e5841'] }
  };

  const $ = (selector) => document.querySelector(selector);
  let pendingSkin = null;
  let ads = [];
  let products = [];
  let adIndex = 0;
  let selectedAdId = null;
  let selectedProductId = null;
  let mediaDirty = false;
  let currentLogo = '';

  function normalizeSkin(name){ return Object.prototype.hasOwnProperty.call(SKINS,name)?name:DEFAULT_SKIN; }
  function activeSkin(){ return normalizeSkin(document.body?.dataset.skin || localStorage.getItem(STORAGE_KEY) || DEFAULT_SKIN); }
  function assetUrl(url){ if(!url)return ''; return /^(?:https?:|data:|blob:)/i.test(url)?url:withBase(url); }
  function esc(value){ return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  function applySkin(name,persist=true){
    const skinName=normalizeSkin(name),skin=SKINS[skinName];
    if(document.body)document.body.dataset.skin=skinName;
    if(persist)localStorage.setItem(STORAGE_KEY,skinName);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content',skin.themeColor);
    document.dispatchEvent(new CustomEvent('food:skin-changed',{detail:{skin:skinName}}));
    return skinName;
  }

  function applyLogo(url){
    currentLogo=String(url||'');
    const resolved=assetUrl(currentLogo);
    document.querySelectorAll('[data-food-logo]').forEach(img=>{
      if(resolved){img.src=resolved;img.classList.remove('hidden')}else{img.removeAttribute('src');img.classList.add('hidden')}
    });
    document.querySelectorAll('[data-food-logo-fallback]').forEach(node=>node.classList.toggle('hidden',!!resolved));
    renderLogoPreview();
  }

  function renderLogoPreview(){
    const img=$('#settingsLogoPreview'),placeholder=$('#settingsLogoPlaceholder');if(!img||!placeholder)return;
    const resolved=assetUrl(currentLogo);
    if(resolved){img.src=resolved;img.classList.remove('hidden');placeholder.classList.add('hidden')}else{img.removeAttribute('src');img.classList.add('hidden');placeholder.classList.remove('hidden')}
  }

  function modal(name,open){
    const host=document.getElementById(name);if(!host)return;
    host.classList.toggle('hidden',!open);host.setAttribute('aria-hidden',open?'false':'true');
    document.body.classList.toggle('modal-open',open||!!document.querySelector('.food-modal:not(.hidden)'));
    if(open)setTimeout(()=>host.querySelector('input,button,select,textarea')?.focus(),20);
  }
  function closeAll(){document.querySelectorAll('.food-modal').forEach(h=>{h.classList.add('hidden');h.setAttribute('aria-hidden','true')});document.body.classList.remove('modal-open')}
  function authHeader(){return sessionStorage.getItem(AUTH_KEY)||''}

  async function adminJson(url,options={}){
    const response=await fetch(withBase(url),{...options,headers:{Authorization:authHeader(),'content-type':'application/json',...(options.headers||{})},cache:'no-store'});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.message||data.error||`HTTP ${response.status}`);
    return data;
  }
  async function adminUpload(url,file,field='photo'){
    if(!file)throw new Error('Selecione uma imagem.');
    if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Use JPG, PNG ou WEBP.');
    if(file.size>8*1024*1024)throw new Error('A imagem deve ter no máximo 8 MB.');
    const form=new FormData();form.append(field,file);
    const response=await fetch(withBase(url),{method:'POST',headers:{Authorization:authHeader()},body:form});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.message||data.error||`HTTP ${response.status}`);
    return data;
  }

  function renderSkinCards(){
    const grid=$('#skinGrid');if(!grid)return;const selected=normalizeSkin(pendingSkin||activeSkin());
    grid.innerHTML=Object.entries(SKINS).map(([value,skin])=>`<button type="button" class="skin-card ${value===selected?'selected':''}" data-skin-choice="${value}" aria-pressed="${value===selected}"><span class="skin-card-preview skin-card-preview--${value}"><span class="mini-header"></span><span class="mini-body"><i></i><i></i></span><span class="mini-footer"></span></span><span class="skin-card-copy"><strong>${skin.label}</strong><small>${skin.description}</small><span class="skin-swatches">${skin.swatches.map(c=>`<i style="--swatch:${c}"></i>`).join('')}</span></span><span class="skin-check">✓</span></button>`).join('');
    grid.querySelectorAll('[data-skin-choice]').forEach(b=>b.addEventListener('click',()=>{pendingSkin=normalizeSkin(b.dataset.skinChoice);applySkin(pendingSkin,false);$('#currentSkinName').textContent=SKINS[pendingSkin].label;renderSkinCards()}));
  }

  function setStatus(message,type='info'){
    const host=$('#settingsSavedMessage');if(!host)return;host.textContent=message;host.style.color=type==='error'?'#b52d2d':'#006b3c';host.classList.add('show');setTimeout(()=>host.classList.remove('show'),3000);
  }
  function setLogoStatus(message,type='info'){const h=$('#logoUploadStatus');if(!h)return;h.textContent=message;h.style.color=type==='error'?'#b52d2d':type==='success'?'#006b3c':'#657268'}

  async function loadBranding(){
    try{const x=await adminJson('/api/admin/branding');applyLogo(x.logo_url||'');}
    catch(_){const legacy=localStorage.getItem(LEGACY_LOGO_KEY)||'';applyLogo(legacy);}
  }

  function renderAdEditor(){
    const stage=$('#adEditorStage'),dots=$('#adEditorDots');if(!stage||!dots)return;
    if(!ads.length){stage.innerHTML='<div class="empty-media"><strong>Nenhuma propaganda cadastrada.</strong><span>Use “+ Nova propaganda” para criar a primeira.</span></div>';dots.innerHTML='';return;}
    adIndex=Math.max(0,Math.min(adIndex,ads.length-1));const ad=ads[adIndex];selectedAdId=ad.id;
    const image=assetUrl(ad.media_url);
    stage.innerHTML=`<article class="ad-edit-card">
      <button type="button" class="clickable-media ad-media-edit" id="currentAdImage">${image?`<img src="${esc(image)}" alt="${esc(ad.title)}">`:'<span class="media-placeholder">Clique para adicionar a imagem da propaganda</span>'}<span class="media-edit-badge">Trocar imagem</span></button>
      <div class="ad-fields">
        <div class="settings-field"><label>Título</label><input id="adTitleInput" value="${esc(ad.title||'')}"></div>
        <div class="settings-field"><label>Texto da propaganda</label><textarea id="adMessageInput" rows="3">${esc(ad.message||'')}</textarea></div>
        <div class="ad-field-row"><div class="settings-field"><label>Tempo na tela (segundos)</label><input id="adDurationInput" type="number" min="5" max="120" value="${Number(ad.duration_seconds)||10}"></div><label class="settings-check"><input id="adActiveInput" type="checkbox" ${Number(ad.active)!==0?'checked':''}><span>Propaganda ativa</span></label></div>
        <div class="settings-inline-actions"><button type="button" class="settings-primary" id="saveAdBtn">Salvar propaganda</button><button type="button" class="settings-danger" id="deleteAdBtn">Excluir</button></div>
      </div></article>`;
    dots.innerHTML=ads.map((_,i)=>`<button type="button" class="carousel-dot ${i===adIndex?'active':''}" data-ad-index="${i}" aria-label="Propaganda ${i+1}"></button>`).join('');
    dots.querySelectorAll('[data-ad-index]').forEach(b=>b.addEventListener('click',()=>{adIndex=Number(b.dataset.adIndex);renderAdEditor()}));
    $('#currentAdImage')?.addEventListener('click',()=>$('#adImageInput')?.click());
    $('#saveAdBtn')?.addEventListener('click',saveCurrentAd);
    $('#deleteAdBtn')?.addEventListener('click',deleteCurrentAd);
  }

  async function loadAds(){ads=await adminJson('/api/admin/ads');renderAdEditor()}
  async function saveCurrentAd(){
    if(!selectedAdId)return;
    try{await adminJson(`/api/admin/ads/${selectedAdId}`,{method:'PATCH',body:JSON.stringify({title:$('#adTitleInput').value.trim()||'Propaganda',message:$('#adMessageInput').value.trim(),duration_seconds:Math.max(5,Number($('#adDurationInput').value)||10),active:$('#adActiveInput').checked?1:0,sort_order:adIndex*10})});mediaDirty=true;await loadAds();setStatus('Propaganda salva.','success')}catch(e){setStatus(e.message,'error')}
  }
  async function addAd(){
    try{const x=await adminJson('/api/admin/ads',{method:'POST',body:JSON.stringify({title:'Nova propaganda',message:'Toque para começar.',duration_seconds:10,active:true,sort_order:ads.length*10})});await loadAds();adIndex=Math.max(0,ads.findIndex(a=>a.id===x.id));renderAdEditor();mediaDirty=true;setStatus('Nova propaganda criada. Clique na imagem para enviar a arte.','success')}catch(e){setStatus(e.message,'error')}
  }
  async function deleteCurrentAd(){
    if(!selectedAdId||!confirm('Excluir esta propaganda?'))return;
    try{await adminJson(`/api/admin/ads/${selectedAdId}`,{method:'DELETE'});adIndex=Math.max(0,adIndex-1);mediaDirty=true;await loadAds();setStatus('Propaganda excluída.','success')}catch(e){setStatus(e.message,'error')}
  }
  async function uploadAdImage(file){
    if(!selectedAdId)return;
    try{setStatus('Enviando imagem...');await adminUpload(`/api/admin/ads/${selectedAdId}/image`,file);mediaDirty=true;await loadAds();setStatus('Imagem da propaganda atualizada.','success')}catch(e){setStatus(e.message,'error')}
  }

  function renderProducts(){
    const grid=$('#productMediaGrid');if(!grid)return;
    if(!products.length){grid.innerHTML='<div class="empty-media">Nenhum produto cadastrado.</div>';return;}
    grid.innerHTML=products.map(p=>`<button type="button" class="product-media-card" data-product-media="${p.id}"><span class="product-media-photo">${p.image_url?`<img src="${esc(assetUrl(p.image_url))}" alt="${esc(p.name)}">`:'<span class="media-placeholder">Sem foto</span>'}<span class="media-edit-badge">Trocar imagem</span></span><strong>${esc(p.name)}</strong><small>${esc(p.category_name||'')}</small></button>`).join('');
    grid.querySelectorAll('[data-product-media]').forEach(b=>b.addEventListener('click',()=>{selectedProductId=b.dataset.productMedia;$('#productImageInput')?.click()}));
  }
  async function loadProducts(){products=await adminJson('/api/admin/products');renderProducts()}
  async function uploadProductImage(file){
    if(!selectedProductId)return;
    try{setStatus('Enviando foto do produto...');await adminUpload(`/api/admin/products/${selectedProductId}/image`,file);mediaDirty=true;await loadProducts();setStatus('Foto do produto atualizada.','success')}catch(e){setStatus(e.message,'error')}
  }

  async function uploadLogo(file){
    try{setLogoStatus('Enviando logo...');const x=await adminUpload('/api/admin/branding/logo',file,'logo');applyLogo(x.logo_url||'');localStorage.removeItem(LEGACY_LOGO_KEY);mediaDirty=true;setLogoStatus('Logo salva no servidor e aplicada ao totem.','success')}catch(e){setLogoStatus(e.message,'error')}
  }
  async function removeLogo(){
    try{await adminJson('/api/admin/branding/logo',{method:'DELETE'});applyLogo('');localStorage.removeItem(LEGACY_LOGO_KEY);mediaDirty=true;setLogoStatus('Logo removida. O texto de fallback será exibido.','success')}catch(e){setLogoStatus(e.message,'error')}
  }

  async function loadSettingsMedia(){
    const loading=$('#adEditorStage');if(loading)loading.innerHTML='<div class="settings-loading">Carregando propagandas...</div>';
    try{await Promise.all([loadBranding(),loadAds(),loadProducts()])}catch(e){setStatus('Falha ao carregar mídias: '+e.message,'error')}
  }

  async function openSettings(){pendingSkin=activeSkin();mediaDirty=false;renderSkinCards();$('#currentSkinName').textContent=SKINS[pendingSkin].label;modal('settingsModal',true);await loadSettingsMedia()}

  async function validateAdmin(){
    const password=$('#settingsPassword')?.value||'',error=$('#settingsLoginError');if(error)error.textContent='';if(!password){if(error)error.textContent='Informe a senha.';return}
    const token='Basic '+btoa(unescape(encodeURIComponent(`${TECHNICAL_ADMIN_USER}:${password}`))),button=$('#settingsLoginBtn');if(button)button.disabled=true;
    try{const r=await fetch(withBase('/api/admin/summary'),{headers:{Authorization:token},cache:'no-store'});if(!r.ok)throw new Error(r.status===401?'Senha inválida.':`Falha de autenticação (HTTP ${r.status}).`);sessionStorage.setItem(AUTH_KEY,token);$('#settingsPassword').value='';modal('settingsLoginModal',false);await openSettings()}catch(e){if(error)error.textContent=e.message}finally{if(button)button.disabled=false}
  }
  function requestSettings(){if(authHeader())openSettings();else{if($('#settingsPassword'))$('#settingsPassword').value='';if($('#settingsLoginError'))$('#settingsLoginError').textContent='';modal('settingsLoginModal',true)}}

  function finishSettings(saveSkin){
    if(saveSkin)applySkin(normalizeSkin(pendingSkin||activeSkin()),true);else applySkin(localStorage.getItem(STORAGE_KEY)||DEFAULT_SKIN,false);
    modal('settingsModal',false);pendingSkin=null;
    if(mediaDirty)setTimeout(()=>location.reload(),120);
  }

  function bind(){
    $('#settingsBtn')?.addEventListener('click',requestSettings);$('#settingsLoginBtn')?.addEventListener('click',validateAdmin);$('#settingsPassword')?.addEventListener('keydown',e=>{if(e.key==='Enter')validateAdmin()});
    $('#saveSkinBtn')?.addEventListener('click',()=>finishSettings(true));$('#cancelSkinBtn')?.addEventListener('click',()=>finishSettings(false));$('#logoutSettingsBtn')?.addEventListener('click',()=>{sessionStorage.removeItem(AUTH_KEY);closeAll();if(mediaDirty)location.reload()});
    $('#chooseLogoBtn')?.addEventListener('click',()=>$('#logoUploadInput')?.click());$('#logoPreviewButton')?.addEventListener('click',()=>$('#logoUploadInput')?.click());$('#removeLogoBtn')?.addEventListener('click',removeLogo);
    $('#logoUploadInput')?.addEventListener('change',async e=>{const f=e.target.files?.[0];if(f)await uploadLogo(f);e.target.value=''});
    $('#addAdBtn')?.addEventListener('click',addAd);$('#prevAdBtn')?.addEventListener('click',()=>{if(!ads.length)return;adIndex=(adIndex-1+ads.length)%ads.length;renderAdEditor()});$('#nextAdBtn')?.addEventListener('click',()=>{if(!ads.length)return;adIndex=(adIndex+1)%ads.length;renderAdEditor()});
    $('#adImageInput')?.addEventListener('change',async e=>{const f=e.target.files?.[0];if(f)await uploadAdImage(f);e.target.value=''});$('#productImageInput')?.addEventListener('change',async e=>{const f=e.target.files?.[0];if(f)await uploadProductImage(f);e.target.value=''});
    document.querySelectorAll('[data-close-food-modal]').forEach(b=>b.addEventListener('click',()=>{const target=b.closest('.food-modal');if(target?.id==='settingsModal')finishSettings(false);else modal(target?.id,false)}));
    document.querySelectorAll('.food-modal').forEach(h=>h.addEventListener('pointerdown',e=>{if(e.target!==h)return;if(h.id==='settingsModal')finishSettings(false);else modal(h.id,false)}));
  }

  async function loadPublicBranding(){
    try{const r=await fetch(withBase('/api/public/bootstrap'),{cache:'no-store'});if(r.ok){const x=await r.json();applyLogo(x.store?.logo_url||'');return}}
    catch(_){}
    applyLogo(localStorage.getItem(LEGACY_LOGO_KEY)||'');
  }

  const initial=normalizeSkin(localStorage.getItem(STORAGE_KEY)||DEFAULT_SKIN);if(document.body)applySkin(initial,false);
  document.addEventListener('DOMContentLoaded',()=>{applySkin(initial,false);bind();renderSkinCards();loadPublicBranding()});
  window.foodTheme={skins:SKINS,applySkin,activeSkin,requestSettings,applyLogo};
})();
