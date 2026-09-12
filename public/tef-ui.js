'use strict';

(() => {
  const nativeFetch = window.fetch.bind(window);
  const messages = {
    PENDING: 'Aguardando o terminal de pagamento...',
    WAITING_TERMINAL: 'Preparando o terminal de pagamento...',
    WAITING_CARD: 'Aproxime, insira ou passe seu cartão no terminal.',
    CARD_READ: 'Cartão lido. Aguarde...',
    WAITING_PIN: 'Digite sua senha no terminal.',
    PROCESSING: 'Processando pagamento...',
    AUTHORIZED: 'Pagamento autorizado. Finalizando a venda...',
    WAITING_CONFIRMATION: 'Pagamento autorizado. Finalizando a venda...',
    UNKNOWN: 'Confirmando o resultado da transação...',
    RECOVERY_REQUIRED: 'Recuperando a transação do terminal. Não tente pagar novamente.'
  };

  function showStatus(status) {
    const message = messages[String(status || '').toUpperCase()];
    if (!message) return;
    const host = document.querySelector('#toast');
    if (!host) return;
    host.textContent = message;
    host.classList.remove('hidden');
    clearTimeout(host._tefTimer);
    host._tefTimer = setTimeout(() => host.classList.add('hidden'), 1600);
  }

  window.fetch = async (...args) => {
    const response = await nativeFetch(...args);
    try {
      const request = args[0];
      const url = String(typeof request === 'string' ? request : request?.url || '');
      const isOrderStatus = /\/api\/public\/orders\/[^/?]+(?:\?.*)?$/.test(url);
      if (response.ok && isOrderStatus) {
        response.clone().json().then((order) => {
          if (order?.status === 'PAYMENT_PENDING') showStatus(order.payment_status);
        }).catch(() => {});
      }
    } catch (_) {}
    return response;
  };
})();
