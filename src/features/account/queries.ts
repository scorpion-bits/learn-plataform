import 'server-only';

import { createClient } from '@/lib/supabase/server';

export interface AccountProfile {
  fullName: string;
  /** Somente dígitos (ou vazio). */
  phone: string;
  /** Somente dígitos (ou vazio). */
  taxId: string;
}

/** Perfil do próprio usuário (RLS: só a própria linha). Falha do banco lança -> error.tsx. */
export async function getAccountProfile(userId: string): Promise<AccountProfile> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('full_name, phone, tax_id')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw new Error('Não foi possível carregar o perfil.');
  return {
    fullName: data?.full_name?.trim() ?? '',
    phone: data?.phone ?? '',
    taxId: data?.tax_id ?? '',
  };
}
