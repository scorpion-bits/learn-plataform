'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { shortcutAction } from '../model';

/**
 * Atalhos de teclado do player (ver `shortcutAction`): `[` anterior, `]` próxima,
 * `Alt+Shift+←/→` como alternativa. Não renderiza nada.
 */
export function LessonShortcuts({
  prevHref,
  nextHref,
}: {
  prevHref: string | null;
  nextHref: string | null;
}) {
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const action = shortcutAction(event);
      const href = action === 'prev' ? prevHref : action === 'next' ? nextHref : null;
      if (!href) return;
      event.preventDefault();
      router.push(href);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [router, prevHref, nextHref]);

  return null;
}
