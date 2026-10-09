# Pontos para revisão jurídica (REL-003)

> **Status: aprovado pelo responsável em 2026-10-09.** Revisitar se os textos legais ou o fluxo de exclusão mudarem.

Lista única do que o advogado deve validar antes do lançamento. Textos atuais: `/termos` e `/privacidade` (`src/app/(public)/termos/page.tsx`, `src/app/(public)/privacidade/page.tsx`). Dados da empresa: `src/config/company.ts`.

## Termos de uso
1. Política de reembolso de 7 dias (CDC art. 49): o meio de exercer o direito é informado nos Termos (Minha conta → Meus pedidos, ou e-mail) e o link aparece no checkout ("Ao comprar, você concorda com os Termos de uso"). Confirmar que isso atende o Decreto 7.962/2013, art. 5º.
2. "Um curso reembolsado não pode ser reembolsado novamente caso seja comprado outra vez" — validar.
3. Reembolso após 7 dias "caso a caso" — validar redação.

## Privacidade / LGPD (exclusão de conta — DB-008)
1. Guarda de `orders` e `payment_events` após a exclusão com base no art. 16, I (obrigação legal/fiscal): confirmar prazo e definir descarte ao fim (hoje não existe).
2. `payment_events.payload` guarda o corpo do webhook da AbacatePay (pode conter dados do pagador mascarados): manter intacto ou apagar seletivamente?
3. A AbacatePay mantém nome, e-mail, CPF e telefone do pagador como controladora/operadora própria: a política deve dizer isso? É preciso pedir eliminação a ela?
4. Logs de auditoria do Supabase Auth e backups podem manter o e-mail por um período: mencionar na política?
5. Recusar a exclusão enquanto há reembolso pendente ou PIX em aberto (com mensagem para aguardar): aceitável?
6. Redação da §6 da política ("registros ligados só a um identificador interno").
7. Exclusão imediata e irreversível, sem e-mail de comprovante: precisa de comprovante?
