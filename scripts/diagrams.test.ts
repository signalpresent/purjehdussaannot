// run: node scripts/diagrams.test.ts
import assert from 'node:assert/strict';
import { clearAstern } from '../src/diagrams.ts';
assert.equal(clearAstern(108, 160), true);   // bow well behind the line
assert.equal(clearAstern(108, 109), true);   // just behind
assert.equal(clearAstern(108, 108), false);  // touching the line = overlap
assert.equal(clearAstern(108, 60), false);   // bow ahead of the line
// chain figure: A line 88, B line 138; B bow 70, C bow 125
assert.equal(clearAstern(88, 70), false);    // A-B overlap
assert.equal(clearAstern(138, 125), false);  // B-C overlap
assert.equal(clearAstern(88, 125), true);    // C clear astern of A, yet overlap via B
console.log('ok');
