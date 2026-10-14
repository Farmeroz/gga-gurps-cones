import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeShapeProfile,
  profileFromRegion,
  placeShapeProfile,
  shapeCommand,
  saveShapeProfile,
} from '../scripts/profiles.js';
const cone = { version: 1, kind: 'cone', name: 'Breath', range: 10, width: 5 };
let placed, errors, warnings;
function reset(units = 'yards', distancePixels = 100) {
  placed = [];
  errors = [];
  warnings = [];
  globalThis.game = {
    user: { id: 'gm', isGM: true, can: () => true, color: '#fff' },
    paused: false,
  };
  globalThis.CONST = {
    REGION_VISIBILITY: { OBSERVER: 1 },
    DOCUMENT_OWNERSHIP_LEVELS: { OBSERVER: 2, OWNER: 3 },
  };
  globalThis.ui = {
    notifications: { error: (x) => errors.push(x), warn: (x) => warnings.push(x), info() {} },
  };
  globalThis.canvas = {
    ready: true,
    scene: { id: 'current', grid: { units, size: 100, distance: 1 } },
    dimensions: { distancePixels },
    level: { id: 'new-level' },
    regions: {
      placeRegion: async (data, options) => {
        placed.push({ data, options });
        return data;
      },
    },
  };
}
const region = (shape) => ({
  name: 'Edited cone',
  parent: { id: 'current' },
  testUserPermission: () => true,
  shapes: [shape],
  flags: { 'gga-gurps-cones': { maximumRangeYards: 999, damageMode: 'explosion' } },
});
test('shape profiles use current geometry, strip scene state and roundtrip physical dimensions', () => {
  reset();
  const angle = (2 * Math.atan(5 / 20) * 180) / Math.PI;
  const p = profileFromRegion(
    region({ type: 'cone', radius: 1000, angle, x: 800, y: 500, rotation: 120 }),
  );
  assert.equal(p.range, 10);
  assert.ok(Math.abs(p.width - 5) < 1e-9);
  assert.equal(p.x, undefined);
  assert.deepEqual(
    normalizeShapeProfile({ ...cone, targets: ['old'], levels: ['old'], behaviors: [{}] }),
    cone,
  );
});
test('replay converts yards into the current scene scale and starts fresh placement', async () => {
  for (const [units, pixels] of [
    ['yards', 100],
    ['feet', 100 / 3],
    ['metres', 100 / 0.9144],
  ]) {
    reset(units, pixels);
    await placeShapeProfile(cone);
    const { data, options } = placed[0];
    assert.ok(Math.abs(data.shapes[0].radius - 1000) < 1e-8);
    assert.equal(data.shapes[0].x, 0);
    assert.equal(data.shapes[0].rotation, 0);
    assert.equal(options.allowRotation, true);
    assert.deepEqual(data.levels, ['new-level']);
    assert.equal(data.behaviors, undefined);
    assert.equal(data.ownership.gm, 3);
  }
});
test('circle keeps blast mode and size across units without reusing its centre', async () => {
  reset('feet', 100 / 3);
  const p = profileFromRegion(region({ type: 'circle', radius: 600, x: 555, y: 999 }));
  assert.equal(p.radius, 6);
  assert.equal(p.mode, 'explosion');
  reset('metres', 100);
  await placeShapeProfile(p);
  assert.ok(Math.abs(placed[0].data.shapes[0].radius - 548.64) < 1e-8);
  assert.equal(placed[0].options.allowRotation, false);
  assert.equal(placed[0].data.flags['gga-gurps-cones'].damageMode, 'explosion');
});
test('unsupported shapes, holes, other scenes and unrecognised units cannot create misleading profiles', async () => {
  reset();
  for (const shape of [
    { type: 'polygon' },
    { type: 'circle', radius: 100, hole: true },
    { type: 'cone', radius: 100, angle: 180 },
  ])
    assert.throws(() => profileFromRegion(region(shape)));
  assert.throws(() =>
    profileFromRegion({
      ...region({ type: 'circle', radius: 100 }),
      testUserPermission: () => false,
    }),
  );
  assert.throws(() =>
    profileFromRegion({ ...region({ type: 'circle', radius: 100 }), parent: { id: 'other' } }),
  );
  assert.throws(() => normalizeShapeProfile({ ...cone, version: 2 }));
  assert.throws(() => normalizeShapeProfile({ ...cone, range: Infinity }));
  canvas.scene.grid.units = 'hexes';
  assert.throws(() => profileFromRegion(region({ type: 'circle', radius: 100 })));
  assert.equal(await placeShapeProfile(cone), false);
  assert.equal(placed.length, 0);
  canvas.scene.grid.units = 'yards';
  game.paused = true;
  game.user.isGM = false;
  assert.equal(await placeShapeProfile(cone), false);
  assert.equal(placed.length, 0);
});
test('macro save supports cancel and escaped names, with private ownership and guarded replay', async () => {
  reset();
  let result = null,
    macro,
    received;
  globalThis.foundry = { applications: { api: { DialogV2: { input: async () => result } } } };
  globalThis.Macro = {
    canUserCreate: () => true,
    create: async (data) => {
      macro = data;
      return data;
    },
  };
  assert.equal(await saveShapeProfile(cone), null);
  assert.equal(macro, undefined);
  result = { name: 'Breath "quote" `tick`' };
  await saveShapeProfile(cone);
  assert.deepEqual(macro.ownership, { default: 0, gm: 3 });
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  const run = new AsyncFunction('game', 'ui', macro.command);
  await run(
    {
      modules: new Map([
        [
          'gga-gurps-cones',
          {
            active: true,
            api: {
              placeShapeProfile: async (p) => {
                received = p;
              },
            },
          },
        ],
      ]),
    },
    ui,
  );
  assert.deepEqual(received, macro.flags['gga-gurps-cones'].profile);
  assert.equal(received.name, result.name);
  await new AsyncFunction('game', 'ui', shapeCommand(cone))({ modules: new Map() }, ui);
  assert.match(warnings[0], /Enable Cone Regions/);
  game.user.can = () => false;
  assert.equal(await saveShapeProfile(cone), null);
  assert.match(errors[0], /permission/);
});
