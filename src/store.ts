import type { Lang } from './i18n';
import type { LangText } from './ruletext';
import ids from './ruletext-ids.json' with { type: 'json' };
const K = 'sailrules.v1';
// box: question id -> Leitner box 0..2 (2 = mastered)
// filter: '' (or unset) = all questions; a rule-group digit ('1'..'7'), an appendix letter, or 'signals'.
interface State { lang: Lang; box: Record<string, number>; filter?: string }
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
// Progress file: only the Leitner boxes, versioned. Import keeps known question ids and clamps to 0..2.
export const exportBox = (s: State) => JSON.stringify({ app: 'sailrules', v: 1, box: s.box }, null, 1);
export function importBox(text: string, ids: string[]): Record<string, number> | null {
  try {
    const d = JSON.parse(text);
    if (d?.app !== 'sailrules' || d.v !== 1 || typeof d.box !== 'object' || !d.box) return null;
    const out: Record<string, number> = {};
    for (const id of ids) { const n = d.box[id]; if (Number.isInteger(n)) out[id] = Math.min(Math.max(n, 0), 2); }
    return out;
  } catch { return null; }
}
export type { State };
// Official rule text per language, parsed on the device from the user's own PDFs (src/ruletext.ts).
// A language whose clause-id list differs from the app's (after an app update) is dropped and must be re-imported.
export type TextStore = Partial<Record<Lang, LangText & { sig: string }>>;
const TK = 'sailrules.text.v2';
export const textSig = () => (ids.blocks as [string, number][]).map(b => b[0]).join('|');
// stale: languages imported before the app's clause list changed (they must be imported again).
export function loadText(): { text: TextStore; stale: boolean } {
  try {
    const d = JSON.parse(localStorage.getItem(TK) || '{}') as TextStore, sig = textSig();
    const ok = Object.entries(d).filter(([, v]) => v?.sig === sig);
    return { text: Object.fromEntries(ok), stale: ok.length < Object.keys(d).length };
  } catch { return { text: {}, stale: false }; }
}
export function saveText(t: TextStore): boolean { try { localStorage.setItem(TK, JSON.stringify(t)); return true; } catch { return false; } }
