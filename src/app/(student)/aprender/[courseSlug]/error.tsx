'use client';

import { PlayerRouteError } from '@/features/player/components/PlayerRouteError';

export default function PlayerError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <PlayerRouteError {...props} />;
}
