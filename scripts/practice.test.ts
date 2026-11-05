// run: node scripts/practice.test.ts
import assert from 'node:assert/strict';
import { pickNext, exportBox, importBox, parseText } from '../src/store.ts';
const ids = ['a', 'b', 'c'];
assert.equal(pickNext(ids, { a: 1, b: 2, c: 2 }, null, () => 0), 'a');            // lowest box first
assert.equal(pickNext(ids, { a: 0, b: 0, c: 2 }, 'a', () => 0), 'b');             // never the one just asked
assert.equal(pickNext(['a'], {}, 'a', () => 0), 'a');                              // only one question left
assert.equal(pickNext(ids, {}, null, () => 0.99), 'c');                            // random among ties
assert.equal(pickNext(ids, { a: 2, b: 2, c: 2 }, 'c', () => 0), 'a');              // all mastered: keep cycling
const out = exportBox({ lang: 'fi', box: { a: 2, b: 1, gone: 2 } });
assert.deepEqual(importBox(out, ids), { a: 2, b: 1 });                              // round trip, unknown ids dropped
assert.deepEqual(importBox(JSON.stringify({ app: 'sailrules', v: 1, box: { a: 9, b: -3, c: 1.5 } }), ids), { a: 2, b: 0 }); // clamped, non-integers dropped
for (const bad of ['', 'x', '{}', '{"app":"other","v":1,"box":{}}', '{"app":"sailrules","v":2,"box":{}}', '{"app":"sailrules","v":1}']) assert.equal(importBox(bad, ids), null);
// Rule text file: valid shape accepted, wrong app / missing language rejected.
const ml = { fi: 'a', sv: 'b', en: 'c' };
const tf = (o: object) => JSON.stringify({ app: 'sailrules-text', v: 1, edition: 'x', titles: { '18.1': ml }, blocks: [{ id: '18.1(a)', d: 1, t: ml }], ...o });
assert.equal(parseText(tf({}))?.blocks.length, 1);
assert.equal(parseText(tf({ app: 'sailrules' })), null);
assert.equal(parseText(tf({ blocks: [{ id: '10', d: 0, t: { fi: 'a', en: 'c' } }] })), null);
assert.equal(parseText('not json'), null);
console.log('ok');
