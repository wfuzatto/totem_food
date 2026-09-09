'use strict';
const crypto = require('crypto');
const config = require('./config');

function safeEqual(a, b) {
  const aa = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

function basicAuth(credentials, realm) {
  return (req, res, next) => {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Basic ')) {
      return res.status(401).set('WWW-Authenticate', `Basic realm="${realm}"`).json({ error: 'AUTH_REQUIRED' });
    }
    const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
    const index = decoded.indexOf(':');
    const user = index >= 0 ? decoded.slice(0, index) : '';
    const password = index >= 0 ? decoded.slice(index + 1) : '';
    if (!safeEqual(user, credentials.user) || !safeEqual(password, credentials.password)) {
      return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
    }
    next();
  };
}

const adminAuth = basicAuth(config.admin, 'Totem Food Admin');
const kdsAuth = basicAuth(config.kds, 'Totem Food KDS');

function integrationAuth(req, res, next) {
  if (!config.integrationKey) return res.status(503).json({ error: 'INTEGRATION_KEY_NOT_CONFIGURED' });
  if (!safeEqual(req.headers['x-integration-key'] || '', config.integrationKey)) {
    return res.status(401).json({ error: 'INVALID_INTEGRATION_KEY' });
  }
  next();
}

module.exports = { adminAuth, kdsAuth, integrationAuth };
