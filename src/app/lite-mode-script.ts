/**
 * "Modo leve" (herdado do site da marca): decidido ANTES da primeira pintura,
 * marca `<html data-lite="1">`; o CSS desliga efeitos decorativos com
 * `[data-lite]` (ver tokens.css e IsoBackdrop.module.css).
 *
 * Liga quando: (a) ?leve=1 (força e guarda por 14 dias), (b) 2 núcleos ou
 * menos / 2 GB ou menos, (c) economia de dados (saveData). ?leve=0 desliga
 * e apaga o que estava guardado.
 *
 * Mínimo e defensivo: tudo em try/catch (localStorage pode lançar em janela
 * privada ou com dados bloqueados) e nunca quebra a página.
 *
 * CSP: este é um <script> inline; se um dia houver CSP estrita, ele precisa
 * de nonce/hash.
 */
export const LITE_MODE_SCRIPT = `(function(){var d=document.documentElement,k="sbl-lite",on=0,off=0,s=null;
try{s=window.localStorage}catch(e){}
try{var q=/[?&]leve=([01])/.exec(location.search);
if(q){if(q[1]==="1"){on=1;if(s)s.setItem(k,String(Date.now()))}else{off=1;if(s)s.removeItem(k)}}
else if(s){var v=+s.getItem(k);if(v){if(Date.now()-v<12096e5)on=1;else s.removeItem(k)}}}catch(e){}
try{if(!on&&!off){var c=navigator.connection||{};
if((navigator.hardwareConcurrency||8)<=2||(navigator.deviceMemory||8)<=2||c.saveData)on=1}}catch(e){}
if(on)d.setAttribute("data-lite","1")})();`;
