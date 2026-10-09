import { expect } from '@playwright/test';

import { loadE2eEnv } from './env';

/**
 * Caixa de email do Supabase local (Mailpit, `[local_smtp]` em supabase/config.toml,
 * API HTTP em /api/v1). Usada para confirmar o cadastro.
 */
interface MailpitSearch {
  messages?: { ID: string }[];
}
interface MailpitMessage {
  Text?: string;
  HTML?: string;
}

/** Espera o email para `to` chegar e devolve o link de confirmação (`/auth/v1/verify…`). */
export async function waitForConfirmationLink(to: string): Promise<string> {
  const base = loadE2eEnv().mailpitUrl;
  let id: string | undefined;

  await expect
    .poll(
      async () => {
        const res = await fetch(`${base}/api/v1/search?query=${encodeURIComponent(`to:${to}`)}`);
        if (!res.ok) return undefined;
        id = ((await res.json()) as MailpitSearch).messages?.[0]?.ID;
        return id;
      },
      { message: `email de confirmação para ${to} no Mailpit (${base})`, timeout: 30_000 },
    )
    .toBeTruthy();

  const res = await fetch(`${base}/api/v1/message/${id}`);
  expect(res.ok).toBe(true);
  const message = (await res.json()) as MailpitMessage;
  const source = `${message.Text ?? ''}\n${message.HTML ?? ''}`.replaceAll('&amp;', '&');
  const link = /https?:\/\/[^\s"'<>)]+\/auth\/v1\/verify[^\s"'<>)]*/.exec(source)?.[0];
  expect(link, 'link /auth/v1/verify no email').toBeTruthy();
  return link!;
}
