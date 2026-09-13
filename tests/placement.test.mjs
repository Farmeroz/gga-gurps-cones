import test from 'node:test';
import assert from 'node:assert/strict';
const once = new Map(),
  hooks = new Map(),
  settings = new Map();
let placed, warnings, errors, calls, input, captured;
globalThis.Hooks = { once: (key, fn) => once.set(key, fn), on: (key, fn) => hooks.set(key, fn) };
globalThis.CONST = {
  REGION_VISIBILITY: { OBSERVER: 1 },
  DOCUMENT_OWNERSHIP_LEVELS: { OBSERVER: 2, OWNER: 3 },
};
globalThis.HTMLElement = class {};
globalThis.ui = {
  notifications: {
    warn: (value) => warnings.push(value),
    error: (value) => errors.push(value),
    info() {},
  },
};
globalThis.game = {
  modules: new Map([['gga-gurps-cones', {}]]),
  user: { id: 'gm', isGM: true, color: '#123456' },
  i18n: {
    lang: 'en',
    localize: (key) => key,
    format: (key, values) => key + JSON.stringify(values),
  },
  settings: {
    register: (_id, key, config) => settings.set(key, config.default),
    get: (_id, key) => settings.get(key),
    set: async (_id, key, value) => settings.set(key, value),
  },
};
globalThis.foundry = {
  applications: {
    api: {
      DialogV2: {
        input: async (options) => {
          calls++;
          captured = options;
          return input();
        },
      },
    },
  },
};
const { openConeDialog } = await import('../scripts/module.js');
once.get('init')();
function reset() {
  placed = [];
  warnings = [];
  errors = [];
  calls = 0;
  captured = null;
  game.paused = false;
  game.user.isGM = true;
  input = () => ({ maximumRange: '10', maximumWidth: '5', widthUnspecified: false });
  globalThis.canvas = {
    ready: true,
    scene: { grid: { units: 'yards', size: 100, distance: 1 } },
    dimensions: { distancePixels: 100 },
    level: { id: 'ground' },
    regions: { placeRegion: async (data, options) => placed.push({ data, options }) },
  };
}
test('init exposes the API and places the tool after existing region controls', () => {
  reset();
  assert.equal(game.modules.get('gga-gurps-cones').api.openConeDialog, openConeDialog);
  const controls = { regions: { tools: { select: { order: 3 }, delete: { order: 8 } } } };
  hooks.get('getSceneControlButtons')(controls);
  assert.equal(controls.regions.tools.gurpsCone.order, 9);
  assert.doesNotThrow(() => hooks.get('getSceneControlButtons')({}));
});
test('placement preserves coverage, rotation, level, and user ownership', async () => {
  reset();
  await openConeDialog();
  const { data, options } = placed[0];
  assert.equal(data.shapes[0].radius, 1000);
  assert.ok(Math.abs(data.shapes[0].angle - 28.072486935852957) < 1e-10);
  assert.equal(data.highlightMode, 'coverage');
  assert.equal(data.shapes[0].gridBased, true);
  assert.deepEqual(options, { allowRotation: true });
  assert.deepEqual(data.levels, ['ground']);
  assert.equal(data.ownership.gm, 3);
  assert.equal(data.ownership.default, 2);
  assert.equal(data.flags['gga-gurps-cones'].maximumRangeYards, 10);
});
test('feet scenes and fallback grid scale preserve the physical range', async () => {
  reset();
  canvas.scene.grid.units = 'feet';
  canvas.scene.grid.distance = 3;
  delete canvas.dimensions.distancePixels;
  await openConeDialog();
  assert.ok(Math.abs(placed[0].data.shapes[0].radius - 1000) < 1e-9);
});
test('unknown scene units warn while retaining one-to-one placement', async () => {
  reset();
  canvas.scene.grid.units = 'hexes';
  await openConeDialog();
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /UnknownUnits/);
  assert.equal(placed.length, 1);
});
test('missing scenes and paused players cannot open a placement dialogue', async () => {
  reset();
  canvas.ready = false;
  await openConeDialog();
  assert.equal(calls, 0);
  canvas.ready = true;
  game.paused = true;
  game.user.isGM = false;
  await openConeDialog();
  assert.equal(calls, 0);
  assert.equal(placed.length, 0);
  assert.equal(warnings.length, 2);
});
test('cancelled input leaves placement untouched and the dialogue can reopen', async () => {
  reset();
  input = () => null;
  await openConeDialog();
  await openConeDialog();
  assert.equal(calls, 2);
  assert.equal(placed.length, 0);
});
test('concurrent clicks open only one dialogue', async () => {
  reset();
  let release;
  input = () =>
    new Promise((resolve) => {
      release = resolve;
    });
  const first = openConeDialog();
  await openConeDialog();
  assert.equal(calls, 1);
  release(null);
  await first;
});
test('invalid input reports an error and leaves the next valid placement usable', async () => {
  reset();
  const original = console.error;
  const errorObjects = [];
  console.error = (...args) => errorObjects.push(args);
  try {
    input = () => ({ maximumRange: -1, maximumWidth: 5 });
    await openConeDialog();
  } finally {
    console.error = original;
  }
  assert.equal(placed.length, 0);
  assert.equal(errors.length, 1);
  assert.ok(errorObjects[0].at(-1) instanceof Error);
  input = () => ({ maximumRange: 10, maximumWidth: 5 });
  await openConeDialog();
  assert.equal(placed.length, 1);
});
test('preview updates its angle and disables the unused width input', async () => {
  reset();
  input = () => null;
  await openConeDialog();
  const range = { value: '10' },
    width = { value: '20' },
    unspecified = { checked: false },
    output = {};
  const elements = [range, width, unspecified, output];
  const root = new HTMLElement();
  let update;
  root.querySelector = () => elements.shift();
  root.addEventListener = (_event, fn) => {
    update = fn;
  };
  captured.render(null, { element: root });
  assert.equal(output.textContent, '90.00°');
  unspecified.checked = true;
  update();
  assert.equal(width.readOnly, true);
  assert.equal(output.textContent, '53.13°');
  range.value = '0';
  update();
  assert.equal(output.textContent, '—');
});
