# Auditoria — PHASE 0

> Data: 2026-10-08 · Autor: Tech Lead (orquestrador)
> Escopo: `ThalesMiguelHajes/Learn` (plataforma antiga) e `scorpion-bits/scorpion-bits.github.io` (identidade visual).
> Este documento é o diagnóstico de origem. Decisões derivadas dele estão em `docs/decisions.md`.

---

## 1. Diagnóstico — o que existe hoje

### 1.1 Este repositório (`scorpion-bits/learn-plataform`)
Vazio (apenas `README.md`). Toda a plataforma será (re)construída aqui, portando do repositório antigo apenas o que passar pela auditoria.

### 1.2 Repositório antigo (`Learn`, ex-"KodaBooks")
~12.6k linhas JS/SQL/CSS. Nasceu como loja de e-books (PDF) e foi "pivotado" para cursos com adições incrementais.

| Área | Estado |
|---|---|
| Stack | Next.js **16.3** (App Router) + React 19, **JavaScript** (sem TS), `@supabase/ssr`, `react-pdf`. Sem testes, sem CI. |
| Estilo | Um único `globals.css` com **3.146 linhas**; paleta índigo/violeta genérica (Inter/Outfit via Google Fonts). Visual "template SaaS". |
| Rotas | `/` landing, `/(auth)/login|cadastro`, `/biblioteca/*` (aluno), `/admin/*` (admin), `/api/checkout`, `/api/webhook/abacatepay`, `/api/download/[id]`, `/api/materials/[id]/view/[[...path]]`. |
| Produtos | 3 entidades vendáveis paralelas: `ebooks`, `materials`, `courses` (checkout "polimórfico" sem FK). |
| Cursos | `courses → course_modules → course_lessons` (vídeo YouTube + texto) + `course_materials` (N:N com materials). |
| Acesso | `user_ebooks`, `user_materials`, `user_courses` (uma tabela por tipo, `assigned_by` nulo = compra). |
| Pagamento | AbacatePay **v1** `/billing/create` (PIX), `pending_checkouts`, `sales`, `sale_items`. |
| Progresso | **`localStorage`** — não persiste entre dispositivos, admin não enxerga. |
| Admin | CRUD de ebooks/materials/cursos, usuários, atribuições, vendas — **todas as escritas feitas no browser** com o client anon (segurança 100% dependente de RLS). |

### 1.3 Identidade visual (`scorpion-bits.github.io`)
Site estático, CSS artesanal (~3.8k linhas, muito bem comentado), PixiJS para um mini-jogo escondido.
- **Logo**: escorpião feito de cubos isométricos (corpo-cubo com rosto `>_<`, cauda de cubinhos, patas de cristal). Contorno navy grosso (`#10263a`-ish), faces em gradiente azul/ciano.
- **Paleta** (tokens reais do site): `--ink-950 #05090f`, `--ink-900 #080e16`, `--ink-850 #0c141f`, `--ink-800 #111c2a`; acentos `--cyan #6ad8fe`, `--blue #51a8f6`, `--indigo #5b6bf5`, `--violet #8b5cf6`, `--amber #ffc46b`, `--mint #7ee2a8`; textos `#eef5fb / #b4c6d7 / #7d94aa / #55697d`; linhas `rgba(126,190,232,.14/.34)`.
- **Tipografia**: "Grotesk" (display, woff2 self-hosted, 300–700) + Inter ("Body"), mono do sistema para rótulos/eyebrows. Escala fluida com `clamp()`.
- **Padrões gráficos**: malha isométrica em duas camadas com parallax (losangos 30°/-30°), cards com **topo chanfrado** (clip-path imitando face do cubo, `.why-card`), dock de navegação flutuante em pílula com blur, botões pílula, sistema orbital de cubos, "modo leve" automático para hardware fraco, `prefers-reduced-motion` respeitado.
- **Assets reutilizáveis**: `logo.png`, `logo-mark.png`, `logo-glyph.png`, `logo-poster.png`, `logo-anim.webm` (4 MB — usar só onde fizer sentido), `cube.png`, `scorpion_bits_isometric_cube.png`, `scorpion_bits_cube_thick_stroke.png`, `scorpion_bits_logo_stamp.png`, `favicon.png`, `og-cover.png`, fontes `grotesk-latin.woff2` / `inter-latin.woff2`, fotos do GameLab e projetos (para landing).

---

## 2. Problemas encontrados no projeto antigo

### 2.1 Segurança — CRÍTICOS (bloqueariam lançamento)
| # | Problema | Onde | Impacto |
|---|---|---|---|
| S1 | **Escalada de privilégio no cadastro**: `handle_new_user()` copia `raw_user_meta_data->>'role'` para `profiles.role`. Qualquer pessoa chama `supabase.auth.signUp({ options: { data: { role: 'admin' } } })` com a anon key pública e vira admin. | `001_initial_schema.sql` | Controle total da plataforma. |
| S2 | **Auto-promoção**: policy `UPDATE` em `profiles` permite o usuário atualizar a própria linha **inteira**, incluindo `role`. `update profiles set role='admin'` via REST. | `001_initial_schema.sql` | Idem. |
| S3 | **Middleware inativo**: o arquivo de proteção de rotas (`proxy.js`) está em `scripts/`, não em `src/` ou raiz — o Next nunca o executa. A proteção depende apenas de guards em páginas. | `scripts/proxy.js` | Defesa em profundidade ausente; sessão não é renovada no edge. |
| S4 | **Conteúdo pago com cache público**: rota de visualização de material responde `Cache-Control: public, max-age=3600` após checar permissão — CDN/proxies podem servir o arquivo a quem não comprou. | `api/materials/[id]/view` | Vazamento de conteúdo pago. |
| S5 | **HTML de terceiros servido na mesma origem** (slides HTML/JS) — executa com os cookies de sessão da app. | idem | XSS armazenado (vetor: conta admin comprometida ou upload malicioso). |
| S6 | **Webhook confia no payload**: concede acesso a partir de `metadata` e `amount` do corpo, sem validar assinatura HMAC nem consultar a API do provedor; segredo apenas em query string; sem conferência de valor contra o preço. | `api/webhook/abacatepay` | Pagamento forjado se o segredo vazar (logs de URL). |
| S7 | **Webhook não atômico / sem idempotência real**: insere `sales`, depois `sale_items`, depois concede acesso, depois marca `paid`; entregas concorrentes geram vendas duplicadas (sem UNIQUE em `billing_id`). Erro na concessão é só logado. | idem | Dados inconsistentes, aluno paga e não recebe. |
| S8 | `pending_checkouts` INSERT pelo próprio usuário com `status`/`billing_id` livres. | `004_payment_tables.sql` | Manipulação de estado de pagamento. |
| S9 | Funções `SECURITY DEFINER` sem `SET search_path`. | `002_fix_rls.sql` | Hardening ausente (alerta do Supabase linter). |

### 2.2 Banco / modelo
- **Drift de schema**: `sales`, `sale_items`, `playlists`, `playlist_ebooks`, bucket `covers`/`ebooks` são usados no código mas **não existem nas migrations**. O banco não é reproduzível.
- Três produtos paralelos (ebook/material/course) com checkout polimórfico **sem integridade referencial**.
- Acesso modelado como "existe linha em `user_x`"; compra vs. atribuição só por `assigned_by IS NULL`. Revogar uma atribuição apaga a evidência de compra.
- Sem status de publicação (só `is_active`), sem slug, nível, categoria, duração, ordem de materiais.
- `course_modules` legível por qualquer autenticado; lessons sem RLS de preview.
- Preço em `DECIMAL` reais e conversão `* 100` no código (risco de arredondamento) — usar centavos inteiros.
- CPF/telefone em `profiles` com UPDATE amplo.
- Download via curso usa `user_courses!inner` em `course_materials` sem FK entre elas → o embed falha; materiais de curso provavelmente nunca liberam.

### 2.3 Código / arquitetura
- Admin 100% client-side (`'use client'` + supabase browser) — sem camada de servidor, sem validação, sem auditoria.
- `globals.css` monolítico, classes globais colidindo; sem componentes de UI reais.
- Lógica duplicada (mapa tipo→tabela repetido em 4 lugares).
- `react-pdf` carregado para leitura — pesado; navegador já renderiza PDF.
- Progresso em `localStorage`.
- Sem tipagem, sem testes, sem CI, README padrão do create-next-app.
- Catálogo exige login (ruim para venda/SEO).

### 2.4 UX / visual
- Identidade genérica (índigo/violeta + glassmorphism), não conversa com a Scorpion Bits.
- Player funcional porém plano; "Marcar como concluída" sem persistência real.
- Estados de loading/erro/vazio inconsistentes.

---

## 3. O que reaproveitar

| Categoria | Reaproveitar | Como |
|---|---|---|
| Código | Padrão de clients `@supabase/ssr` (browser/server/service), `getClaims()` para validar sessão localmente, callback de auth, validações de CPF/telefone, `timingSafeEqual` no webhook | Portar e tipar (TS), com `server-only` no service client |
| Componentes | Ideias do `PlayerClient` (acordeão de módulos, barra de progresso, anterior/próxima), `Modal`, `Combobox`, `Pagination` como referência de comportamento | Reescrever sobre o novo design system |
| Banco | Hierarquia curso→módulo→aula, `update_updated_at()` trigger, buckets privado/público, ideia de signed URLs | Novo schema limpo (ver `docs/database.md`) |
| Autenticação | Supabase Auth email/senha + trigger de criação de perfil (corrigido) | Ver `docs/authentication.md` |
| Infra | Vercel + Supabase + AbacatePay (mantidos) | — |
| Assets | Todos os assets de marca do site Scorpion Bits; `scorpionbits-logo.png` | Copiar para `public/brand/` |
| Funcionalidades | Atribuição manual, venda manual (admin), checkout PIX, upload de pasta HTML em lotes (`scripts/bundle_lesson.js`) | Reescrever com servidor + RLS correta |

## 4. O que descartar
- E-books, playlists, `materials` como produto avulso, checkout polimórfico, `user_ebooks/user_materials`.
- `globals.css` antigo e toda a paleta índigo; fontes via Google Fonts.
- `react-pdf` (usar visualizador nativo via signed URL em `<iframe>`/`<object>`, com fallback de download).
- Escritas administrativas pelo client anon.
- Progresso em `localStorage`.
- Migrations antigas (o novo projeto começa com schema limpo; migração de dados é tarefa separada `REL-002`, se houver dados em produção).
