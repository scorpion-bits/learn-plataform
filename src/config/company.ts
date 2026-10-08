/** Dados institucionais (rodapé, termos, comprovantes). Única fonte: não repetir em componentes. */
export const company = {
  brand: 'Scorpion Bits',
  legalName: '60.345.144 THALES MIGUEL HAJES',
  cnpj: '60.345.144/0001-01',
  address: 'Av. Paulino Rodella, 1234 — Parque Laranjeiras — Araraquara/SP — CEP 14801-515',
  email: 'scorpionbits.contato@gmail.com',
} as const;

export type Company = typeof company;
