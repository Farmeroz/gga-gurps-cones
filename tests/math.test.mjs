import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateConeAngle, resolveMaximumWidth, yardsToSceneUnits } from '../scripts/math.js';

test('a 10-yard range and 20-yard width make a 90-degree cone', () => {
  assert.ok(Math.abs(calculateConeAngle(10, 20) - 90) < 1e-10);
});
test('scaled distances retain the angle, including fractional yards', () => {
  assert.equal(calculateConeAngle(10, 5), calculateConeAngle(0.5, 0.25));
  assert.ok(Math.abs(calculateConeAngle(10, 10) - 53.13010235415598) < 1e-10);
});
test('unspecified width follows range and ignores the unused width input', () => {
  assert.equal(resolveMaximumWidth(12, NaN, true), 12);
  assert.equal(resolveMaximumWidth(12, 3, false), 3);
});
test('invalid dimensions fail before placement can be calculated', () => {
  for (const value of [0, -1, NaN, Infinity, -Infinity, '10', null]) {
    assert.throws(() => calculateConeAngle(value, 5), RangeError);
    assert.throws(() => calculateConeAngle(10, value), RangeError);
    assert.throws(() => resolveMaximumWidth(value, 5, true), RangeError);
  }
});
test('scene units convert yards consistently, including aliases', () => {
  for (const unit of ['FT.', 'feet', ' foot ']) assert.equal(yardsToSceneUnits(10, unit).value, 30);
  assert.equal(yardsToSceneUnits(10, 'yards').value, 10);
  assert.equal(yardsToSceneUnits(10, 'in').value, 360);
  assert.ok(Math.abs(yardsToSceneUnits(10, 'metres').value - 9.144) < 1e-10);
  assert.equal(yardsToSceneUnits(1760, 'miles').value, 1);
});
test('unknown units explicitly report the one-to-one fallback', () => {
  assert.deepEqual(yardsToSceneUnits(10, 'hexes'), {
    value: 10,
    recognised: false,
    canonicalUnit: 'hexes',
  });
});
