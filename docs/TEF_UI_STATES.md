# Estados de UI TEF

`payment.details.ui_state` normaliza o estado do terminal:

- `WAITING_CARD`: mostrar “Aproxime, insira ou passe seu cartão”.
- `WAITING_PIN`: mostrar “Digite sua senha no terminal”.
- `PROCESSING`: mostrar “Processando pagamento...”.
- `WAITING_CONFIRMATION`: não liberar pedido; fechamento/fiscal deve confirmar a transação.
- `APPROVED`: pagamento concluído.
- `DECLINED`: pagamento negado.

`AUTHORIZED` no gateway mapeia para pagamento local ainda `PENDING` até confirmação definitiva.
