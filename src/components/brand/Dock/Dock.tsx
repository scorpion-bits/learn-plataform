import type { ReactNode } from 'react';

import { DockShell } from './DockShell';

export interface DockProps {
  /** Marca (normalmente `<Logo />`). */
  brand: ReactNode;
  /** Links de navegação (`<DockLink>`). Recebem `<nav aria-label>` automaticamente. */
  nav?: ReactNode;
  /** Ações à direita (botões de entrar/comprar). No mobile ficam no rodapé do menu. */
  actions?: ReactNode;
  /**
   * Sempre visível, inclusive no mobile, ao lado do botão de menu (ex.: avatar
   * do aluno). No mobile a ordem visual difere da de tabulação.
   */
  trailing?: ReactNode;
  navLabel?: string;
  className?: string;
}

/**
 * Navegação flutuante em pílula com blur (do `.dock` do site). `sticky`, com
 * estado "grudado" via IntersectionObserver (sem listener de scroll). No
 * mobile (<= 860px) a navegação vira uma folha em tela cheia, com alvos de
 * 56px e áreas seguras respeitadas.
 *
 * Server Component: só o chrome interativo (DockShell) é client; os slots
 * continuam renderizados no servidor. Deve ser filho direto de um contêiner
 * alto (o `<body>`/shell), senão o `position: sticky` não gruda.
 */
export function Dock({
  brand,
  nav,
  actions,
  trailing,
  navLabel = 'Principal',
  className,
}: DockProps) {
  return (
    <DockShell
      brand={brand}
      nav={nav}
      actions={actions}
      trailing={trailing}
      navLabel={navLabel}
      className={className}
    />
  );
}
