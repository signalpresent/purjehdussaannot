// run: node scripts/tree.test.ts   (every path ends, every next exists, every finding links to an existing rule page)
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { N } from '../src/tree.ts';
const pages = new Set(JSON.parse(readFileSync(new URL('../src/rules.json', import.meta.url), 'utf8')).map((r: any) => String(r.n)));
let ends = 0;
const walk = (id: string, depth: number) => {
  assert.ok(N[id], `missing node ${id}`); assert.ok(depth < 20, `loop at ${id}`);
  for (const o of N[id].opts) {
    for (const r of o.f?.rules ?? []) assert.ok(pages.has(r) || pages.has(r.split('.')[0]), `no page for ${r}`);
    if (o.next) walk(o.next, depth + 1); else ends++;
  }
};
walk('start', 0);
const reach = new Set<string>(); const mark = (id: string) => { if (reach.has(id)) return; reach.add(id); N[id].opts.forEach(o => o.next && mark(o.next)); }; mark('start');
assert.deepEqual(Object.keys(N).filter(k => !reach.has(k)), [], 'unreachable nodes');
console.log('ok', Object.keys(N).length, 'nodes,', ends, 'path ends');
