// Local check (needs the rulebook PDFs in the parent folder; skipped otherwise): the in-app parser must reproduce
// the word-for-word verified text file ../saannot-teksti.json exactly. Run: node scripts/ruletext.test.ts
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { readPdf, parseBook, detectLang, SKELETON } from '../src/ruletext.ts';

const dir = fileURLToPath(new URL('../../', import.meta.url));
const files = { en: '2025-2028-RRS-with-Changes-and-Corrections.pdf', fi: 'Purjehduksen-kilpailusaannot-2025-2028-A4_pien.pdf', sv: 'KAPPSEGLINGSREGLERNA-2025-2028-p.pdf' } as const;
if (!existsSync(dir + 'saannot-teksti.json') || !Object.values(files).every(f => existsSync(dir + f))) { console.log('skipped: PDFs or saannot-teksti.json missing'); process.exit(0); }
const gold = JSON.parse(readFileSync(dir + 'saannot-teksti.json', 'utf8'));
assert.deepEqual(gold.blocks.map((b: { id: string; d: number }) => [b.id, b.d]), SKELETON.blocks);
for (const [lang, f] of Object.entries(files) as [keyof typeof files, string][]) {
  const lines = await readPdf({ getDocument }, new Uint8Array(readFileSync(dir + f)));
  assert.equal(detectLang(lines), lang);
  const r = parseBook(lines, lang, f);
  assert.ok('text' in r, `${lang}: ${'error' in r ? r.error : ''}`);
  r.text.blocks.forEach((t, i) => assert.equal(t, gold.blocks[i].t[lang], `${lang} ${SKELETON.blocks[i][0]}`));
  for (const k of SKELETON.titles) assert.equal(r.text.titles[k], gold.titles[k][lang], `${lang} title ${k}`);
  console.log(lang, 'ok');
}
