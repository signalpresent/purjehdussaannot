// run: node scripts/practice.test.ts
import assert from 'node:assert/strict';
import { pickNext } from '../src/store.ts';
const ids = ['a', 'b', 'c'];
assert.equal(pickNext(ids, { a: 1, b: 2, c: 2 }, null, () => 0), 'a');            // lowest box first
assert.equal(pickNext(ids, { a: 0, b: 0, c: 2 }, 'a', () => 0), 'b');             // never the one just asked
assert.equal(pickNext(['a'], {}, 'a', () => 0), 'a');                              // only one question left
assert.equal(pickNext(ids, {}, null, () => 0.99), 'c');                            // random among ties
assert.equal(pickNext(ids, { a: 2, b: 2, c: 2 }, 'c', () => 0), 'a');              // all mastered: keep cycling
console.log('ok');
