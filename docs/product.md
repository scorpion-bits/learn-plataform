# Produto

> Gerado a partir do antigo MASTER_PLAN.md. Leia só a seção que sua tarefa precisa.

## 1. Visão do produto

**Objetivo.** Plataforma de cursos online da Scorpion Bits, começando por **desenvolvimento de jogos**. Substitui o projeto antigo (loja de PDFs "KodaBooks/Learn").

**Público.** Iniciantes e intermediários que querem criar jogos (alunos do GameLab/SESC, comunidade do estúdio); depois, devs em geral.

**Proposta.** Aprender game dev com quem faz jogos — conteúdo estruturado (curso → módulos → aulas → materiais), progresso persistente, experiência visual de estúdio de jogos (isométrica, identidade Scorpion Bits).

**Escopo do MVP.** Uso completo pelo celular (mobile-first + PWA instalável — ADR-019).

- Admin: dashboard com métricas essenciais; cursos (CRUD, publicar), ementa (módulos/aulas, reordenar), materiais (vídeo embed, texto markdown, arquivo para download, link); alunos (busca, perfil, atribuir/revogar curso); pedidos.
- Aluno: landing, catálogo público, página pública do curso, cadastro/login, biblioteca (comprados vs atribuídos, andamento, concluídos), player com navegação/retomada/progresso.
- Pagamento: AbacatePay (PIX; cartão se disponível) com webhook verificado e concessão idempotente.

**Fora do MVP (não construir agora)** — lista completa com motivos em `docs/post-mvp.md`. Cursos gratuitos, cupons, assinaturas, trilhas/bundles, certificados, comentários/fórum, avaliações, quizzes/exercícios corrigidos, slides HTML interativos (ADR-010), upload de vídeo próprio (ADR-011), OAuth social, gamificação (XP/badges), multi-idioma, app mobile, múltiplos instrutores, notificações por email além das do Supabase Auth, tema claro.

---

## 2. Estado atual

Detalhes: `docs/audit.md`.

- **Este repo**: vazio. Tudo será construído aqui.
- **Learn antigo** (Next 16 JS + Supabase + AbacatePay v1): funciona parcialmente, mas com **falhas críticas de segurança** — qualquer um vira admin no cadastro (S1) ou editando o próprio perfil (S2); middleware inativo (S3); conteúdo pago com cache público (S4); webhook confia no payload e não é atômico (S6/S7). Schema com drift (tabelas usadas que não existem nas migrations). Progresso em `localStorage`. Visual genérico índigo.
- **Reaproveitar**: padrão de clients `@supabase/ssr` + `getClaims`, hierarquia curso/módulo/aula, ideias do player, validação CPF/telefone, assets e tokens do site Scorpion Bits.
- **Descartar**: e-books, playlists, materiais avulsos, checkout polimórfico, `globals.css` de 3k linhas, `react-pdf`, escrita admin pelo client, migrations antigas.

---

## 3. Perguntas ao produto

| # | Pergunta | Resposta (2026-10-08) | Efeito |
|---|---|---|---|
| Q1 | Dados reais do Learn antigo a migrar? | **Não** | REL-002 cancelada (ADR-015) |
| Q2 | Supabase novo ou antigo? | **Novo** | ADR-015 |
| Q3 | TypeScript? | **Sim** | ADR-002 aceita |
| Q4 | YouTube não listado no MVP? | **Sim** | ADR-011 aceita |
| Q5 | Slides HTML interativos? | **Esquecer** | ADR-010 aceita; fora do escopo |
| Q6 | Métodos de pagamento? | **Só PIX (AbacatePay)**; estudar **Cakto** | ADR-016; estudo incluído em PAY-001 |
| Q7 | Domínio? | **Padrão Vercel** por enquanto | ADR-015 |
| Q8 | Reembolso revoga acesso? | **Sim** | ADR-017 |
| Q8b | Prazo de reembolso? | **Seguir o CDC: até 7 dias da compra**; regra de 10 min descartada | ADR-017 atualizada; PAY-003 desbloqueado |

## 4. Problemas conhecidos / riscos
- **R1** API AbacatePay em transição v1→v2 — mitigado por PAY-001 antes de qualquer código.
- **R2** Next 16 tem breaking changes vs. conhecimento dos modelos — agentes devem ler `node_modules/next/dist/docs/`.
- **R3** Supabase local exige Docker; ambientes de agentes na nuvem podem não ter — usar projeto Supabase de dev remoto e/ou rodar pgTAP no CI.
- **R4** Vídeos em YouTube não listado podem vazar (ADR-011).
