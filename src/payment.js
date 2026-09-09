'use strict';
const crypto=require('crypto');const config=require('./config');
async function startPayment({order,method}){if(!['PIX','DEBIT','CREDIT'].includes(method))throw Object.assign(new Error('Invalid payment method'),{code:'INVALID_PAYMENT_METHOD'});if(config.paymentProvider==='mock')return{provider:'mock',status:'APPROVED',externalId:`MOCK-${crypto.randomUUID()}`,details:{simulated:true}};if(config.paymentProvider==='tef')return{provider:'tef',status:'PENDING',externalId:`TEF-${crypto.randomUUID()}`,details:{command:'START_PAYMENT',amount_cents:order.total_cents,method}};throw Object.assign(new Error('Payment provider not configured'),{code:'PAYMENT_PROVIDER_NOT_CONFIGURED'})}
module.exports={startPayment};
