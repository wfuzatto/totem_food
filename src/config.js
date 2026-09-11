'use strict';
const number = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
module.exports = {
  port: number(process.env.PORT, 3088),
  db: { host: process.env.DB_HOST || '127.0.0.1', port: number(process.env.DB_PORT, 3306), database: process.env.DB_NAME || 'totem_food', user: process.env.DB_USER || 'totem_food', password: process.env.DB_PASSWORD || 'change_me' },
  admin: { user: process.env.ADMIN_USER || 'admin', password: process.env.ADMIN_PASSWORD || 'change_admin_me' },
  kds: { user: process.env.KDS_USER || 'kds', password: process.env.KDS_PASSWORD || 'change_kds_me' },
  integrationKey: process.env.INTEGRATION_KEY || '',
  paymentProvider: process.env.PAYMENT_PROVIDER || 'mock',
  paymentGatewayUrl: process.env.PAYMENT_GATEWAY_URL || '',
  paymentGatewayApiKey: process.env.PAYMENT_GATEWAY_API_KEY || '',
  paymentGatewayTimeoutMs: number(process.env.PAYMENT_GATEWAY_TIMEOUT_MS, 15000),
  fiscalProvider: process.env.FISCAL_PROVIDER || 'mock',
  fiscalProviderUrl: process.env.FISCAL_PROVIDER_URL || '', fiscalProviderToken: process.env.FISCAL_PROVIDER_TOKEN || '',
  idleAdSeconds: number(process.env.IDLE_AD_SECONDS, 45), abandonedCartSeconds: number(process.env.ABANDONED_CART_SECONDS, 120),
  storeName: process.env.STORE_NAME || 'Totem Food', storeTaxId: process.env.STORE_TAX_ID || ''
};
