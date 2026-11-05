import rulesRaw from './rules.json';
import defsRaw from './defs.json';
import { LANGS, Lang, T, esc } from './i18n';
import { Scene, sceneSvg } from './diagrams';
import { State, pickNext, TextStore } from './store';
import { SKELETON } from './ruletext';

// sv is optional: until it is written, the English text is shown.
type ML = Partial<Record<Lang, string>> & { fi: string; en: string };
interface Opt { t: ML; ok?: boolean }
interface Question { id: string; prompt: ML; scene?: Scene; options: Opt[]; why: ML; source: string; also?: string[] }
interface Scenario { case: number; title: ML; text: ML; answer: ML; also?: string[]; source: string }
interface Rule {
  n: number | string; section: string; covers?: string[]; title: Record<Lang, string>; explain: ML; note: ML; source: string; scene?: Scene; caption?: ML;
  defs: string[]; links: { rules: string[]; note: ML }[]; scenarios: Scenario[]; questions: Question[];
}
export const questionIds = () => all.map(q => q.id);
export const rules = rulesRaw as unknown as Rule[];
const defNames = defsRaw as unknown as Record<string, string>[];
const tx = (m: ML, l: Lang) => m[l] ?? m.en;
const fb = (l: Lang) => T.fallback[l] ? `<p class="mute">${T.fallback[l]}</p>` : '';
// Page for a rule reference: exact page ('18.3') first, else the parent page ('18.2' -> '18') if it covers that part.
const page = (r: string) => rules.find(x => String(x.n) === r)
  ?? rules.find(x => String(x.n) === r.split('.')[0] && (!x.covers || x.covers.some(c => r.startsWith(c))));
// Rules with content become links; the others are grouped into one dashed "not yet covered" chip.
const chips = (rs: string[], l: Lang) => {
  const no = rs.filter(r => !page(r));
  return rs.filter(r => page(r)).map(r => `<span data-rule="${page(r)!.n}">${T.rule[l]} ${r}</span>`).join('')
    + (no.length ? `<span class="soon">${no.length > 1 ? T.tabRules[l] : T.rule[l]} ${no.join(', ')} · ${T.notYet[l]}</span>` : '');
};

// Official text blocks, e.g. '18.2(a)(1)'; base = clause without item letters. Headings are shown when the clause changes.
// Falls back to another imported language (marked) when the current one has not been imported.
const base = (id: string) => id.split('(')[0];
export function official(txt: TextStore, l: Lang, keep: (base: string) => boolean, skipHead = ''): string {
  const tl = txt[l] ? l : (['en', 'fi', 'sv'] as Lang[]).find(x => txt[x]);
  if (!tl) return '';
  const lt = txt[tl]!, seen = new Set<string>();
  let prevBase = '';
  const body = SKELETON.blocks.map(([id, d], i) => {
    const bb = base(id);
    if (!keep(bb)) return '';
    const lab = !seen.has(id) && d ? id.match(/\(([^)]+)\)$/)![1] : '';
    const h = bb !== prevBase && bb !== skipHead && !bb.startsWith('def:') && /\./.test(bb) ? `<p class="ot-h">${esc(`${bb} ${lt.titles[bb] ?? ''}`.trim())}</p>` : '';
    seen.add(id); prevBase = bb;
    return `${h}<p class="ot d${d}">${lab ? (tl === 'sv' ? `${lab}) ` : `(${lab}) `) : ''}${esc(lt.blocks[i])}</p>`;
  }).join('');
  if (!body) return '';
  return `<details class="official"><summary>${T.official[l]}${tl !== l ? ` (${tl.toUpperCase()})` : ''}</summary>${body}<p class="mute">${esc(lt.file)}</p></details>`;
}
const mine = (r: Rule) => (b: string) => { const n = String(r.n); return b === n || (r.covers ? r.covers.includes(b) : b.startsWith(n + '.')); };

export function rulesView(l: Lang, txt: TextStore = {}): string {
  const row = (r: Rule) => `<div class="item" tabindex="0" data-rule="${r.n}"><div class="t">${r.n} ${esc(r.title[l])}</div>
    <div class="s">${LANGS.filter(x => x !== l).map(x => esc(r.title[x])).join(' · ')}</div></div>`;
  const groups = [...new Set(rules.map(r => r.section))];
  return groups.map(g => `${g === '2A' ? official(txt, l, b => b === 'P2') : ''}<h3>${T['group' + g][l]}</h3>${official(txt, l, b => b === g)}<div class="list">${rules.filter(r => r.section === g).map(row).join('')}</div>`).join('')
    + `<p class="mute">${T.moreRules[l]}</p>`;
}

export function ruleView(r: Rule, l: Lang, txt: TextStore = {}): string {
  const defs = r.defs.map(k => `<span data-open="${esc(k)}">${esc(defNames.find(d => d.en === k)?.[l] ?? k)}</span>`).join('');
  const links = r.links.map(k => `<div class="chips">${chips(k.rules, l)}</div><p>${esc(tx(k.note, l))}</p>`).join('');
  const scen = r.scenarios.map(s => `<div class="sc"><div class="chips"><span>Case ${s.case}</span>${chips(s.also ?? [], l)}</div>
    <h4>${esc(tx(s.title, l))}</h4><p>${esc(tx(s.text, l))}</p><p><b>${T.outcome[l]}.</b> ${esc(tx(s.answer, l))}</p></div>`).join('');
  return `<button class="btn" data-nav="rules">${T.back[l]}</button><h2>${r.n} ${esc(r.title[l])}</h2>${fb(l)}${official(txt, l, mine(r), String(r.n))}
  <h3>${T.explain[l]}</h3><p>${esc(tx(r.explain, l))}</p><p class="mute">${T.source[l]}: ${esc(r.source)}</p>
  ${r.scene && r.caption ? `<div class="fig">${sceneSvg(r.scene, tx(r.caption, l))}<p class="mute">${T.wind[l]}</p><p>${esc(tx(r.caption, l))}</p></div>` : ''}<p class="mute">${esc(tx(r.note, l))}</p>
  <h3>${T.related[l]}</h3><div class="chips">${defs}</div><h3>${T.links[l]}</h3>${links}
  ${scen ? `<h3>${T.scenarios[l]}</h3>${scen}` : ""}<p><button class="btn" data-nav="practice">${T.tabPractice[l]}</button></p>`;
}

const all = rules.flatMap(r => r.questions);
let cur: Question | null = null, opts: Opt[] = [], picked = -1;
const shuffle = <A,>(a: A[]) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
export function practiceNext(s: State) {
  const id = pickNext(all.map(q => q.id), s.box, cur?.id ?? null);
  cur = all.find(q => q.id === id)!;
  opts = shuffle(cur.options); picked = -1;
}
export function practiceAnswer(i: number, s: State) {
  if (picked >= 0 || !cur) return;
  picked = i; s.box[cur.id] = opts[i].ok ? Math.min((s.box[cur.id] ?? 0) + 1, 2) : 0;
}
export function practiceView(s: State): string {
  const l = s.lang;
  if (!cur) practiceNext(s);
  const q = cur!, done = all.filter(x => (s.box[x.id] ?? 0) >= 2).length;
  const buttons = opts.map((o, i) => `<button class="btn opt${picked >= 0 ? (o.ok ? ' ok' : i === picked ? ' bad' : '') : ''}" data-ans="${i}"${picked >= 0 ? ' disabled' : ''}>${esc(tx(o.t, l))}</button>`).join('');
  const res = picked < 0 ? '' : `<p class="st">${opts[picked].ok ? T.correct[l] : T.wrong[l]}</p><p>${esc(tx(q.why, l))}</p>
    <p class="mute">${T.source[l]}: ${esc(q.source)}</p><div class="chips">${chips(q.also ?? [], l)}</div><p><button class="btn" data-next="1">${T.next[l]}</button></p>`;
  return `${fb(l)}<p class="mute">${T.mastered[l]}: ${done}/${all.length}</p>${q.scene ? `<div class="fig">${sceneSvg(q.scene, tx(q.prompt, l))}<p class="mute">${T.wind[l]}</p></div>` : ''}<p>${esc(tx(q.prompt, l))}</p>${buttons}${res}<p class="tools"><button class="btn" data-export="1">${T.export[l]}</button> <button class="btn" data-import="1">${T.import[l]}</button><input type="file" id="imp" accept=".json,application/json" hidden></p><p class="mute" id="impmsg"></p>`;
}
