/** Funções puras de ordenação (sem server-only): usadas pela UI otimista e pelos testes. */

/** Move o item de `index` por `delta` posições; devolve a mesma lista se for inválido. */
export function moveItem<T>(list: readonly T[], index: number, delta: number): T[] {
  const target = index + delta;
  if (index < 0 || index >= list.length || target < 0 || target >= list.length || delta === 0) {
    return [...list];
  }
  const next = [...list];
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item as T);
  return next;
}

/** Próxima posição ao anexar no fim (posições existentes podem ter lacunas após exclusões). */
export function nextPosition(positions: readonly number[]): number {
  return positions.length === 0 ? 0 : Math.max(...positions) + 1;
}
