// Official rule text from the user's own rulebook PDFs. Nothing here contains rule text: the PDFs are parsed on the device.
// Pipeline: pdf.js text items -> layout lines (indentation kept) -> blocks per clause (e.g. '18.2(a)(1)'),
// checked against the bundled clause-id list (ruletext-ids.json). A PDF that does not match exactly is rejected.
import type { Lang } from './i18n';
import ids from './ruletext-ids.json' with { type: 'json' };
import defsRaw from './defs.json' with { type: 'json' };

interface Item { str: string; transform: number[]; width: number }
export interface LangText { file: string; titles: Record<string, string>; blocks: string[] }
const DEFS = defsRaw as unknown as Record<Lang, string>[];
export const SKELETON = ids as { blocks: [string, number][]; titles: string[]; untitled: string[]; lists: string[] };

// One page of pdf.js items -> text lines, like `pdftotext -layout`: indentation in character columns,
// a wide gap becomes at least two spaces ('18   MARK-ROOM'), explicit space items become one space.
export function pageLines(all: Item[]): string[] {
  const items = all.filter(i => typeof i.str === 'string' && i.str), ink = items.filter(i => i.str.trim());
  if (!ink.length) return [];
  const minX = Math.min(...ink.map(i => i.transform[4]));
  const sizes = ink.map(i => Math.round(Math.hypot(i.transform[0], i.transform[1]))).sort((a, b) => a - b);
  const cw = sizes[sizes.length >> 1] * 0.5;
  const rows: { y: number; its: Item[] }[] = [];
  for (const it of items) {
    const y = it.transform[5];
    let r = rows.find(r => Math.abs(r.y - y) < 2);
    if (!r) rows.push(r = { y, its: [] });
    r.its.push(it);
  }
  return rows.sort((a, b) => b.y - a.y).map(r => {
    let s = '', end = minX;
    for (const it of r.its.sort((a, b) => a.transform[4] - b.transform[4])) {
      const x = it.transform[4], col = Math.round((x - minX) / cw);
      if (!it.str.trim()) { if (s && !s.endsWith(' ')) s += ' '; continue; }
      if (!s.trim()) s = ' '.repeat(col);
      else if (x - end > cw) s += ' '.repeat(Math.max(2, col - s.length));
      s += it.str; end = x + it.width;
    }
    // pdf.js drops the soft hyphen in the Swedish 44.2 title (pdftotext keeps it); U+F0B7 is the Symbol-font bullet (FI 6.1).
    return s.replace(/\u00ad/g, '-').replace(/\uf0b7/g, '●').replace('Ensv\u00e4ngs och', 'Ensv\u00e4ngs- och').trimEnd();
  });
}

// rules: single rules outside Part 2, from their heading line up to the next rule.
const CFG: Record<Lang, { defs: [RegExp, RegExp]; part: [RegExp, RegExp]; rules: [RegExp, RegExp][]; furniture: RegExp; see: string[]; section: RegExp }> = {
  en: { defs: [/^DEFINITIONS$/, /BASIC PRINCIPLES/], part: [/^\s*PART 2$/, /^\s*PART 3$/], rules: [[/^1\s+SAFETY$/, /^\s*PART 2$/], [/^43\s+EXONERATION$/, /^45\s+HAULING/]],
    furniture: /^\s*(DEFINITIONS|Part \d\s+[A-Z ,;]+|\d+)\s*$/, see: ['Overlap', 'Windward'], section: /^\s*SECTION ([A-D])$/ },
  fi: { defs: [/^MÄÄRITELMÄT$/, /PERUSPERIAATTEET/], part: [/^OSA 2$/, /^Osa 3\s+KILPAILUN/], rules: [[/^1\s+TURVALLISUUS$/, /^OSA 2$/], [/^43\s+VAPAUTTAMINEN$/, /^45\s+VEDESTÄ/]],
    furniture: /^\s*(MÄÄRITELMÄT|Osa \d\s+[A-ZÄÖÅ ,;]+|\d+)\s*$/, see: ['Peittää', 'Tuulen puoli'], section: /^\s*RYHMÄ ([A-D])$/ },
  sv: { defs: [/^DEFINITIONER$/, /^GRUNDLÄGGANDE PRINCIPER/], part: [/^DEL 2 – NÄR BÅTAR MÖTS$/, /^DEL 3 – GENOMFÖRA/], rules: [[/^1\s+SÄKERHET$/, /^DEL 2 – NÄR BÅTAR MÖTS$/], [/^43\s+FRIKÄNNANDE$/, /^45\s+TA BÅT/]],
    furniture: /^\s*(DEFINITIONER|\s*DEL \d – [A-ZÄÖÅ ,;]+|\d+)\s*$/, see: ['Överlapp'], section: /^\s*AVDELNING ([A-D]) – (.+)$/ },
};
const ITEM = /^(\s*)(?:\(([a-z])\)|([a-z])\))\s+(.*)$/, SUB = /^(\s*)(?:\((\d)\)|(\d)\))\s+(.*)$/, CLAUSE = /^(\s*)(\d+(?:\.\d+)?)\s{2,}(\S.*)$/;
const letter = (c: string | undefined) => !!c && /\p{L}/u.test(c);
const isUpper = (s: string) => s === s.toUpperCase() && s !== s.toLowerCase();
const indent = (l: string) => l.length - l.trimStart().length;
const flex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+');

export const detectLang = (lines: string[]): Lang | null =>
  (['en', 'fi', 'sv'] as Lang[]).find(l => lines.some(x => CFG[l].part[0].test(x)) && lines.some(x => CFG[l].defs[0].test(x))) ?? null;

function cut(ls: string[], [start, end]: [RegExp, RegExp]): string[] {
  const s = ls.findIndex(l => start.test(l));
  if (s < 0) return [];
  const e = ls.findIndex((l, i) => i > s && end.test(l));
  return ls.slice(s + 1, e < 0 ? undefined : e);
}

// Finnish and Swedish line-end hyphens are hyphenation and are dropped; English ones are compound hyphens ('mark-room').
function join(parts: string[], lang: Lang): string {
  let out = '';
  for (const raw of parts) {
    const p = raw.trim();
    if (out.endsWith('-') && letter(out[out.length - 2]) && letter(p[0])) out = (lang === 'en' ? out : out.slice(0, -1)) + p;
    else out += (out ? ' ' : '') + p;
  }
  return out.replace(/\s+/g, ' ').replace(/ ([,.;:)])/g, '$1').trim();
}

type Block = [string, number, string];
// Open blocks are tracked as (marker column, id, depth); a continuation line belongs to the deepest block it is indented under.
function blocks(lines: string[], lang: Lang, baseId: string, firstCol = -1): Block[] {
  const lists = new Set(SKELETON.lists);
  const out: [string, number, string[]][] = [[baseId, 0, []]];
  const stack: [number, string, number][] = [[firstCol, baseId, 0]];
  for (const l of lines) {
    if (!l.trim() || CFG[lang].furniture.test(l)) continue;
    const col = indent(l), m = lists.has(baseId) ? null : ITEM.exec(l) ?? SUB.exec(l); // 6.1: bullets in EN, a)-e) in SV
    if (m) {
      const d = ITEM.test(l) ? 1 : 2;
      while (stack.length > d) stack.pop();
      const id = `${d === 2 ? stack[stack.length - 1][1] : baseId}(${m[2] ?? m[3]})`;
      stack.push([col, id, d]); out.push([id, d, [m[4]]]); continue;
    }
    while (stack.length > 1 && stack[stack.length - 1][0] >= col) stack.pop();
    const [, id, d] = stack[stack.length - 1];
    if (out[out.length - 1][0] !== id) out.push([id, d, []]);
    out[out.length - 1][2].push(l);
  }
  return out.filter(b => b[2].length).map(([i, d, p]) => [i, d, join(p, lang)]);
}

function definitions(all: string[], lang: Lang): Record<string, Block[]> {
  const ls = cut(all, CFG[lang].defs);
  const key = (n: string) => n.split(/[;,]/)[0]; // 'Klar akter om och klar för om; överlapp' vs ', överlapp' in the text
  const heads = [...DEFS.map(d => [d[lang], d.en] as const), ...CFG[lang].see.map(s => [s, ''] as const)].sort((a, b) => key(b[0]).length - key(a[0]).length);
  const res: Record<string, Block[]> = {};
  let cur = '', body: string[] = [];
  const flush = () => { if (cur) res[cur] = blocks(body, lang, 'def:' + cur); };
  for (let i = 0; i < ls.length; i++) {
    const l = ls[i];
    let h: readonly [string, string] | undefined, rest = '';
    if (lang === 'fi') { // Finnish headings always carry '(sv, en)'; body lines may start with a term ('Tila veneelle')
      h = heads.find(([n]) => new RegExp(`^${flex(n)}\\s+\\(`).test(l));
      if (h) {
        rest = l.slice(new RegExp(`^${flex(h[0])}`).exec(l)![0].length).trimStart();
        while (!rest.includes(')') && i + 1 < ls.length) { rest += ' ' + ls[i + 1]; ls[i + 1] = ''; }
        rest = rest.slice(rest.indexOf(')') + 1);
      }
    } else if (lang === 'sv') { // Swedish headings stand alone on their line ('Plats' vs body line 'Plats är ...')
      const t = l.trim().replace(/\s+/g, ' ').replace(/;/g, ',');
      h = heads.find(([n]) => t === n.replace(/;/g, ','));
    } else {
      h = heads.find(([n]) => new RegExp(`^${flex(key(n))}(?!\\p{L})`, 'u').test(l));
      if (h) rest = l.slice((new RegExp(`^${flex(h[0])}`).exec(l) ?? new RegExp(`^${flex(key(h[0]))}`).exec(l))![0].length);
    }
    if (h) { flush(); cur = h[1]; body = rest.trim() ? [rest.trim()] : []; continue; }
    if (cur) body.push(l);
  }
  flush();
  return res;
}

function rules(all: string[], lang: Lang): { titles: Record<string, string>; blocks: Block[] } {
  const titles: Record<string, string> = {};
  const part = clauses(cut(all, CFG[lang].part), lang, titles, 'P2');
  const extra = CFG[lang].rules.flatMap(([start, end]) => {
    const s = all.findIndex(l => start.test(l)), e = all.findIndex((l, i) => i > s && end.test(l));
    return s < 0 ? [] : clauses(all.slice(s, e < 0 ? undefined : e), lang, titles, '');
  });
  return { titles, blocks: [...part, ...extra] };
}

function clauses(ls: string[], lang: Lang, titles: Record<string, string>, first: string): Block[] {
  const cfg = CFG[lang], untitled = new Set(SKELETON.untitled), chunks: [string, string[], number][] = [];
  let cur: [string, string[], number] = [first, [], -1];
  let titleNext: string | null = lang === 'sv' || !first ? null : first;
  if (lang === 'sv' && first) titles[first] = 'NÄR BÅTAR MÖTS'; // the Swedish part title shares the line with 'DEL 2 –'
  for (let i = 0; i < ls.length; i++) {
    const l = ls[i], sm = cfg.section.exec(l), cm = CLAUSE.exec(l);
    if (sm) {
      chunks.push(cur); cur = ['2' + sm[1], [], -1];
      if (lang === 'sv') titles[cur[0]] = sm[2].trim().replace(/\s+/g, ' '); else titleNext = cur[0];
    } else if (titleNext && l.trim() && !cfg.furniture.test(l)) {
      titles[titleNext] = l.trim().replace(/\s+/g, ' '); titleNext = null;
    } else if (cm && !ITEM.test(l)) {
      chunks.push(cur); cur = [cm[2], [], cm[1].length];
      let t = cm[3].trim();
      if (ITEM.test(' ' + t)) { cur[1].push(' '.repeat(l.indexOf(cm[3])) + cm[3]); continue; } // '43.1  (a) ...': no title, item on the same line
      while (!cur[0].includes('.') && i + 1 < ls.length && isUpper(ls[i + 1].trim()) && !CLAUSE.test(ls[i + 1]) && !cfg.section.test(ls[i + 1])) t += ' ' + ls[++i].trim(); // multi-line rule titles
      if (untitled.has(cur[0])) cur[1].push(cm[1] + ' '.repeat(cm[2].length + 2) + t); // e.g. 16.1: the heading line is body text
      else titles[cur[0]] = t.replace(/\s+/g, ' ');
    } else cur[1].push(l);
  }
  chunks.push(cur);
  return chunks.flatMap(c => blocks(c[1], lang, c[0], c[2]));
}

// Parses one rulebook and checks it block by block against the clause-id list. Returns null with a reason on mismatch.
export function parseBook(lines: string[], lang: Lang, file: string): { text: LangText } | { error: string } {
  const p = rules(lines, lang), d = definitions(lines, lang);
  const got: Block[] = [...p.blocks, ...DEFS.flatMap(x => d[x.en] ?? [])];
  const want = SKELETON.blocks;
  const bad = want.findIndex(([id, dd], i) => got[i]?.[0] !== id || got[i][1] !== dd);
  if (bad >= 0 || got.length !== want.length) return { error: `${want[bad]?.[0] ?? got[want.length]?.[0]}` };
  const missing = SKELETON.titles.find(k => !p.titles[k]);
  if (missing) return { error: missing };
  return { text: { file, titles: Object.fromEntries(SKELETON.titles.map(k => [k, p.titles[k]])), blocks: got.map(b => b[2]) } };
}

// Browser/Node entry: pdf.js is passed in so the app can load it lazily and Node tests can use the legacy build.
export async function readPdf(pdfjs: { getDocument: (o: object) => { promise: Promise<any>; destroy: () => Promise<void> } }, data: Uint8Array): Promise<string[]> {
  const task = pdfjs.getDocument({ data, verbosity: 0 }), doc = await task.promise;
  const lines: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) lines.push(...pageLines((await (await doc.getPage(p)).getTextContent()).items), '');
  await task.destroy();
  return lines;
}

// For extending the scope: parse without the clause-id check (used by a local dump, not by the app).
export const parseRaw = (lines: string[], lang: Lang) => ({ ...rules(lines, lang), defs: definitions(lines, lang) });
