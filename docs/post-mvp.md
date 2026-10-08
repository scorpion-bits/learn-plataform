# Ideias para depois do MVP

> Lista única do que **ficou fora do MVP de propósito**, com o motivo e o que já deixamos preparado.
> Consulte depois do lançamento para decidir a próxima fase. Ao promover um item, crie as tarefas no `MASTER_PLAN.md` e, se for estrutural, uma ADR em `docs/decisions.md`.

## Celular / app
| Ideia | Por que ficou para depois | O que já está preparado |
|---|---|---|
| **Baixar aulas para assistir sem internet** (modo offline) | Exige service worker, armazenamento local e proteção do conteúdo baixado; vídeos hoje são do YouTube, que não permite download | Plataforma já é PWA instalável (ADR-019) — dá para evoluir com service worker |
| **Notificações no celular** (push: "nova aula", "continue seu curso") | Exige service worker + Web Push + consentimento; iOS só suporta em PWA instalado | PWA instalável |
| **App nas lojas** (App Store / Google Play) | Custo de publicação/manutenção; o PWA cobre o uso no MVP | PWA pode ser empacotado (ex.: TWA no Android) |

## Conteúdo e aprendizado
| Ideia | Observação |
|---|---|
| Hospedagem de vídeo protegida (Bunny Stream / Mux com URL assinada) | YouTube não listado pode ter o link vazado (ADR-011) |
| Quizzes / exercícios corrigidos / projetos com entrega | Novos tipos em `material_type` |
| Certificados de conclusão | Progresso já fica no banco (ADR-007) |
| Comentários / dúvidas por aula, fórum, comunidade | |
| Avaliações e depoimentos de cursos | |
| Trilhas (sequência de cursos) e bundles | Nova tabela `products` se necessário (ADR-004) |
| Slides HTML interativos | Descartado pelo produto (ADR-010); se voltar, origem isolada |
| Gamificação (XP, conquistas em cubos isométricos) | Combina com a identidade visual |
| Outras áreas além de game dev (web, programação, ferramentas) | `categories` já suporta |
| Múltiplos instrutores | |

## Vendas e pagamentos
| Ideia | Observação |
|---|---|
| Cartão de crédito | Reavaliar AbacatePay × Cakto (`docs/payments.md` §9) |
| Afiliados | Ponto a favor da Cakto |
| Cupons de desconto | |
| Cursos gratuitos | Exige novo valor no enum de origem de matrícula |
| Assinatura (acesso a todos os cursos) | |
| Janela de reembolso extra e voluntária além dos 7 dias, condicionada a consumo (ex.: até 30 dias se < 20% assistido) | ADR-017 |

## Conta e plataforma
| Ideia | Observação |
|---|---|
| Login com Google / Discord | Supabase Auth suporta |
| Emails próprios (boas-vindas, compra confirmada, lembretes) | |
| Tema claro | Marca é escura; tokens permitem |
| Multi-idioma | |
| Domínio próprio (ex.: learn.scorpionbits.com) | Hoje usamos domínio padrão da Vercel (ADR-015) |
