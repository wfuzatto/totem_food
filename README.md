# Totem Food

Sistema de autoatendimento para alimentação em tela touch, inspirado nos padrões de usabilidade de grandes redes de fast-food, sem copiar marca ou identidade visual de terceiros.

## MVP implementado

- kiosk Electron opcional no equipamento físico;
- propaganda em tela cheia durante ociosidade;
- fluxo **Comer aqui / Levar**;
- categorias laterais e produtos no centro;
- barra inferior exibindo somente o total durante a seleção;
- revisão final de quantidades;
- nome opcional e número automático do pedido (`A001`, `A002`...);
- PIX, débito e crédito;
- provider `mock` e contrato `tef` para integração com pinpad/TEF;
- backoffice com produto, foto, descrição, alergênicos, NCM, CEST, preço, disponibilidade, estoque e praça;
- combos com preço final e preço alocado por componente;
- separação automática entre `KITCHEN` e `BAR`;
- filas de impressão 80 mm desacopladas;
- KDS para cozinha e bebidas;
- painel de chamada de pedidos;
- provider fiscal `mock` e provider HTTP preparado para solução fiscal homologada;
- auditoria básica;
- Docker Compose com Node.js 22 + MySQL 8.4;
- healthcheck `/api/health`.

## Subir em Docker

```bash
cp .env.example .env
# troque todas as senhas e tokens
docker compose up -d --build
```

Acessos:

- Totem: `http://IP:3088/`
- Administração: `http://IP:3088/admin`
- KDS cozinha: `http://IP:3088/kds?station=KITCHEN`
- KDS bebidas: `http://IP:3088/kds?station=BAR`
- Painel de chamada: `http://IP:3088/board`

## Arquitetura

```text
Touch/Electron kiosk
        |
     HTTPS
        |
 totem_food :3088
 Express + UI + API
    |          |
 MySQL 8.4   integrações
              |-- TEF/pinpad
              |-- fiscal
              |-- agente ESC/POS 80 mm
```

Periféricos USB que exigem driver local não precisam ficar dentro do container. O agente local consulta as filas/rotas da API.

## TEF

`PAYMENT_PROVIDER=mock` aprova automaticamente para teste. Com `PAYMENT_PROVIDER=tef`, o pedido fica pendente e o agente TEF deve devolver o evento:

```http
POST /api/integrations/tef/events
X-Integration-Key: <INTEGRATION_KEY>
Content-Type: application/json

{"external_id":"TEF-...","status":"APPROVED","nsu":"...","authorization_code":"..."}
```

A integração de produção deve ser homologada com a solução escolhida, por exemplo SiTef/PayGo/adquirente.

## Fiscal

`FISCAL_PROVIDER=mock` cria documento `SIMULATED`, sem valor fiscal. `FISCAL_PROVIDER=http` envia a venda para um serviço fiscal externo. Esse adaptador é o ponto para NFC-e/CF-e conforme UF, certificado, CSC, série e regras aplicáveis.

O snapshot de NCM e CEST é gravado no item do pedido para preservar o documento histórico mesmo se o cadastro for alterado depois.

## Combos e tributação

Cada componente do combo possui `combo_unit_price_cents`. O servidor exige que a soma dos componentes seja exatamente igual ao preço final do combo. Isso permite representar rateios e descontos comerciais reais por item.

A distribuição de preços não deve ser artificialmente manipulada apenas para reduzir tributos. A regra fiscal final precisa ser validada pelo contador e pelo integrador fiscal.

## Impressão 80 mm e KDS

Após pagamento aprovado, o backend cria `print_jobs` separados para cozinha e bar. Um agente ESC/POS pode consultar:

```http
GET /api/ops/print-jobs?destination=KITCHEN
Authorization: Basic <credenciais KDS>
```

Depois da impressão:

```http
POST /api/ops/print-jobs/:id/ack
Authorization: Basic <credenciais KDS>
Content-Type: application/json

{"ok":true,"agent":"cozinha-01"}
```

Sem impressora, o KDS permite `QUEUED -> PREPARING -> READY -> DELIVERED`.

## Itens adicionais previstos

Além do pedido inicial, o MVP já considera disponibilidade, estoque opcional, praça de produção, comer no local/levar, carrinho abandonado, acessibilidade, auditoria, painel de chamada e preços sempre recalculados no servidor.

Próximas evoluções: adicionais/modificadores, tamanhos/variações, promoções por horário, fidelidade, integração de estoque/ERP, editor visual completo de combos, multi-loja/multi-terminal, contingência compatível com a solução fiscal e observabilidade dos totens/periféricos.

## Segurança

- altere as credenciais do `.env`;
- não versione certificado A1, CSC, senhas TEF ou tokens reais;
- use HTTPS;
- mantenha MySQL apenas na rede Docker;
- restrinja `/admin` e integrações por rede/VPN/firewall;
- não confie em preços enviados pelo frontend;
- audite cancelamentos, estornos e reimpressões.
