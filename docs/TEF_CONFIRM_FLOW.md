# Fechamento da venda com TEF

Regra obrigatória para integração no `order-service`:

1. pagamento no gateway chega a `AUTHORIZED`;
2. o pedido NÃO muda para pago/concluído ainda;
3. executar as etapas locais que precisam estar consistentes antes do fechamento financeiro (incluindo fiscal conforme a política do estabelecimento);
4. somente após sucesso chamar `payment.confirmPayment(gateway_payment_id)`;
5. somente `APPROVED` libera o pedido;
6. se a etapa anterior ao confirm falhar, chamar cancel/non-confirm da transação TEF e manter o pedido não pago;
7. se o resultado ficar ambíguo, marcar para reconciliação manual/recovery; nunca iniciar segunda cobrança automaticamente.
