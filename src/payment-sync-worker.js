'use strict';

const intervalMs=Math.max(500,Number(process.env.PAYMENT_SYNC_INTERVAL_MS||1000));
let running=false;

async function tick(){
  if(running)return;
  running=true;
  try{
    const {getPool}=require('./db');
    const orders=require('./order-service');
    const pool=getPool();
    const [rows]=await pool.query("SELECT DISTINCT order_id FROM payments WHERE provider='api_pagamento' AND status IN ('INITIATING','PENDING','AUTHORIZED') ORDER BY created_at LIMIT 50");
    for(const row of rows){
      try{await orders.syncGatewayPayment(row.order_id)}catch(error){console.warn('[payment-sync-worker]',row.order_id,error.code||error.message)}
    }
  }catch(error){
    // Durante o bootstrap o pool ainda pode nao estar inicializado.
    if(error.message!=='Database not initialized')console.warn('[payment-sync-worker]',error.code||error.message);
  }finally{running=false}
}

const timer=setInterval(()=>tick().catch(()=>{}),intervalMs);
timer.unref?.();
setTimeout(()=>tick().catch(()=>{}),1500).unref?.();
