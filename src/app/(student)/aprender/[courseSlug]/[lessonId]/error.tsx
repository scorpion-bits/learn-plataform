'use client';

import { PlayerRouteError } from '@/features/player/components/PlayerRouteError';

export default function LessonError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <PlayerRouteError {...props} />;
}
