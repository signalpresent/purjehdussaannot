// run: node scripts/check-content.ts   (validates src/rules.json against src/defs.json and content-map.json)
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const rd = (f: string) => JSON.parse(readFileSync(new URL(f, import.meta.url), 'utf8'));
const rules = rd('../src/rules.json'), defs = rd('../src/defs.json'), map = rd('../content-map.json');
const ml = (m: any, where: string) => { assert.ok(m?.fi?.trim() && m?.en?.trim(), `${where}: fi and en required`); };
const scene = (s: any, where: string) => {
  assert.ok(s?.boats?.length, `${where}: boats`);
  if (s.mark) assert.ok(s.mark[0] > 0 && s.mark[0] < 300 && s.mark[1] > 0 && s.mark[1] < (s.h ?? 260), `${where}: mark out of frame`);
  if (s.zone) {
    assert.ok(s.mark, `${where}: zone needs mark`);
    const r = 180 * (s.k ?? 1);   // a clipped zone would mislead
    assert.ok(s.mark[0] - r >= 0 && s.mark[0] + r <= 300 && s.mark[1] - r >= 0 && s.mark[1] + r <= (s.h ?? 260), `${where}: zone does not fit the frame`);
  }
  assert.ok((s.k ?? 1) > 0 && (s.k ?? 1) <= 1, `${where}: k`);
  for (const o of s.obst ?? []) assert.ok(o.x >= 0 && o.y >= 0 && o.x + o.w <= 300 && o.y + o.h <= (s.h ?? 260), `${where}: obstruction out of frame`);
  for (const b of s.boats) { assert.ok(b.x >= 20 && b.x <= 280 && b.y >= 20 && b.y <= (s.h ?? 260) - 20, `${where}: boat ${b.n} out of frame`); assert.ok(['p', 's'].includes(b.tack), `${where}: tack`); }
};
const ids = new Set<string>();
for (const r of rules) {
  const w = `rule ${r.n}`;
  assert.ok(map.rules[String(r.n)], `${w} not in content-map`);
  for (const k of ['explain', 'note', 'caption']) ml(r[k], `${w}.${k}`);
  scene(r.scene, w);
  for (const d of r.defs) assert.ok(defs.some((x: any) => x.en === d), `${w}: unknown definition ${d}`);
  for (const l of r.links) { ml(l.note, `${w}.link`); assert.ok(l.rules.length); }
  for (const s of r.scenarios) {
    ml(s.title, `${w} case ${s.case}`); ml(s.text, `${w} case ${s.case}`); ml(s.answer, `${w} case ${s.case}`);
    assert.ok(map.cases[String(s.case)], `case ${s.case} missing`);
    assert.ok(!map.meta.case_deleted_or_withdrawn.includes(s.case), `case ${s.case} is deleted or withdrawn`);
    assert.ok(map.cases[String(s.case)].rules.includes(String(r.n)), `case ${s.case} does not cite rule ${r.n}`);
  }
  for (const q of r.questions) {
    assert.ok(!ids.has(q.id), `duplicate id ${q.id}`); ids.add(q.id);
    ml(q.prompt, q.id); ml(q.why, q.id); scene(q.scene, q.id);
    assert.ok(q.options.length >= 2, `${q.id}: options`);
    assert.equal(q.options.filter((o: any) => o.ok).length, 1, `${q.id}: exactly one correct option`);
    for (const o of q.options) ml(o.t, q.id);
  }
}
console.log('ok', rules.length, 'rule(s),', ids.size, 'question(s)');
