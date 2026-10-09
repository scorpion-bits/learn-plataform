/**
 * Quando o mascote da landing pode trocar o poster pelo vídeo (`/brand/mascot.webm`,
 * VP9 com canal alpha). Mesmo critério do site da marca (scorpion-bits.github.io,
 * js/main.js), que já passou por produção:
 *
 * 1. `canPlayType` de WebM/VP9: o WebKit do iOS devolve "" — perguntar ANTES de
 *    definir o `src` evita baixar o vídeo no iPhone para jogar fora.
 * 2. Safari (macOS e iOS, `navigator.vendor` "Apple…"): decodifica VP9 mas ignora o
 *    alpha e mostraria um retângulo preto — fica o poster.
 * 3. Modo leve (`html[data-lite]`), economia de dados ou rede 2g: fica o poster.
 *
 * Não há API que responda "este vídeo terá alpha respeitado"; um teste por canvas
 * dava falso negativo com decodificação por GPU (ver comentário no site da marca).
 */
export interface MascotEnv {
  canPlayWebmVp9: boolean;
  vendor: string;
  lite: boolean;
  saveData?: boolean;
  effectiveType?: string;
}

export function canAnimateMascot(env: MascotEnv): boolean {
  if (!env.canPlayWebmVp9) return false;
  if (/Apple/.test(env.vendor)) return false;
  if (env.lite || env.saveData) return false;
  if (/2g/.test(env.effectiveType ?? '')) return false;
  return true;
}
