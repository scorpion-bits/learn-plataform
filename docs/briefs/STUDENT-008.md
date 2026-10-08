# STUDENT-008 — Páginas legais (termos e privacidade)

**Agente:** A06 · **Modelo:** Haiku 5.5 · **Esforço:** baixo

## Objetivo
Criar `/termos` e `/privacidade` com texto-base em pt-BR (pendente de revisão jurídica) e garantir que o rodapé aponte para elas.

## Leia (somente isto)
- `docs/backlog.md` → seção `STUDENT-008` (dados da empresa e pendências)
- `docs/decisions.md` → ADR-017 (reembolso) — grep "ADR-017"
- `src/config/company.ts`
- Um exemplo de página pública simples: `src/app/(public)/page.tsx` (só estrutura)

## Entregas
- `src/app/(public)/termos/page.tsx` e `src/app/(public)/privacidade/page.tsx` (+ um CSS Module compartilhado de "prosa" com tokens).
- Termos: objeto (cursos online de game dev), conta e acesso (pessoal e intransferível), pagamento (PIX via AbacatePay), **reembolso: até 7 dias após a compra, sem justificativa, conforme CDC art. 49; após confirmação do reembolso o acesso ao curso é removido**, conduta, propriedade intelectual do conteúdo, alterações, contato e foro (Araraquara/SP). Dados de `company.ts`.
- Privacidade (LGPD): dados coletados (nome, email, CPF e telefone apenas para pagamento, progresso de aulas), finalidades, bases legais, compartilhamento (Supabase, AbacatePay, Vercel), retenção (dados de pedidos mantidos por obrigação legal), direitos do titular e como exercer (email de `company.ts`), cookies (só de sessão), controlador (dados de `company.ts`).
- Data de "última atualização" no topo. **Não** mostrar aviso de "pendente de revisão" na página; colocar esse aviso como comentário no topo de cada arquivo.
- Metadata (title/description) e `robots` indexável.

## Critérios de aceite
- Headings em ordem, largura de leitura confortável, 360px ok.
- `lint`, `typecheck`, `build` passam sem env.

## Não fazer
- Não editar `src/components/*`, `src/config/company.ts`, `src/app/(public)/page.tsx`, outros arquivos, `MASTER_PLAN.md`, `docs/changelog.md`. Sem commit/push. Sem dependências.

## Relatório final
Arquivos · pendências para a revisão jurídica.
