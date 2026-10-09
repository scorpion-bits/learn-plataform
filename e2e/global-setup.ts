import { createAbacatePayMock } from './mocks/abacatepay';
import { loadE2eEnv } from './support/env';

/**
 * Sobe o mock da AbacatePay antes dos testes e o derruba no fim. O app (webServer ou
 * `npm start` do CI) aponta para ele com `ABACATEPAY_API_BASE_URL`; os testes o "pagam"
 * por HTTP (`simulate-payment`), então não precisam compartilhar memória com este processo.
 */
export default async function globalSetup(): Promise<() => Promise<void>> {
  const env = loadE2eEnv();
  const mock = createAbacatePayMock();
  const { baseUrl } = await mock.start(env.mockPort);
  console.log(`[e2e] mock da AbacatePay em ${baseUrl}`);
  return () => mock.stop();
}
