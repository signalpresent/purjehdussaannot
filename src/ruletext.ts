// Official rule text from the user's own rulebook PDFs. Nothing here contains rule text: the PDFs are parsed on the device.
// Pipeline: pdf.js text items -> layout lines (indentation kept) -> blocks per clause (e.g. '18.2(a)(1)'),
// checked against the bundled clause-id list (ruletext-ids.json). A PDF that does not match exactly is rejected.
import type { Lang } from './i18n';
import ids from './ruletext-ids.json' with { type: 'json' };
import defsRaw from './defs.json' with { type: 'json' };

interface Item { str: string; transform: number[]; width: number }
export interface LangText { file: string; titles: Record<string, string>; blocks: string[] }
const DEFS = defsRaw as unknown as Record<Lang, string>[];
export const SKELETON = ids as unknown as { blocks: [string, number][]; titles: string[]; untitled: string[]; lists: string[]; tables: string[]; hang: string[]; alias: Record<string, string> };

// One page of pdf.js items -> text lines, like `pdftotext -layout`: indentation in character columns,
// a wide gap becomes at least two spaces ('18   MARK-ROOM'), explicit space items become one space.
export function pageLines(all: Item[]): string[] {
  // FI Part 5 running header wraps to a second line ('MUUTOKSENHAKU', 13 pt; the Section D title is 20 pt) that pdf.js can put on a body row
  const items = all.filter(i => typeof i.str === 'string' && i.str && !(i.str.trim() === 'MUUTOKSENHAKU' && i.transform[0] < 14)), ink = items.filter(i => i.str.trim());
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
    return s.replace(/\u00ad/g, '-').replace(/\uf0b7/g, '●').replace('Ensv\u00e4ngs och', 'Ensv\u00e4ngs- och').replace(/S\u00d6K\s+OCH/, 'S\u00d6K- OCH').trimEnd();
  });
}

// rules: single rules outside Part 2, from their heading line up to the next rule.
// apps: one entry per appendix letter in book order (A,B,C,D,E,F,G,H,J,M,N,P,R,S,T), clause ids e.g. 'M1', 'E1.1'.
const APPX = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'M', 'N', 'P', 'R', 'S', 'T'] as const;
// Builds the [letter, start, end] triples for one language from each appendix's first-occurrence start line (a function of the letter); the last appendix (T) ends at the given marker, short of the book's back matter (ISBN block, colophon), which otherwise leaks into T4's body as T has no next appendix to stop at.
function appsFor(startOf: (l: string) => RegExp, tEnd: RegExp): [string, RegExp, RegExp | undefined][] {
  return APPX.map((l, i) => [l, startOf(l), i + 1 < APPX.length ? startOf(APPX[i + 1]) : tEnd]);
}
const CFG: Record<Lang, { defs: [RegExp, RegExp]; part: [RegExp, RegExp]; rules: [RegExp, RegExp][]; apps: [string, RegExp, RegExp | undefined][]; furniture: RegExp; see: string[]; section: RegExp }> = {
  en: { defs: [/^DEFINITIONS$/, /BASIC PRINCIPLES/], part: [/^\s*PART 2$/, /^\s*PART 3$/], rules: [[/^1\s+SAFETY$/, /^\s*PART 2$/], [/^25\s+NOTICE OF RACE/, /^\s*PART 4$/], [/^40\s+PERSONAL FLOTATION/, /^\s*PART 5$/], [/^60\s+PROTESTS$/, /^\s*PART 6$/], [/^75\s+ENTERING AN EVENT/, /^\s*PART 7$/], [/^85\s+CHANGES TO RULES$/, /^\s*APPENDIX A$/]],
    apps: appsFor(l => new RegExp(`^\\s*APPENDIX ${l}$`), /^www\.sailing\.org$/),
    furniture: /^\s*(DEFINITIONS|Part \d\s+[A-Z ,;]+|Appendix [A-Z]\s+[\p{Lu}\d ]+|\d+)\s*$/u, see: ['Overlap', 'Windward'], section: /^\s*SECTION ([A-D])$/ },
  fi: { defs: [/^MÄÄRITELMÄT$/, /PERUSPERIAATTEET/], part: [/^OSA 2$/, /^Osa 3\s+KILPAILUN/], rules: [[/^1\s+TURVALLISUUS$/, /^OSA 2$/], [/^25\s+KILPAILUKUTSU/, /^OSA 4$/], [/^40\s+HENKILÖKOHTAISET/, /^OSA 5$/], [/^60\s+PROTESTIT$/, /^OSA 6$/], [/^75\s+KILPAILUUN ILMOITTAUTUMINEN/, /^OSA 7$/], [/^85\s+MUUTOKSET SÄÄNTÖIHIN$/, /^(Liite A\s+PISTELASKU|LIITE A)$/]],
    apps: appsFor(l => new RegExp(`^LIITE ${l}$`), /^MUISTIINPANOJA$/),
    furniture: /^\s*(MÄÄRITELMÄT|Osa \d\s+[\p{Lu} ,;]+|Liite [A-Z]\s+[\p{Lu}\d ]+|LIITE [A-Z] [\p{Lu}\d \-]+|\d+|\.)\s*$/u, see: ['Peittää', 'Tuulen puoli'], section: /^\s*RYHMÄ ([A-D])$/ },
  sv: { defs: [/^DEFINITIONER$/, /^GRUNDLÄGGANDE PRINCIPER/], part: [/^DEL 2 – NÄR BÅTAR MÖTS$/, /^DEL 3 – GENOMFÖRA/], rules: [[/^1\s+SÄKERHET$/, /^DEL 2 – NÄR BÅTAR MÖTS$/], [/^25\s+INBJUDAN/, /^DEL 4 – /], [/^40\s+PERSONLIG FLYT/, /^DEL 5 – /], [/^60\s+PROTESTER$/, /^DEL 6 – /], [/^75\s+ANMÄLAN TILL TÄVLING/, /^DEL 7 – /], [/^85\s+ÄNDRING AV REGLER$/, /^APPENDIX A – /]],
    apps: [
      ['A', /^APPENDIX A – POÄNGBERÄKNING$/, /^APPENDIX B – REGLER FÖR FLEETRACING I$/],
      ['B', /^APPENDIX B – REGLER FÖR FLEETRACING I$/, /^APPENDIX C – REGLER FÖR MATCHRACING$/],
      ['C', /^APPENDIX C – REGLER FÖR MATCHRACING$/, /^APPENDIX D – REGLER FÖR$/],
      ['D', /^APPENDIX D – REGLER FÖR$/, /^APPENDIX E – REGLER FÖR RADIOSTYRDA$/],
      ['E', /^APPENDIX E – REGLER FÖR RADIOSTYRDA$/, /^APPENDIX F – REGLER FÖR KITE$/],
      ['F', /^APPENDIX F – REGLER FÖR KITE$/, /^APPENDIX G – IGENKÄNNINGSTECKEN I$/],
      ['G', /^APPENDIX G – IGENKÄNNINGSTECKEN I$/, /^APPENDIX H – VÄGNING AV KLÄDER OCH$/],
      ['H', /^APPENDIX H – VÄGNING AV KLÄDER OCH$/, /^APPENDIX J – INBJUDAN OCH$/],
      ['J', /^APPENDIX J – INBJUDAN OCH$/, /^APPENDIX M – REKOMMENDATIONER FÖR$/],
      ['M', /^APPENDIX M – REKOMMENDATIONER FÖR$/, /^APPENDIX N – INTERNATIONELLA JURYER$/],
      ['N', /^APPENDIX N – INTERNATIONELLA JURYER$/, /^APPENDIX P – SÄRSKILDA PROCEDURER$/],
      ['P', /^APPENDIX P – SÄRSKILDA PROCEDURER$/, /^APPENDIX R – PROCEDURER FÖR$/],
      ['R', /^APPENDIX R – PROCEDURER FÖR$/, /^APPENDIX S – STANDARDSEGLINGS$/],
      ['S', /^APPENDIX S – STANDARDSEGLINGS$/, /^APPENDIX T – MEDLING$/],
      ['T', /^APPENDIX T – MEDLING$/, /^ANTECKNINGAR$/],
    ],
    furniture: /^\s*(DEFINITIONER|\s*DEL \d – [\p{Lu} ,;]+(m\.m\.)?|\s*APPENDIX [A-Z] – [\p{Lu}\d ]+|\d+)\s*$/u, see: ['Överlapp'], section: /^\s*AVDELNING ([A-D]) – (.+)$/ },
};
const ITEM = /^(\s*)(?:\(([a-z])\)|([a-z])\))\s+(.*)$/, SUB = /^(\s*)(?:\((\d+)\)|(\d+)\))\s+(.*)$/, CLAUSE = /^(\s*)([A-Z]?\d+(?:\.\d+)?)\s{2,}(\S.*)$/;
const DOT = /^(\s*)(?:\((\d)\))?(\d)\.\s+(.*)$/; // group 2 never matches; keeps SUB's group layout
const GCL = /^(\s*)(G\d(?:\.\d)?)\s+(\p{Lu}.*)$/u; // Appendix G rules quoted in E8 ('G1.1 Identification')
const letter = (c: string | undefined) => !!c && /\p{L}/u.test(c);
const isUpper = (s: string) => s === s.toUpperCase() && s !== s.toLowerCase();
const indent = (l: string) => l.length - l.trimStart().length;
const flex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+');

export const detectLang = (lines: string[]): Lang | null =>
  (['en', 'fi', 'sv'] as Lang[]).find(l => lines.some(x => CFG[l].part[0].test(x)) && lines.some(x => CFG[l].defs[0].test(x))) ?? null;

function cut(ls: string[], [start, end]: [RegExp, RegExp | undefined]): string[] {
  const s = ls.findIndex(l => start.test(l));
  if (s < 0) return [];
  const e = end ? ls.findIndex((l, i) => i > s && end.test(l)) : -1;
  return ls.slice(s + 1, e < 0 ? undefined : e);
}

// Swedish words split at a line end where pdf.js and pdftotext both lose the hyphen (27 title, 32.3).
const glue = (s: string) => s.replace('KAPPSEGLINGS KOMMITTÉN', 'KAPPSEGLINGSKOMMITTÉN').replace('kappseglings kommittén', 'kappseglingskommittén').replace('SEGLINGS FÖRESKRIFTER', 'SEGLINGSFÖRESKRIFTER').replace('an- givet', 'angivet').replace('re- gel', 'regel').replace(/TERMINO-? LOGI/, 'TERMINOLOGI'); // SV: soft hyphens left mid-line in the PDF
// Finnish and Swedish line-end hyphens are hyphenation and are dropped ('sök- och' keeps it); English ones are compound hyphens ('mark-room').
function join(parts: string[], lang: Lang): string {
  let out = '';
  for (const raw of parts) {
    const p = raw.trim();
    if (out.endsWith('-') && letter(out[out.length - 2]) && letter(p[0]) && !/^(och|eller|ja|tai) /.test(p)) out = (lang === 'en' ? out : out.slice(0, -1)) + p;
    else out += (out ? ' ' : '') + p;
  }
  return glue(out.replace(/\s+/g, ' ').replace(/ ([,.;:)])/g, '$1').trim());
}

type Block = [string, number, string];
// Open blocks are tracked as (marker column, id, depth); a continuation line belongs to the deepest block it is indented under.
function blocks(lines: string[], lang: Lang, baseId: string, firstCol = -1): Block[] {
  if (SKELETON.tables.includes(baseId)) { // 26: the signal table keeps its layout (shown preformatted)
    const ls = lines.filter(l => l.trim() && !CFG[lang].furniture.test(l)), cut = Math.min(...ls.map(indent));
    return [[baseId, 0, ls.map(l => l.slice(cut)).join('\n')]];
  }
  const lists = new Set(SKELETON.lists), hang = SKELETON.hang.includes(baseId) ? 2 : 1; // hang: a closing paragraph belongs to the last (a)-level item (EN 60.3(b), 61.2(b)) even where a translation sets it at clause level
  const out: [string, number, string[]][] = [[baseId, 0, []]];
  const stack: [number, string, number][] = [[firstCol, baseId, 0]];
  let brk = false, stay = -1; // brk: a page break (header or page number) since the previous body line; stay: its shifted column
  for (const l of lines) {
    if (!l.trim()) continue;
    if (CFG[lang].furniture.test(l)) { brk = true; continue; }
    const col = indent(l), m = lists.has(baseId) ? null : ITEM.exec(l) ?? SUB.exec(l) ?? (baseId[0] === 'G' ? DOT.exec(l) : null); // 6.1: bullets in EN, a)-e) in SV; FI G1.6(b): '1.'
    const pb = brk;
    brk = false;
    if (m) {
      stay = -1;
      const d = ITEM.test(l) ? 1 : 2;
      while (stack[stack.length - 1][2] >= d) stack.pop(); // pop back to the enclosing level by its recorded depth, not by stack length: a bare numbered list directly under the clause (no lettered parent) has length 2 at depth 2 already, so a length-only check would never pop a same-depth sibling (e.g. EN E6.6(2) followed by E6.6(3), both depth 2, no (a)/(b) in between)
      const id = `${d === 2 ? stack[stack.length - 1][1] : baseId}(${m[2] ?? m[3]})`;
      stack.push([col, id, d]); out.push([id, d, [m[4]]]); continue;
    }
    const last = out[out.length - 1], prev = last[2][last[2].length - 1] ?? '.';
    const open = (pb || col === stay || /\p{L}-$/u.test(prev)) && last[0] === stack[stack.length - 1][1] && /^\p{Ll}/u.test(l.trim()) && !/[.;:]$/.test(prev);
    // a lowercase line continuing an unfinished sentence stays put, even if a page break (SV 42.3(b)) or the layout (FI 76.1(a), after a hyphenated word) shifted its indentation
    if (open) stay = col;
    while (!open && stack.length > hang && stack[stack.length - 1][0] >= col - 1) stack.pop(); // col - 1: pdf.js rounding jitter (FI 63.7(a))
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
  const alias = (b: Block): Block => SKELETON.alias[b[0]] ? [SKELETON.alias[b[0]], 0, b[2]] : b; // FI numbers 92.1-92.2 as 92(a)-(b)
  const apps = CFG[lang].apps.flatMap(([letter, start, end]) => clauses(cut(all, [start, end]), lang, titles, letter));
  return { titles, blocks: [...part, ...extra, ...apps].map(alias) };
}

function clauses(ls: string[], lang: Lang, titles: Record<string, string>, first: string): Block[] {
  const cfg = CFG[lang], untitled = new Set(SKELETON.untitled), tables = new Set(SKELETON.tables), chunks: [string, string[], number][] = [];
  const isApp = /^[A-Z]$/.test(first);
  let cur: [string, string[], number] = [first, [], -1];
  let titleNext: string | null = lang === 'sv' || !first || isApp ? null : first;
  if (isApp) while (ls.length && (!ls[0].trim() || isUpper(ls[0].trim()))) ls = ls.slice(1); // appendix title lines
  if (lang === 'sv' && first === 'P2') titles[first] = 'NÄR BÅTAR MÖTS'; // the Swedish part title shares the line with 'DEL 2 –'
  for (let i = 0; i < ls.length; i++) {
    const l = ls[i], sm = cfg.section.exec(l), cm = CLAUSE.exec(l) ?? (first === 'E' ? GCL.exec(l) : null);
    if (sm) {
      chunks.push(cur); cur = [(first === 'P2' ? '2' : +cur[0].split('.')[0] < 60 ? '4' : '5') + sm[1], [], -1]; // Section B of Part 4 -> '4B', of Part 5 -> '5B'
      if (lang === 'sv') titles[cur[0]] = (sm[2] + (/^\s*\p{Ll}+$/u.test(ls[i + 1] ?? '') ? ' ' + ls[++i] : '')).trim().replace(/\s+/g, ' '); // 'Förhandlingar och' / 'beslutsfattande'
      else titleNext = cur[0];
    } else if (titleNext && l.trim() && !cfg.furniture.test(l)) {
      titles[titleNext] = l.trim().replace(/\s+/g, ' '); titleNext = null;
    } else if (cm && !ITEM.test(l) && !(tables.has(cur[0]) && +cm[2] < +cur[0])) { // table rows ('4  P, I, Z') are not clauses
      chunks.push(cur); cur = [cm[2], [], cm[1].length];
      let t = cm[3].trim();
      if (ITEM.test(' ' + t)) { cur[1].push(' '.repeat(l.indexOf(cm[3])) + cm[3]); continue; } // '43.1  (a) ...': no title, item on the same line
      while (!cur[0].includes('.') && i + 1 < ls.length && (isUpper(ls[i + 1].trim()) || /\s(JA|AND|OCH)$|\p{L}-$/u.test(t)) && !CLAUSE.test(ls[i + 1]) && !cfg.section.test(ls[i + 1])) t += ' ' + ls[++i].trim(); // multi-line rule titles
      // a lead-in sentence before a lettered item can wrap over several lines (FI/SV R2.2); absorb up to the first item line, but only if the line right after the heading continues a still-open sentence (lowercase start) and an item is actually found before the next clause/section/page break (otherwise this is a short real title followed by an unrelated paragraph, e.g. E1.2 'Terminology' + body, or a plain paragraph left alone for 'untitled' to handle)
      if (cur[0].includes('.') && i + 1 < ls.length && /^\p{Ll}/u.test(ls[i + 1].trim())) {
        let j = i + 1;
        while (j < ls.length && !CLAUSE.test(ls[j]) && !cfg.section.test(ls[j]) && !cfg.furniture.test(ls[j]) && !ITEM.test(ls[j]) && !SUB.test(ls[j])) j++;
        if (j < ls.length && j > i + 1 && (ITEM.test(ls[j]) || SUB.test(ls[j]))) { t = join([t, ...ls.slice(i + 1, j).map(x => x.trim())], lang); i = j - 1; }
      }
      if (untitled.has(cur[0])) cur[1].push(cm[1] + ' '.repeat(cm[2].length + 2) + t); // e.g. 16.1: the heading line is body text
      else titles[cur[0]] = glue(t.replace(/\s+/g, ' '));
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
