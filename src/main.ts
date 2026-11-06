import './style.css';
import { registerSW } from 'virtual:pwa-register';
import defsRaw from './defs.json';
import { LANGS, Lang, T, esc } from './i18n';
import { load, save, State, exportBox, importBox, loadText, saveText, textSig } from './store';
import { readPdf, detectLang, parseBook } from './ruletext';
import { diagrams, overlapMove } from './diagrams';
import { signalsView } from './flags';
import { rules, rulesView, ruleView, practiceView, practiceNext, practiceAnswer, questionIds, official } from './rules';

interface RuleRef { n: number; en: string; fi: string; sv: string }
interface Def { en: string; fi: string; sv: string; rules: RuleRef[]; cases: number[]; explain: Record<Lang, string>; source: string }
const defs = defsRaw as Def[];
registerSW({ immediate: true });

const state: State = load();
const root = document.getElementById('app')!;
const t = (k: string) => T[k][state.lang];
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const key = (d: Def) => d.en;

type View = 'list' | 'detail' | 'rules' | 'rule' | 'practice' | 'signals';
let view: View = 'list';
let backTo: View = 'list';
let current: Def | null = null;
let currentRule: (typeof rules)[number] | null = null;
let query = '';
let flash = '';
let { text, stale } = loadText();
let textMsg = '';

function shell(inner: string): string {
  const seg = LANGS.map(l => `<button data-lang="${l}" class="${l === state.lang ? 'on' : ''}">${l.toUpperCase()}</button>`).join('');
  const tab = view === 'detail' || view === 'list' ? 'list' : view === 'practice' || view === 'signals' ? view : 'rules';
  const nav = (['list', 'rules', 'signals', 'practice'] as const).map(v => `<button data-nav="${v}" class="${v === tab ? 'on' : ''}">${t({ list: 'tabDefs', rules: 'tabRules', signals: 'tabSignals', practice: 'tabPractice' }[v])}</button>`).join('');
  const foot = `<footer><span class="mute">${Object.keys(text).length ? `${t('textLoaded')}: ${Object.keys(text).map(x => x.toUpperCase()).join(', ')}` : t('textNone')}</span> <button class="btn" data-timport="1">${t('textImport')}</button><input type="file" id="timp" accept=".pdf,application/pdf" multiple hidden><p class="mute" id="timpmsg">${esc(textMsg || (stale ? t('textStale') : ''))}</p>
    <details class="help"><summary>${t('textHow')}</summary><p>${t('textIntro')}</p><ol>${t('textSteps').split('|').map(x => `<li>${esc(x)}</li>`).join('')}</ol><p class="mute">${t('textWarn')}</p></details></footer>`;
  return `<div class="wrap"><header><h1>${esc(t('title'))}</h1><div class="seg">${seg}</div></header><nav>${nav}</nav>${inner}${foot}</div>`;
}

function listView(): string {
  const q = norm(query);
  const items = defs.filter(d => !q || [d.en, d.fi, d.sv].some(x => norm(x).includes(q)));
  const rows = items.map(d => `<div class="item" tabindex="0" data-open="${esc(key(d))}"><div class="t">${esc(d[state.lang])}</div>
    <div class="s">${LANGS.filter(l => l !== state.lang).map(l => esc(d[l])).join(' · ')}</div></div>`).join('');
  return `<input type="search" id="q" placeholder="${esc(t('search'))}" value="${esc(query)}" />
  <div class="list" style="margin-top:8px">${rows || `<p class="mute">${t('none')}</p>`}</div>`;
}

function detailView(d: Def): string {
  const tri = LANGS.map(l => `<div><b>${l.toUpperCase()}</b>${esc(d[l])}</div>`).join('');
  const rules = d.rules.map(r => `<span class="rule"><b>${r.n}</b> ${esc(r[state.lang])}</span>`).join('') || '–';
  const cases = d.cases.length ? `<div class="chips">${d.cases.map(c => `<span>Case ${c}</span>`).join('')}</div>` : '–';
  const ex = `<p>${esc(d.explain[state.lang])}</p><p class="mute">${t('source')}: ${esc(d.source)}</p>`;
  return `<button class="btn" data-nav="${backTo}">${t('back')}</button><h2>${esc(d[state.lang])}</h2><div class="tri">${tri}</div>
  ${official(text, state.lang, b => b === 'def:' + d.en)}<h3>${t('explain')}</h3>${ex}${diagrams[d.en]?.(state.lang) ?? ''}<h3>${t('rules')}</h3>${rules}<h3>${t('cases')}</h3>${cases}`;
}

function render() {
  const inner = view === 'detail' && current ? detailView(current) : view === 'rule' && currentRule ? ruleView(currentRule, state.lang, text)
    : view === 'rules' ? rulesView(state.lang, text) : view === 'practice' ? practiceView(state) : view === 'signals' ? signalsView(state.lang) : listView();
  const hadFocus = document.activeElement?.id === 'q';
  root.innerHTML = shell(inner);
  const m = document.getElementById('impmsg'); if (m) m.textContent = flash;
  if (hadFocus) { const q = document.getElementById('q') as HTMLInputElement; q.focus(); q.setSelectionRange(query.length, query.length); }
}

root.addEventListener('click', e => {
  const el = (e.target as HTMLElement).closest('[data-lang],[data-nav],[data-open],[data-rule],[data-ans],[data-next],[data-export],[data-import],[data-timport]') as HTMLElement | null;
  if (!el) return;
  const ds = el.dataset;
  flash = '';
  if (ds.timport) { (document.getElementById('timp') as HTMLInputElement).click(); return; }
  if (ds.import) { (document.getElementById('imp') as HTMLInputElement).click(); return; }
  if (ds.export) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([exportBox(state)], { type: 'application/json' }));
    a.download = `purjehdussaannot-edistyminen-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(a.href);
    return;
  }
  if (ds.lang) { state.lang = ds.lang as Lang; save(state); }
  else if (ds.nav) view = ds.nav as View;
  else if (ds.rule) { currentRule = rules.find(r => String(r.n) === ds.rule) ?? null; view = currentRule ? 'rule' : 'rules'; window.scrollTo(0, 0); }
  else if (ds.ans) { practiceAnswer(+ds.ans, state); save(state); }
  else if (ds.next) practiceNext(state);
  else if (ds.open) { backTo = view === 'rule' ? 'rule' : 'list'; current = defs.find(d => key(d) === ds.open) || null; view = 'detail'; window.scrollTo(0, 0); }
  render();
});
root.addEventListener('keydown', e => { const el = e.target as HTMLElement; if (e.key === 'Enter' && (el.dataset.open || el.dataset.rule)) el.click(); });
root.addEventListener('input', e => {
  const el = e.target as HTMLInputElement;
  if (el.id === 'q') { query = el.value; render(); }
  if (el.id === 'ov') overlapMove(el, state.lang);
});
root.addEventListener('change', async e => {
  const el = e.target as HTMLInputElement;
  if (el.id === 'timp' && el.files?.length) {
    const files = Array.from(el.files), msgs: string[] = [];
    textMsg = t('textReading'); render();
    try {
      // pdf.js is loaded only here, so it does not slow down the app itself.
      const [pdfjs, worker] = await Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')]);
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
      for (const f of files) {
        const lines = await readPdf(pdfjs, new Uint8Array(await f.arrayBuffer())), lang = detectLang(lines);
        const r = lang ? parseBook(lines, lang, f.name) : null;
        if (!lang || !r) msgs.push(`${f.name}: ${t('textNotBook')}`);
        else if ('error' in r) msgs.push(`${f.name}: ${t('textMismatch')} ${r.error}`);
        else { text[lang] = { ...r.text, sig: textSig() }; msgs.push(`${lang.toUpperCase()}: ${t('textOk')}`); }
      }
      if (!saveText(text)) msgs.push(t('textFull'));
    } catch (err) { msgs.push(`${t('textNotBook')} (${err instanceof Error ? err.message : err})`); }
    textMsg = msgs.join(' · '); stale = false; el.value = ''; render(); return;
  }
  if (el.id !== 'imp' || !el.files?.[0]) return;
  const box = importBox(await el.files[0].text(), questionIds());
  if (box) { state.box = box; save(state); flash = `${t('imported')}: ${Object.keys(box).length}`; } else flash = t('importFail');
  render();
});
render();
