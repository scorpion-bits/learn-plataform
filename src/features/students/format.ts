const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const date = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'America/Sao_Paulo',
});

export const formatBRL = (cents: number) => brl.format(cents / 100);
export const formatDate = (iso: string | null) => (iso ? date.format(new Date(iso)) : '—');
/** Motivo exibido: `refund` é gravado pelo sistema no reembolso. */
export const formatRevokeReason = (reason: string | null) =>
  reason === 'refund' ? 'Reembolso' : (reason ?? 'Sem motivo registrado');
