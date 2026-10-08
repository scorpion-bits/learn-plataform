# Registro de decisões (ADR leve)

Formato: **ID — título** · status · data. Contexto → decisão → consequências.
Status: `aceita`, `proposta` (aguardando validação do responsável do produto), `substituída por ADR-xxx`.

---

### ADR-001 — Reconstruir neste repo, portando seletivamente do Learn antigo
`aceita` · 2026-10-08
- **Contexto**: o repo novo está vazio; o antigo tem falhas críticas de segurança (ver `docs/audit.md` §2.1), drift de schema e visual abaixo do desejado.
- **Decisão**: não copiar o projeto antigo inteiro. Criar fundação limpa aqui e portar trechos aprovados (clients Supabase, validações, ideias do player).
- **Consequências**: mais trabalho inicial na fundação; elimina dívida de segurança na origem.

### ADR-002 — Next.js 16 (App Router) + TypeScript
`aceita` (produto confirmou em 2026-10-08) · 2026-10-08
- **Contexto**: o antigo usa Next 16 em JS. Como estamos recomeçando, o custo de TS é baixo e os tipos gerados do Supabase (`supabase gen types`) evitam erros de coluna/RLS em toda a base.
- **Decisão**: Next.js 16 App Router, React 19, **TypeScript strict**. Server Components por padrão; Server Actions para mutações; Route Handlers só para webhooks/arquivos.
- **Consequências**: agentes devem ler `node_modules/next/dist/docs/` (Next 16 tem breaking changes — ex.: `middleware` → `proxy.ts`, `params` assíncronos).

### ADR-003 — Estilo: CSS Modules + tokens em CSS custom properties (sem Tailwind, sem UI kit)
`aceita` · 2026-10-08
- **Contexto**: a identidade Scorpion Bits é artesanal (clip-paths, malha isométrica, chanfros). Um kit (shadcn/MUI) puxaria para o visual genérico que queremos evitar; o site da marca já é CSS puro.
- **Decisão**: `src/styles/tokens.css` (variáveis), `src/styles/base.css` (reset/tipografia) e CSS Modules por componente. Nenhuma lib de UI. Primitivas acessíveis escritas à mão; `<dialog>` nativo para modais.
- **Consequências**: proibido criar `globals.css` monolítico. Toda cor/espaço/raio vem de token.

### ADR-004 — Produto único no MVP: **Curso**
`aceita` · 2026-10-08
- **Decisão**: só `courses` são vendáveis. E-books, materiais avulsos e playlists saem. PDFs passam a ser **materiais de aula**.
- **Consequências**: modelo de pedido/acesso simples (FK real para `courses`). Expansão futura (trilhas, bundles) entra como nova tabela `products` se e quando necessário.

### ADR-005 — Papéis em tabela própria, nunca editáveis pelo usuário nem vindos de metadata
`aceita` · 2026-10-08
- **Decisão**: `public.user_roles (user_id, role app_role)`; sem policies de escrita para `authenticated`; papel admin concedido apenas via SQL/service role (script de bootstrap). Checagem em SQL por `public.is_admin()` (`SECURITY DEFINER`, `search_path = ''`). O trigger de cadastro **ignora** `raw_user_meta_data.role`.
- **Consequências**: corrige S1/S2 do audit. Frontend nunca decide autorização.

### ADR-006 — Acesso a curso = tabela `enrollments` com **origem** e **revogação lógica**
`aceita` · 2026-10-08
- **Contexto**: precisamos distinguir comprado vs. atribuído e não perder histórico.
- **Decisão**: `enrollments` (um registro por concessão): `source in ('purchase','admin_grant')`, `order_id` (obrigatório se purchase), `granted_by`, `revoked_at/revoked_by/revoke_reason`. Acesso efetivo = existe concessão não revogada (`public.has_course_access(course_id)`). Índice único parcial `(user_id, course_id, source) where revoked_at is null`.
- **Consequências**: admin remover uma atribuição não apaga uma compra; o aluno pode ter as duas origens. A biblioteca mostra o selo "Comprado"/"Atribuído".

### ADR-007 — Progresso no banco
`aceita` · 2026-10-08
- **Decisão**: `lesson_progress (user_id, lesson_id, course_id, completed_at, last_position_seconds, updated_at)`. "Continuar de onde parou" = linha com `updated_at` mais recente do curso.
- **Consequências**: substitui `localStorage`; UI usa optimistic update com rollback.

### ADR-008 — Pagamentos: pedido no nosso banco é a fonte da verdade; acesso só via webhook verificado
`aceita` · 2026-10-08
- **Decisão**: `orders` (preço em centavos congelado na criação) + `payment_events` (dedupe por id do evento). Webhook: valida segredo + assinatura HMAC → grava evento → **reconsulta o status na API do AbacatePay** (ou valida o payload assinado) → chama `public.fulfill_order(order_id, …)` (função SQL atômica e idempotente que confere valor e cria `enrollment`). Página de retorno **nunca** concede acesso: só exibe estado do pedido (polling).
- **Consequências**: corrige S6/S7/S8. Versão exata da API (v1 vs v2) a confirmar em `PAY-001`.

### ADR-009 — Conteúdo protegido via Storage privado + URLs assinadas curtas geradas no servidor
`aceita` · 2026-10-08
- **Decisão**: buckets `course-covers` (público) e `course-content` (privado). Servidor checa `has_course_access` e emite signed URL (≤ 10 min), `Cache-Control: private, no-store` em respostas que dependam de sessão.
- **Consequências**: corrige S4.

### ADR-010 — HTML interativo (slides) fora do escopo; se um dia entrar, origem isolada
`aceita` (produto: "pode esquecer") · 2026-10-08
- **Decisão**: material tipo `html_bundle` fica no backlog pós-MVP (`STUDENT-010`). Implementação futura em iframe `sandbox` sem `allow-same-origin` servido de domínio separado.
- **Consequências**: corrige S5 por omissão. **Validar com o produto** se slides HTML são essenciais no lançamento.

### ADR-011 — Vídeo no MVP: embed de provedor externo (YouTube não listado / Vimeo / Bunny)
`aceita` (produto aceitou o risco de vazamento de link) · 2026-10-08
- **Contexto**: hospedagem de vídeo própria é cara e complexa. YouTube não listado **não é proteção real** (link vaza).
- **Decisão**: material `video` guarda `provider` + `external_id`; o player monta o embed. Só é entregue ao cliente se `has_course_access` (ou aula preview). Migração futura para Bunny Stream / Mux com URLs assinadas.
- **Consequências**: risco de compartilhamento de link aceito para o MVP — **validar com o produto**.

### ADR-012 — Catálogo e página de curso públicos
`aceita` · 2026-10-08
- **Decisão**: `/cursos` e `/cursos/[slug]` acessíveis sem login (SEO e conversão). Ementa (módulos/aulas: títulos e duração) é pública para cursos publicados; conteúdo das aulas não.

### ADR-013 — Sem bibliotecas extras sem justificativa
`aceita` · 2026-10-08
- Permitidas no MVP: `@supabase/ssr`, `@supabase/supabase-js`, `zod` (validação de input em Server Actions/rotas), `server-only`, dev: `vitest`, `@playwright/test`, `supabase` CLI, `prettier`. Markdown de aula: `react-markdown` + `rehype-sanitize` (quando `STUDENT-006`). Qualquer outra exige ADR.

### ADR-014 — Idioma e nomenclatura
`aceita` · 2026-10-08
- UI e documentação em **pt-BR**. Código, nomes de tabelas, colunas e rotas internas em **inglês**; URLs públicas em pt-BR (`/cursos`, `/entrar`, `/minha-biblioteca`).

### ADR-015 — Ambiente: Supabase novo, sem migração de dados, domínio Vercel padrão
`aceita` · 2026-10-08
- **Contexto**: o Learn antigo não tem usuários nem vendas reais.
- **Decisão**: criar um **projeto Supabase novo**; **não** haverá migração de dados (REL-002 cancelada); usar o domínio padrão `*.vercel.app` até haver domínio próprio.
- **Consequências**: `NEXT_PUBLIC_SITE_URL` aponta para a URL Vercel; trocar quando houver domínio (callbacks do Supabase Auth e URL do webhook precisam ser atualizados juntos).

### ADR-016 — Pagamento apenas PIX via AbacatePay no MVP; avaliar Cakto
`aceita` · 2026-10-08
- **Decisão**: MVP só com PIX pelo AbacatePay. `PAY-001` inclui um estudo comparativo **AbacatePay × Cakto** (taxas, métodos, API/webhooks, repasse, área de membros própria vs. integração). Troca só com nova ADR.
- **Consequências**: código de pagamento isolado em `src/lib/payments/` com interface pequena (`createCheckout`, `getPaymentStatus`, `verifyWebhook`) para que uma troca de provedor fique contida — sem criar abstração multi-provedor antecipada.

### ADR-017 — Reembolso revoga o acesso automaticamente
`aceita` · 2026-10-08
- **Decisão**: seguir o CDC (art. 49): o aluno pode pedir reembolso **a qualquer momento dentro de 7 dias** da compra, sem precisar justificar. Quando o reembolso é confirmado pelo provedor (evento de reembolso), `orders.status='refunded'` e a matrícula `purchase` daquele pedido é revogada automaticamente (`revoke_reason='refund'`). Depois de 7 dias, reembolso só por decisão manual do admin.
- **Descartado**: a regra de "10 minutos" proposta inicialmente (produto optou por seguir o CDC).
- **Regra estilo Steam ("só se viu menos de X% do curso")**: **não pode limitar os 7 dias legais** — o CDC/Decreto 7.962/2013 não preveem exceção por consumo de conteúdo digital e uma cláusula assim tende a ser considerada abusiva (art. 51). O que fazemos: (1) registrar o % do curso consumido no momento do pedido de reembolso, visível ao admin; (2) antiabuso: quem já reembolsou um curso não pode reembolsá-lo de novo após recomprar; (3) termos de uso explicando a política. Opcional futuro: janela **extra** e voluntária além dos 7 dias condicionada a consumo (ex.: até 30 dias se < 20% assistido). Validar com advogado antes do lançamento.
- **Consequências**: PAY-003 trata o evento de reembolso; a interface de pedido do aluno mostra até quando o reembolso pode ser pedido (pedido feito pelo canal de suporte/admin no MVP, a menos que PAY-001 mostre reembolso simples via API).

### ADR-018 — Checkout Transparente PIX (API v2) em vez de checkout hospedado
`aceita` · 2026-10-08 (resultado do PAY-001)
- **Contexto**: o checkout hospedado da AbacatePay v2 exige produtos cadastrados no provedor (preço fora do nosso banco, sem API de atualização). O transparente aceita `amount` por cobrança e devolve o QR PIX.
- **Decisão**: `POST /v2/transparents/create` com `amount = orders.amount_cents` e `externalId = order.id`; o aluno paga pelo QR exibido em `/checkout/pedido/[id]`. Pedido resolvido por `externalId` no webhook.
- **Segurança**: a assinatura `X-Webhook-Signature` usa chave **pública** (só integridade); a origem é provada apenas pelo `webhookSecret` da URL → reconsulta `GET /v2/transparents/check` é **obrigatória** antes de liberar acesso; a URL do webhook nunca é logada.
- **Consequências**: `orders.checkout_url` substituída por `pix_br_code`/`pix_br_code_base64`; `ABACATEPAY_WEBHOOK_HMAC_KEY` deixa de ser env; disputas (`transparent.disputed/lost`) só registram e alertam o admin (sem novo status). Produção exige CNPJ e site com termos/privacidade/CNPJ no rodapé (STUDENT-008). Cakto reavaliada se houver cartão/afiliados (ver `docs/payments.md` §9).
