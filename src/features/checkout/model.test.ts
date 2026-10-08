import { describe, expect, it } from 'vitest';

import {
  countdownAnnouncement,
  formatCountdown,
  isFinalStatus,
  nextPollDelay,
  toQrSrc,
} from './model';

describe('formatCountdown', () => {
  it('formata mm:ss', () => {
    expect(formatCountdown(0)).toBe('00:00');
    expect(formatCountdown(59_000)).toBe('00:59');
    expect(formatCountdown(61_000)).toBe('01:01');
    expect(formatCountdown(60 * 60_000)).toBe('60:00');
  });
  it('arredonda para cima e nunca fica negativo', () => {
    expect(formatCountdown(1)).toBe('00:01');
    expect(formatCountdown(-5000)).toBe('00:00');
  });
});

describe('countdownAnnouncement', () => {
  it('anuncia por minuto', () => {
    expect(countdownAnnouncement(10 * 60_000)).toContain('10 minutos');
    expect(countdownAnnouncement(9 * 60_000 + 1)).toContain('10 minutos');
    expect(countdownAnnouncement(30_000)).toContain('1 minuto');
    expect(countdownAnnouncement(0)).toBe('O PIX expirou.');
  });
});

describe('nextPollDelay / isFinalStatus', () => {
  it('3 s com backoff até 5 s', () => {
    expect([0, 1, 2, 3, 10].map(nextPollDelay)).toEqual([3000, 3500, 4000, 4500, 5000]);
  });
  it('só pending não é final', () => {
    expect(isFinalStatus('pending')).toBe(false);
    for (const s of ['paid', 'failed', 'expired', 'refunded', 'canceled'] as const) {
      expect(isFinalStatus(s)).toBe(true);
    }
  });
});

describe('toQrSrc', () => {
  it('aceita só data URL de imagem base64', () => {
    expect(toQrSrc('data:image/png;base64,iVBORw0KG==')).toBe('data:image/png;base64,iVBORw0KG==');
    expect(toQrSrc('https://evil.test/x.png')).toBeNull();
    expect(toQrSrc('javascript:alert(1)')).toBeNull();
    expect(toQrSrc('data:text/html;base64,AAAA')).toBeNull();
    expect(toQrSrc(null)).toBeNull();
  });
});
