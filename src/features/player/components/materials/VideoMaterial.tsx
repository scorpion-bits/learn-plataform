'use client';

import { useEffect, useRef, useState } from 'react';

import { buildVideoEmbed } from '../../model';
import { PlayIcon } from '../icons';

import styles from './Materials.module.css';

export interface VideoMaterialProps {
  provider: string;
  videoId: string;
  /** Título do material; vira o `title` do iframe (leitor de tela). */
  title: string;
}

/**
 * Embed "lite": mostra miniatura + botão de play e só cria o iframe (YouTube
 * `youtube-nocookie.com` / `player.vimeo.com`) depois do clique. Nada de terceiros
 * é carregado antes disso, exceto a miniatura do YouTube.
 */
export function VideoMaterial({ provider, videoId, title }: VideoMaterialProps) {
  const embed = buildVideoEmbed(provider, videoId);
  const [playing, setPlaying] = useState(false);
  const [thumbFailed, setThumbFailed] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);

  // o botão some ao virar iframe: devolve o foco para o player
  useEffect(() => {
    if (playing) frameRef.current?.focus();
  }, [playing]);

  if (!embed) {
    return (
      <p className={styles.notice} role="status">
        Este vídeo não pode ser exibido aqui. Avise o suporte se o problema continuar.
      </p>
    );
  }

  if (playing) {
    return (
      <div className={styles.videoFrame}>
        <iframe
          ref={frameRef}
          src={embed.src}
          title={`${title} (vídeo do ${embed.providerLabel})`}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className={styles.iframe}
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      className={`${styles.videoFrame} ${styles.poster}`}
      onClick={() => setPlaying(true)}
      aria-label={`Reproduzir vídeo: ${title}`}
    >
      {embed.thumbnailUrl && !thumbFailed ? (
        // Miniatura externa já otimizada pelo provedor; next/image exigiria liberar o host.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={embed.thumbnailUrl}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className={styles.thumb}
          onError={() => setThumbFailed(true)}
        />
      ) : null}
      <span className={styles.playButton} aria-hidden="true">
        <PlayIcon />
      </span>
      <span className={styles.posterLabel} aria-hidden="true">
        {embed.providerLabel}
      </span>
    </button>
  );
}
