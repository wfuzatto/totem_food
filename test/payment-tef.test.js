'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {gatewayUiState,gatewayStatus}=require('../src/payment');

test('uses terminal next_action as kiosk state',()=>{
  assert.equal(gatewayUiState({status:'ACTION_REQUIRED',next_action:{state:'WAITING_CARD'}}),'WAITING_CARD');
  assert.equal(gatewayUiState({status:'ACTION_REQUIRED',next_action:{state:'WAITING_PIN'}}),'WAITING_PIN');
  assert.equal(gatewayUiState({status:'ACTION_REQUIRED',next_action:{state:'PROCESSING'}}),'PROCESSING');
});

test('AUTHORIZED remains pending locally until explicit confirm',()=>{
  assert.equal(gatewayStatus('AUTHORIZED'),'PENDING');
  assert.equal(gatewayUiState({status:'AUTHORIZED'}),'WAITING_CONFIRMATION');
});

test('recovery state is preserved for safe UI',()=>{
  assert.equal(gatewayUiState({status:'UNKNOWN',next_action:{state:'RECOVERY_REQUIRED'}}),'RECOVERY_REQUIRED');
});
