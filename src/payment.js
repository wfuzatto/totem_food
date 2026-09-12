'use strict';
const crypto=require('crypto');
const config=require('./config');

const METHODS=new Set(['PIX','DEBIT','CREDIT']);

function gatewayStatus(status){
  const value=String(status||'').toUpperCase();
  if(value==='AUTHORIZED')return'AUTHORIZED';
  if(value==='APPROVED')return'APPROVED';
  if(value==='DECLINED')return'DECLINED';
  if(value==='CANCELED'||value==='CANCELLED'||value==='EXPIRED')return'CANCELLED';
  if(value==='ERROR')return'ERROR';
  return'PENDING';
}

async function gatewayRequest(path,{method='GET',body=null,idempotencyKey=null}={}){
  if(!config.paymentGatewayUrl||!config.paymentGatewayApiKey)throw Object.assign(new Error('API Pagamento nao configurada'),{code:'PAYMENT_GATEWAY_NOT_CONFIGURED'});
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),config.paymentGatewayTimeoutMs);
  try{
    const headers={'accept':'application/json','x-api-key':config.paymentGatewayApiKey};
    if(body!==null)headers['content-type']='application/json';
    if(idempotencyKey)headers['idempotency-key']=idempotencyKey;
    const response=await fetch(`${config.paymentGatewayUrl.replace(/\/$/,'')}${path}`,{method,headers,body:body===null?undefined:JSON.stringify(body),signal:controller.signal});
    const data=await response.json().catch(()=>({}));
    if(!response.ok){
      const error=Object.assign(new Error(data.message||data.error||`API Pagamento HTTP ${response.status}`),{code:data.error||'PAYMENT_GATEWAY_ERROR',status:response.status});
      throw error;
    }
    return data;
  }catch(error){
    if(error.name==='AbortError')throw Object.assign(new Error('Timeout na API Pagamento'),{code:'PAYMENT_GATEWAY_TIMEOUT'});
    throw error;
  }finally{clearTimeout(timer)}
}

function normalizeGatewayPayment(payment,result={}){
  return{
    provider:'api_pagamento',
    status:gatewayStatus(payment.status),
    externalId:payment.id,
    details:{gateway_status:payment.status,acquirer:payment.provider||null,acquirer_external_id:payment.external_id||null,next_action:payment.next_action||null,refunds:payment.refunds||[],idempotent_replay:Boolean(result.idempotent_replay)}
  };
}

async function startPayment({order,method,idempotencyKey}){
  if(!METHODS.has(method))throw Object.assign(new Error('Invalid payment method'),{code:'INVALID_PAYMENT_METHOD'});
  if(config.paymentProvider==='mock')return{provider:'mock',status:'APPROVED',externalId:`MOCK-${crypto.randomUUID()}`,details:{simulated:true}};
  if(config.paymentProvider==='tef')return{provider:'tef',status:'PENDING',externalId:`TEF-${crypto.randomUUID()}`,details:{command:'START_PAYMENT',amount_cents:order.total_cents,method}};
  if(config.paymentProvider==='api_pagamento'){
    const metadata={order_number:order.order_number,service_mode:order.service_mode};
    if(config.paymentTerminalId)metadata.terminal_id=config.paymentTerminalId;
    const result=await gatewayRequest('/api/v1/payment-intents',{
      method:'POST',
      idempotencyKey:`totem_food:${idempotencyKey}`,
      body:{
        source_module:'totem_food',
        source_reference:order.id,
        merchant_id:config.storeTaxId||'totem_food',
        method,
        amount_cents:Number(order.total_cents),
        currency:'BRL',
        metadata
      }
    });
    const payment=result.payment||result;
    return normalizeGatewayPayment(payment,result);
  }
  throw Object.assign(new Error('Payment provider not configured'),{code:'PAYMENT_PROVIDER_NOT_CONFIGURED'});
}

async function getPaymentStatus(externalId){
  if(config.paymentProvider!=='api_pagamento')return null;
  const payment=await gatewayRequest(`/api/v1/payment-intents/${encodeURIComponent(externalId)}`);
  return normalizeGatewayPayment(payment);
}

async function confirmPayment(externalId){
  if(config.paymentProvider!=='api_pagamento')return null;
  const payment=await gatewayRequest(`/api/v1/payment-intents/${encodeURIComponent(externalId)}/confirm`,{method:'POST',body:{}});
  return normalizeGatewayPayment(payment);
}

module.exports={startPayment,getPaymentStatus,confirmPayment,gatewayStatus};
