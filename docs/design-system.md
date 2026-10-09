# Design system — "Scorpion Bits Learn"

> Direção: **isométrico + tecnológico + game dev + Scorpion Bits**. A plataforma deve parecer um produto do estúdio, não um template de cursos.
> Fonte da identidade: `scorpion-bits/scorpion-bits.github.io` (`css/style.css`, `assets/`). Ver análise em `docs/audit.md` §1.3.

## 1. Princípios
1. **O cubo é a unidade.** Progresso, conquistas, módulos e marcadores derivam do cubo isométrico da logo — não de círculos/ícones genéricos.
2. **Profundidade por geometria, não por blur.** Malha isométrica, chanfros e faces com 3 tons (topo claro, lateral média, lateral escura). Gradientes só para simular faces/luz.
3. **Escuro de base, luz ciano.** Fundo tinta (`ink`), acentos ciano/azul; âmbar e menta como sinais semânticos (destaque/sucesso).
4. **Movimento com propósito.** Resposta imediata ao clique (≤100 ms), transições curtas; respeitar `prefers-reduced-motion` e "modo leve" (herdado do site).
5. **Densidade diferente por área.** Público/aluno: expressivo, respirado. Admin: denso, legível, mesma linguagem mas com menos decoração.

## 2. Tokens (`src/styles/tokens.css`)
```css
:root {
  /* superfície (tinta) */
  --ink-950:#05090f; --ink-900:#080e16; --ink-850:#0c141f; --ink-800:#111c2a; --ink-700:#17263a;
  /* marca */
  --cyan:#6ad8fe; --blue:#51a8f6; --indigo:#5b6bf5; --violet:#8b5cf6;
  --amber:#ffc46b; --mint:#7ee2a8; --coral:#ff7a7a; /* coral = erro (novo, harmonizado) */
  --outline:#10263a;            /* contorno navy da logo */
  /* faces do cubo */
  --face-top: linear-gradient(90deg,#6a8dff,#41b8ff);
  --face-left:#63cdfc; --face-right:#3593cc;
  /* texto */
  --text:#eef5fb; --text-soft:#b4c6d7; --text-dim:#7d94aa; --text-faint:#55697d;
  /* linhas */
  --hair:rgba(126,190,232,.14); --hair-lit:rgba(126,190,232,.34); --grid-line:rgba(106,216,254,.055);
  /* semânticos */
  --success:var(--mint); --warning:var(--amber); --danger:var(--coral); --info:var(--cyan);
  --focus-ring: 0 0 0 2px var(--ink-950), 0 0 0 4px var(--cyan);
  /* tipografia */
  --font-display:"Grotesk",system-ui,sans-serif; --font-body:"Inter",system-ui,sans-serif;
  --font-mono:ui-monospace,"JetBrains Mono",Consolas,monospace;
  --s--1:clamp(.74rem,.71rem + .13vw,.81rem); --s-0:clamp(.94rem,.9rem + .18vw,1.02rem);
  --s-1:clamp(1.06rem,1rem + .3vw,1.22rem);   --s-2:clamp(1.3rem,1.15rem + .7vw,1.75rem);
  --s-3:clamp(1.75rem,1.4rem + 1.7vw,2.9rem); --s-4:clamp(2.4rem,1.6rem + 3.9vw,5.2rem);
  /* espaço, raio, movimento */
  --space-1:4px; --space-2:8px; --space-3:12px; --space-4:16px; --space-5:24px; --space-6:32px; --space-7:48px; --space-8:72px;
  --gutter:clamp(1rem,4vw,2.25rem);
  --r-sm:10px; --r:14px; --r-lg:26px; --r-pill:999px; --chamfer:18px;
  --ease:cubic-bezier(.22,1,.36,1); --dur-fast:120ms; --dur:220ms; --dur-slow:420ms;
}
```
Implementação real: `src/styles/tokens.css` (fonte da verdade; inclui tokens adicionais do UI-001: `--on-accent`, `--gradient-brand`, `--tint-*`, `--glow-*`, `--glass-*`, `--shadow-*`, `--lh-*`, `--tracking-*`, `--wrap`, `--measure`, `--dock-h`, `--z-*`, `--focus-outline/offset`; UI-002: `--tint-violet`, `--scrim`, `--tap` = 44px alvo mínimo; UI-003: `--face-top-a/b`, `--iso-slope`). `--font-display/--font-body` derivam de `--font-grotesk/--font-inter` (`next/font/local`). Estilos de elemento ficam em `@layer base` — CSS Modules sempre vencem. `--text-faint` **não é AA**: só decorativo. `--violet/--indigo` como texto só sobre ink-950/900.

Tema: **somente escuro** no MVP (a marca é escura). Contraste mínimo AA verificado para `--text-dim` sobre `--ink-900` em texto ≥ 14px.

## 3. Tipografia
- Display: **Grotesk** (woff2 do site da marca, via `next/font/local`), peso 600–700, `letter-spacing:-.03em` em títulos.
- Corpo: **Inter** (woff2 do site, `next/font/local`).
- Mono: eyebrows/rótulos técnicos ("MÓDULO 02 · 6 AULAS"), códigos, tempos.

## 4. Componentes de assinatura (`src/components/brand/`)
| componente | descrição | uso |
|---|---|---|
| `IsoBackdrop` | malha isométrica 2 camadas (do site), estática, sem JS/parallax; `variant: full | subtle`; camada de trás some em `[data-lite]` | fundo do público e do aluno; versão sutil no admin |
| `IsoCube` | cubo SVG paramétrico (tamanho, cor das faces, estado: vazio/preenchido/brilhando) | progresso, marcadores de aula, ícones |
| `CubeProgress` | trilha de cubos (1 cubo por aula ou por módulo) que "acendem" ao concluir + % numérico | card do curso, player, biblioteca |
| `ChamferCard` | card com topo chanfrado (técnica `.why-card`: borda por padding + `::before` com `clip-path: inherit`) | cards de curso, destaques |
| `Dock` | navegação flutuante em pílula com blur (do site) | topo público/aluno |
| `Logo` | marca + "Learn" (`Scorpion Bits <em>Learn</em>` estilo `.dock-brand`) | |
| `IsoCover` | moldura da capa do curso como face de um bloco isométrico (capa + faces laterais em CSS) | página do curso, hero |

Modo leve: `<html data-lite="1">` definido antes da pintura (`src/app/lite-mode-script.ts`; `?leve=1|0`, ≤2 núcleos/≤2 GB, saveData). Reduced-motion zera animações globalmente — loaders devem funcionar sem animação (ex.: pulso de opacidade vira estático, com texto/`aria-busy`).

## 5. Primitivas (`src/components/ui/`) — implementadas no UI-002, importar de `@/components/ui`
Link de prosa (sublinhado, o reset remove), Button (variantes primary/secondary/ghost/danger; estado `pending` com spinner e `aria-busy`, desabilita clique duplo), IconButton, Field (label + input + hint + erro, `aria-describedby`), Input, Textarea, Select nativo estilizado, Checkbox/Switch, Badge (origem: Comprado/Atribuído; estado: Rascunho/Publicado), Tabs, Dialog (`<dialog>`), Drawer (mobile), Toast (região `aria-live`), Skeleton, Spinner, EmptyState (ilustração com cubos), ErrorState (com "Tentar novamente"), Pagination, Table (admin, vira lista de cards < 720px), DropdownMenu.

## 6. Layouts
- **Público/aluno**: `Dock` flutuante; conteúdo até 1180px; hero com cubos/escorpião: `HeroMascot` mostra `mascot-poster.png` (2x) e troca por `mascot.webm` (VP9+alpha, recortado, ~1 MB) só onde o navegador suporta alpha em WebM — Safari/iPhone, modo leve, economia de dados e 2g ficam no poster (`_landing/mascot-anim.ts`).
- **Player**: tela cheia em 3 zonas — topo fino (curso + progresso em cubos + sair), conteúdo central (máx. 960px), ementa lateral direita recolhível (drawer bottom-sheet no mobile). Barra inferior fixa no mobile com Anterior / Concluir / Próxima.
- **Admin**: sidebar à esquerda (colapsa em ícones < 1100px, vira drawer < 720px), header com breadcrumbs, conteúdo denso. Mesmos tokens, malha só no header.

Implementação (UI-003): shells em `src/components/layout/` — `PublicShell`, `StudentShell` (tab bar inferior no mobile), `PlayerShell` (ementa lateral ≥ 1024px / Drawer abaixo; barra prev/concluir/próxima fixa no mobile), `AdminShell` (sidebar → ícones 720–1099px → Drawer < 720px). Route groups: `(public)`, `(auth)`, `(student)/(app)` (com StudentShell) e `(student)/aprender` (PlayerShell, sem chrome do aluno), `admin`. Backdrop `full` em público/aluno, `subtle` no admin.

## 7. Telas-chave (direção)
- **Landing**: hero "Aprenda a criar jogos com quem faz jogos" + escorpião; trilha de cursos como blocos isométricos empilhados; prova social (GameLab/SESC, projetos do estúdio).
- **Catálogo**: filtros como "chips" mono (categoria, nível); grid de `ChamferCard` com capa, nível em cubos (1–3), nº de aulas, duração, preço/selo "Na sua biblioteca". Evitar grade monótona: primeiro item destacado em largura dupla.
- **Página do curso**: `IsoCover` + resumo; ementa em acordeão com módulos numerados como "camadas"; CTA fixo no mobile.
- **Biblioteca**: "Continuar" (último curso, grande) + abas Em andamento / Concluídos / Todos; selo de origem.
- **Dashboard admin** (o placeholder do UI-003 ainda é genérico — ADMIN-001 deve aplicar a linguagem isométrica: KPIs com `IsoCube`/chanfro, gráfico com cores da marca): 4 KPIs (receita no período, vendas, alunos ativos, matrículas) + gráfico de receita por dia + top cursos + últimos pedidos.

## 8. Estados obrigatórios por tela
Loading (skeleton com a mesma geometria do conteúdo), Empty (cubo vazio + ação), Error (mensagem + tentar novamente, `error.tsx`), Success (toast/inline), Mobile (testado em 360px), Acessibilidade (teclado, foco visível, `aria-*`, landmarks).

## 9. Responsividade (mobile-first — ADR-019)
Celular é plataforma de primeira classe, inclusive no admin. PWA instalável. Use `100dvh`, `env(safe-area-inset-*)`, ações principais na zona do polegar, nada que dependa só de hover.
Breakpoints por conteúdo: `480`, `720`, `1024`, `1280`. Mobile-first. Alvos de toque ≥ 44px. Sem scroll horizontal em 360px.
