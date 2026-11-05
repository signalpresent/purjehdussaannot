import type { Lang } from './i18n';
const K = 'sailrules.v1';
// box: question id -> Leitner box 0..2 (2 = mastered)
interface State { lang: Lang; box: Record<string, number> }
const def: State = { lang: 'fi', box: {} };
export function load(): State {
  try { return { ...def, ...JSON.parse(localStorage.getItem(K) || '{}') }; } catch { return { ...def }; }
}
export function save(s: State) { try { localStorage.setItem(K, JSON.stringify(s)); } catch { /* ignore */ } }
// Next question: lowest box first, random among ties, never the one just asked (unless it is the only one).
export function pickNext(ids: string[], box: Record<string, number>, last: string | null, rnd: () => number = Math.random): string {
  const pool = ids.length > 1 ? ids.filter(i => i !== last) : ids;
  const low = Math.min(...pool.map(i => box[i] ?? 0));
  const c = pool.filter(i => (box[i] ?? 0) === low);
  return c[Math.floor(rnd() * c.length)];
}
export type { State };
