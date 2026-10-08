import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => cleanup());

// jsdom não implementa <dialog>.showModal()/close(): polyfill mínimo que imita
// o essencial (atributo `open`, evento `cancel` na tecla Esc e evento `close`).
if (typeof HTMLDialogElement !== 'undefined') {
  const proto = HTMLDialogElement.prototype;
  proto.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  proto.show = function show(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  proto.close = function close(this: HTMLDialogElement, returnValue?: string) {
    if (!this.hasAttribute('open')) return;
    this.removeAttribute('open');
    if (returnValue !== undefined) this.returnValue = returnValue;
    this.dispatchEvent(new Event('close'));
  };
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const open = document.querySelector<HTMLDialogElement>('dialog[open]');
    if (!open) return;
    const cancel = new Event('cancel', { cancelable: true });
    open.dispatchEvent(cancel);
    if (!cancel.defaultPrevented) open.close();
  });
}
