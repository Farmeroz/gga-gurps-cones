import test from 'node:test';
import assert from 'node:assert/strict';
import { snapshotRegion, sendRegion, openAreaDialog } from '../scripts/area.js';
let placed, input, notices;
globalThis.game = {
  user: { id: 'gm', isGM: true, color: '#123456' },
  modules: new Map(),
  paused: false,
};
globalThis.ui = {
  notifications: { error: (s) => notices.push(s), warn: (s) => notices.push(s), info() {} },
};
globalThis.CONST = {
  REGION_VISIBILITY: { OBSERVER: 1 },
  DOCUMENT_OWNERSHIP_LEVELS: { OWNER: 3, OBSERVER: 2 },
};
globalThis.foundry = { applications: { api: { DialogV2: { input: async () => input } } } };
function setup() {
  notices = [];
  placed = null;
  input = { mode: 'uniform', radius: 3 };
  game.user.isGM = true;
  const t = {
    document: { id: 't', uuid: 'Scene.s.Token.t', x: 100, y: 100, elevation: 0 },
    isVisible: true,
  };
  t.document.object = t;
  const hidden = { document: { id: 'h', uuid: 'Scene.s.Token.h', x: 0, y: 0 }, isVisible: false };
  hidden.document.object = hidden;
  const scene = { id: 's', grid: { units: 'feet', size: 100, distance: 3 }, regions: new Map() };
  const region = {
    id: 'r',
    uuid: 'Scene.s.Region.r',
    name: 'Circle',
    parent: scene,
    shapes: [{ type: 'circle', x: 0, y: 0, radius: 300 }],
    tokens: new Set([t.document, hidden.document]),
    testUserPermission: () => true,
    flags: {},
    toObject() {
      return { shapes: this.shapes };
    },
  };
  scene.regions.set('r', region);
  globalThis.canvas = {
    ready: true,
    scene,
    tokens: { placeables: [t, hidden] },
    dimensions: { distancePixels: 100 / 3 },
    regions: {
      placeRegion: async (data) => {
        placed = data;
      },
    },
  };
  return { region, t, hidden };
}
test('circle placement converts yards, preserves ownership, and stores uniform or blast intent', async () => {
  setup();
  await openAreaDialog();
  assert.equal(placed.shapes[0].radius, 300);
  assert.equal(placed.shapes[0].type, 'circle');
  assert.equal(placed.flags['gga-gurps-cones'].damageMode, 'uniform');
  assert.equal(placed.ownership.gm, 3);
  input.mode = 'explosion';
  await openAreaDialog();
  assert.equal(placed.flags['gga-gurps-cones'].damageMode, 'explosion');
});
test('unknown units do not silently create a wrongly scaled area', async () => {
  setup();
  canvas.scene.grid.units = 'hexes';
  await openAreaDialog();
  assert.equal(placed, null);
  assert.match(notices[0], /recognised/);
});
test('native Region membership and privacy determine candidates; moving geometry or tokens changes snapshot', () => {
  const { region, t } = setup();
  const initial = snapshotRegion(region, 2);
  assert.equal(initial.tokens.length, 2);
  assert.equal(initial.origin.elevation, 2);
  t.document.x++;
  assert.notEqual(snapshotRegion(region, 2).signature, initial.signature);
  game.user.isGM = false;
  assert.equal(snapshotRegion(region).tokens.length, 1);
  region.shapes[0].type = 'cone';
  assert.equal(snapshotRegion(region).mode, 'cone');
});
test('handoff supplies a fresh snapshot callback and never mutates token selection or actor data', async () => {
  const { region, t } = setup();
  let received;
  game.modules.set('gurps-manual-add', {
    active: true,
    api: {
      openArea: async (o) => {
        received = o;
        return true;
      },
    },
  });
  assert.equal(await sendRegion(region), true);
  assert.equal(received.tokens[0], t);
  assert.equal(received.mode, 'uniform');
  const old = received.template.signature;
  region.shapes[0].x++;
  assert.notEqual(received.snapshot().signature, old);
  canvas.scene.regions.delete('r');
  assert.throws(received.snapshot, /no longer/);
});
test('missing companion or inaccessible templates report clear errors', async () => {
  const { region } = setup();
  game.modules.clear();
  await assert.rejects(() => sendRegion(region), /Enable/);
  region.testUserPermission = () => false;
  assert.throws(() => snapshotRegion(region), /cannot view/);
});
