'use client';

import { Dialog } from '../Dialog/Dialog';
import type { DialogProps } from '../Dialog/Dialog';

export type DrawerProps = Omit<DialogProps, 'variant'>;

/** Dialog em formato de gaveta: bottom-sheet (< 720px, respeita safe-area) / lateral à direita (desktop). */
export function Drawer(props: DrawerProps) {
  return <Dialog {...props} variant="sheet" />;
}
