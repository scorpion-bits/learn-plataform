import { describe, expect, it } from 'vitest';

import { canAnimateMascot } from './mascot-anim';

const chrome = { canPlayWebmVp9: true, vendor: 'Google Inc.', lite: false };

describe('canAnimateMascot', () => {
  it('anima no Chrome/Edge/Firefox com WebM VP9', () => {
    expect(canAnimateMascot(chrome)).toBe(true);
    expect(canAnimateMascot({ ...chrome, vendor: '' })).toBe(true); // Firefox
  });

  it('iPhone (sem WebM) fica no poster', () => {
    expect(
      canAnimateMascot({ ...chrome, canPlayWebmVp9: false, vendor: 'Apple Computer, Inc.' }),
    ).toBe(false);
  });

  it('Safari que decodifica VP9 mas ignora o alpha fica no poster', () => {
    expect(canAnimateMascot({ ...chrome, vendor: 'Apple Computer, Inc.' })).toBe(false);
  });

  it('modo leve, economia de dados e 2g ficam no poster', () => {
    expect(canAnimateMascot({ ...chrome, lite: true })).toBe(false);
    expect(canAnimateMascot({ ...chrome, saveData: true })).toBe(false);
    expect(canAnimateMascot({ ...chrome, effectiveType: 'slow-2g' })).toBe(false);
    expect(canAnimateMascot({ ...chrome, effectiveType: '4g' })).toBe(true);
  });
});
