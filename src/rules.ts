import rulesRaw from './rules.json';
import defsRaw from './defs.json';
import { LANGS, Lang, T, esc, APPX } from './i18n';
import { Scene, sceneSvg } from './diagrams';
import { State, pickNext, TextStore } from './store';
import { SKELETON } from './ruletext';
import { signalsFor, signalQuestions } from './flags';
import { N, B, Node as TNode, ttx } from './tree';

// sv is optional: until it is written, the English text is shown.
type ML = Partial<Record<Lang, string>> & { fi: string; en: string };
interface Opt { t: ML; ok?: boolean; img?: (l: Lang) => string }
interface Question { id: string; prompt: ML; scene?: Scene; img?: (l: Lang) => string; options: Opt[]; why: ML; source: string; also?: string[] }
interface Scenario { case: number; title: ML; text: ML; answer: ML; also?: string[]; source: string }
interface Rule {
  n: number | string; section: string; covers?: string[]; title: Record<Lang, string>; explain: ML; note: ML; source: string; scene?: Scene; caption?: ML;
  defs: string[]; links: { rules: string[]; note: ML }[]; scenarios: Scenario[]; questions: Question[];
}
export const questionIds = () => all.map(q => q.id);
export const rules = rulesRaw as unknown as Rule[];
const defNames = defsRaw as unknown as Record<string, string>[];
const tx = (m: ML, l: Lang) => m[l] ?? m.en;
// Shown only where the text has no version in this language (Swedish is still partial).
const fb = (l: Lang, m: ML) => T.fallback[l] && !m[l] ? `<p class="mute">${T.fallback[l]}</p>` : '';
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
    const h = bb !== prevBase && bb !== skipHead && !bb.startsWith('def:') && /\.|^G\d$/.test(bb) ? `<p class="ot-h">${esc(`${bb} ${lt.titles[bb] ?? ''}`.trim())}</p>` : '';
    seen.add(id); prevBase = bb;
    if (lt.blocks[i].includes('\n')) return `${h}<pre class="ot tbl">${esc(lt.blocks[i])}</pre>`; // table (26)
    return `${h}<p class="ot d${d}">${lab ? (tl === 'sv' ? `${lab}) ` : `(${lab}) `) : ''}${esc(lt.blocks[i])}</p>`;
  }).join('');
  if (!body) return '';
  return `<details class="official"><summary>${T.official[l]}${tl !== l ? ` (${tl.toUpperCase()})` : ''}</summary>${body}<p class="mute">${esc(lt.file)}</p></details>`;
}
const mine = (r: Rule) => (b: string) => { const n = String(r.n); return b === n || (r.covers ? r.covers.includes(b) : b.startsWith(n + '.')); };

const rowOf = (l: Lang) => (r: Rule) => `<div class="item" tabindex="0" data-rule="${r.n}"><div class="t">${r.n} ${esc(r.title[l])}</div>
    <div class="s">${LANGS.filter(x => x !== l).map(x => esc(r.title[x])).join(' · ')}</div></div>`;
export function rulesView(l: Lang, txt: TextStore = {}): string {
  const row = rowOf(l);
  const groups = [...new Set(rules.map(r => r.section))].filter(g => !isAppx(g));
  const grp = (g: string) => `${g.length > 1 ? `<h3>${T['group' + g][l]}</h3>` : ''}${official(txt, l, b => b === g || b.length === 2 && b[0] === g && /[A-Z]/.test(b[1]))}<div class="list">${rules.filter(r => r.section === g).map(row).join('')}</div>`;
  return `<p><button class="btn" data-nav="tree">${T.treeTitle[l]} →</button></p>` + [...new Set(groups.map(g => g[0]))].map(p => {
    const ns = rules.filter(r => r.section[0] === p).map(r => r.n);
    return `<details class="part" data-part="${p}"${openParts.has(p) ? ' open' : ''}><summary>${T['group' + p][l]} <span class="mute">${ns[0]}–${ns[ns.length - 1]}</span></summary>${p === '2' ? official(txt, l, b => b === 'pt2') : ''}${groups.filter(g => g[0] === p).map(grp).join('')}</details>`;
  }).join('');
}
// Parts the user has opened stay open across re-renders (main.ts toggle listener).
export const openParts = new Set<string>();

const isAppx = (g: string) => /^[A-Z]$/.test(g);
// Appendices tab: every appendix of the book; those with pages list them, the rest are marked not yet covered.
export function appxView(l: Lang, txt: TextStore = {}): string {
  return `<p class="mute">${T.appxIntro[l]}</p>` + APPX.map(([k, title]) => {
    const pages = rules.filter(r => r.section === k), summary = `<summary>${T.appendix[l]} ${k} · ${esc(title[l])}</summary>`;
    const body = pages.length ? `${official(txt, l, b => b === k)}<div class="list">${pages.map(rowOf(l)).join('')}</div>` : `<p class="mute soonrow">${T.notYet[l]}</p>`;
    return `<details class="part" data-part="${k}"${openParts.has(k) ? ' open' : ''}>${summary}${body}</details>`;
  }).join('');
}

export function ruleView(r: Rule, l: Lang, txt: TextStore = {}): string {
  const defs = r.defs.map(k => `<span data-open="${esc(k)}">${esc(defNames.find(d => d.en === k)?.[l] ?? k)}</span>`).join('');
  const links = r.links.map(k => `<div class="chips">${chips(k.rules, l)}</div><p>${esc(tx(k.note, l))}</p>`).join('');
  const scen = r.scenarios.map(s => `<div class="sc"><div class="chips"><span>Case ${s.case}</span>${chips(s.also ?? [], l)}</div>
    <h4>${esc(tx(s.title, l))}</h4><p>${esc(tx(s.text, l))}</p><p><b>${T.outcome[l]}.</b> ${esc(tx(s.answer, l))}</p></div>`).join('');
  return `<button class="btn" data-nav="${isAppx(r.section) ? 'appx' : 'rules'}">${T.back[l]}</button><h2>${r.n} ${esc(r.title[l])}</h2>${fb(l, r.explain)}${official(txt, l, mine(r), String(r.n))}${signalsFor(String(r.n), l)}
  <h3>${T.explain[l]}</h3><p>${esc(tx(r.explain, l))}</p><p class="mute">${T.source[l]}: ${esc(r.source)}</p>
  ${r.scene && r.caption ? `<div class="fig">${sceneSvg(r.scene, tx(r.caption, l))}<p class="mute">${T.wind[l]}</p><p>${esc(tx(r.caption, l))}</p></div>` : ''}<p class="mute">${esc(tx(r.note, l))}</p>
  <h3>${T.related[l]}</h3><div class="chips">${defs}</div><h3>${T.links[l]}</h3>${links}
  ${scen ? `<h3>${T.scenarios[l]}</h3>${scen}` : ""}<p><button class="btn" data-nav="practice">${T.tabPractice[l]}</button></p>`;
}

const all: Question[] = [...rules.flatMap(r => r.questions), ...signalQuestions()];
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
  const buttons = opts.map((o, i) => `<button class="btn opt${picked >= 0 ? (o.ok ? ' ok' : i === picked ? ' bad' : '') : ''}" data-ans="${i}"${picked >= 0 ? ' disabled' : ''}>${o.img ? o.img(l) : esc(tx(o.t, l))}</button>`).join('');
  const res = picked < 0 ? '' : `<p class="st">${opts[picked].ok ? T.correct[l] : T.wrong[l]}</p><p>${esc(tx(q.why, l))}</p>
    <p class="mute">${T.source[l]}: ${esc(q.source)}</p><div class="chips">${chips(q.also ?? [], l)}</div><p><button class="btn" data-next="1">${T.next[l]}</button></p>`;
  return `${fb(l, q.prompt)}<p class="mute">${T.mastered[l]}: ${done}/${all.length}</p>${q.scene ? `<div class="fig">${sceneSvg(q.scene, tx(q.prompt, l))}<p class="mute">${T.wind[l]}</p></div>` : ''}${q.img ? `<div class="sigq">${q.img(l)}</div>` : ''}<p>${esc(tx(q.prompt, l))}</p>${buttons}${res}<p class="tools"><button class="btn" data-export="1">${T.export[l]}</button> <button class="btn" data-import="1">${T.import[l]}</button><input type="file" id="imp" accept=".json,application/json" hidden></p><p class="mute" id="impmsg"></p>`;
}

// "Who keeps clear?" decision tree; path = chosen option per step.
let path: number[] = [];
export const treeAnswer = (i: number) => { path.push(i); };
export const treeBack = (k: number) => { path = path.slice(0, k); };
export const treeReset = () => { path = []; };
const tchips = (rs: string[]) => `<div class="chips">${rs.map(r => `<span data-rule="${r === '18.3' || r === '18.4' ? r : r.split('.')[0]}">${r}</span>`).join('')}</div>`;

export function treeView(l: Lang): string {
  let id: string | undefined = 'start';
  const steps: string[] = [], found: string[] = [];
  for (const [k, i] of path.entries()) {
    const n: TNode = N[id!], o = n.opts[i];
    steps.push(`<li><button class="lnk" data-tback="${k}">${esc(ttx(n.q, l))}</button> <b>${esc(ttx(o.a, l))}</b></li>`);
    if (o.f) found.push(`<div class="sc"><p>${esc(ttx(o.f.t, l))}</p>${tchips(o.f.rules)}</div>`);
    id = o.next;
  }
  const cur = id ? N[id] : null;
  if (!cur && path[0] === 0) found.push(`<div class="sc"><p>${esc(ttx(B.t, l))}</p>${tchips(B.rules)}</div>`);
  return `<button class="btn" data-nav="rules">${T.back[l]}</button><h2>${T.treeTitle[l]}</h2><p class="mute">${T.treeIntro[l]}</p>
    ${steps.length ? `<ol class="steps">${steps.join('')}</ol>` : ''}
    ${cur ? `<p class="st">${esc(ttx(cur.q, l))}</p>${cur.opts.map((o, i) => `<button class="btn opt" data-tans="${i}">${esc(ttx(o.a, l))}</button>`).join('')}` : ''}
    ${found.length ? `<h3>${T.treeFound[l]}</h3>${found.join('')}` : ''}
    ${path.length ? `<p><button class="btn" data-treset="1">${T.treeReset[l]}</button></p>` : ''}`;
}
