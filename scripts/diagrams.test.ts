// run: node scripts/diagrams.test.ts
import assert from 'node:assert/strict';
import { clearAstern, zoneRadius, sceneSvg } from '../src/diagrams.ts';
assert.equal(clearAstern(108, 160), true);   // bow well behind the line
assert.equal(clearAstern(108, 109), true);   // just behind
assert.equal(clearAstern(108, 108), false);  // touching the line = overlap
assert.equal(clearAstern(108, 60), false);   // bow ahead of the line
// chain figure: A line 88, B line 138; B bow 70, C bow 125
assert.equal(clearAstern(88, 70), false);    // A-B overlap
assert.equal(clearAstern(138, 125), false);  // B-C overlap
assert.equal(clearAstern(88, 125), true);    // C clear astern of A, yet overlap via B
assert.equal(zoneRadius(), 180);             // zone = three hull lengths (hull 60)
assert.equal(zoneRadius(0.5), 90);           // half-size boats: zone shrinks with them
const svg = sceneSvg({ k: 0.5, h: 260, boats: [{ n: 'A', x: 100, y: 100, rot: 0, tack: 's' }], mark: [150, 150], zone: true, obst: [{ x: 0, y: 200, w: 300, h: 60 }] }, 'x');
assert.ok(svg.includes('class="zn"') && svg.includes('r="90"') && svg.includes('class="ob"') && svg.includes('class="lo"'));
assert.ok(!sceneSvg({ boats: [{ n: 'A', x: 100, y: 100, rot: 0, tack: 's' }] }, 'x').includes('class="lo"'));   // k = 1: label inside the hull
console.log('ok');
