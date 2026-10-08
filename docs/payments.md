# Pagamentos — AbacatePay

> Status: **desenho aprovado, detalhes da API a confirmar em `PAY-001`** (spike de pesquisa). Não implementar `PAY-002+` antes disso.

## O que sabemos (verificado em 2026-10-08)
- O projeto antigo usava **API v1** `POST https://api.abacatepay.com/v1/billing/create` (PIX, `frequency: ONE_TIME`, valores em centavos, `customer` com `taxId`/`cellphone`, `products[].externalId`, `returnUrl`/`completionUrl`, `metadata`).
- A documentação atual de webhooks descreve payloads **v2** `{ id, event, apiVersion: 2, devMode, data }` com eventos `checkout.completed`, `checkout.refunded`, `checkout.disputed`, `transparent.completed`… (o antigo tratava `billing.paid`).
- Autenticação do webhook: `?webhookSecret=` na URL **e** header `X-Webhook-Signature` (HMAC-SHA256 do corpo bruto, base64). A origem da chave HMAC precisa ser confirmada.
- Retentativas: até 7 tentativas em ~18 h; sucesso = 2xx em até 30 s; todas as tentativas compartilham o mesmo `id` (deduplicar por ele). `410` desativa o webhook.

## PAY-001 deve responder
1. v1 ou v2 para criação de cobrança/checkout? Endpoint, payload, métodos (PIX e cartão?).
2. Como consultar o status de uma cobrança por id (para reconciliação e verificação pós-webhook).
3. Chave e algoritmo exatos do `X-Webhook-Signature`.
4. Eventos de expiração/falha/reembolso e seus nomes.
5. Modo dev/sandbox: como simular pagamento.
6. Limites e expiração padrão de uma cobrança PIX.

## Desenho

```text
Aluno ──▶ /checkout/[slug] ──startCheckout()──▶ orders(pending) ──▶ AbacatePay (cria cobrança, externalId=order.id)
   ◀──── redirect checkout_url ◀───────────────────────────────────────┘
   paga PIX
AbacatePay ──webhook──▶ /api/webhooks/abacatepay
   1. checa webhookSecret (timingSafeEqual) e HMAC do corpo bruto → 401 se inválido
   2. INSERT payment_events (provider_event_id unique) → se conflito: 200 (duplicado)
   3. evento de pagamento confirmado? → resolve order por provider_billing_id / externalId
   4. (defesa extra) consulta status na API do provedor
   5. rpc fulfill_order(...) → transação: confere amount == orders.amount_cents,
      status pending→paid, cria enrollment(source=purchase). Idempotente.
   6. 200. Erros transitórios → 500 (provedor re-tenta). Erro de dados → 200 + processing_error (não re-tentar em loop) + alerta no log.
Aluno ──▶ /checkout/pedido/[id] ── polling do status do próprio pedido ──▶ "Acessar curso" quando paid
```

## Regras
- **Preço nunca vem do cliente.** `amount_cents` é lido do curso no servidor e congelado no pedido.
- Pedido `pending` existente e não expirado para o mesmo usuário+curso é reaproveitado (clique duplo / voltar do navegador).
- Usuário que já tem acesso não pode iniciar checkout (409 amigável → "Você já possui este curso").
- Página de sucesso/retorno **nunca** concede acesso.
- CPF/telefone: validados (dígito verificador do CPF), salvos em `profiles` apenas do próprio usuário.
- Reembolso (`checkout.refunded`): marca `orders.status='refunded'` e revoga a matrícula de origem `purchase` daquele pedido (decisão a confirmar com produto).
- Admin: botão "Reconsultar pagamento" (reconciliação manual) e job de expiração de pendentes antigos (pós-MVP: Vercel Cron).
- Logs sem CPF completo nem payload bruto com dados pessoais.
