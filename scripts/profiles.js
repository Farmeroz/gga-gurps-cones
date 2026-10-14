import { yardsToSceneUnits, calculateConeAngle } from './math.js';
const ID = 'gga-gurps-cones';
const esc = (s) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
const positive = (value, label) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0 || n > 1e9) throw new Error(`Invalid ${label}.`);
  return n;
};
export function normalizeShapeProfile(profile) {
  if (profile?.version !== 1) throw new Error('Unsupported shape profile version.');
  const kind = profile.kind;
  if (!['cone', 'circle'].includes(kind)) throw new Error('Save a single cone or circle.');
  const result = {
    version: 1,
    kind,
    name: String(profile.name ?? (kind === 'cone' ? 'GURPS cone' : 'GURPS area')).slice(0, 100),
  };
  if (kind === 'cone') {
    result.range = positive(profile.range, 'range');
    result.width = positive(profile.width, 'width');
  } else {
    result.radius = positive(profile.radius, 'radius');
    result.mode = profile.mode ?? 'uniform';
    if (!['uniform', 'explosion'].includes(result.mode)) throw new Error('Invalid area mode.');
  }
  return result;
}
function scale() {
  const n =
    Number(canvas.dimensions?.distancePixels) ||
    Number(canvas.scene.grid.size) / Number(canvas.scene.grid.distance);
  if (!Number.isFinite(n) || n <= 0) throw new Error('The scene has no usable distance scale.');
  return n;
}
export function profileFromRegion(region) {
  if (!region?.testUserPermission(game.user, 'OBSERVER'))
    throw new Error('You cannot view this Region.');
  if (!canvas?.ready || region.parent?.id !== canvas.scene?.id)
    throw new Error('Choose a Region on the current scene.');
  const shapes = Array.from(region.shapes ?? []);
  if (shapes.length !== 1 || !['cone', 'circle'].includes(shapes[0].type) || shapes[0].hole)
    throw new Error('Only single, solid cones and circles can be saved as shape profiles.');
  const conversion = yardsToSceneUnits(1, canvas.scene.grid.units);
  if (!conversion.recognised)
    throw new Error('Set recognised scene units before saving physical dimensions.');
  const shape = shapes[0],
    radius = shape.radius / scale() / conversion.value;
  if (shape.type === 'cone') {
    if (!Number.isFinite(shape.angle) || shape.angle <= 0 || shape.angle >= 180)
      throw new Error('Cone angle must be between 0 and 180 degrees.');
    return normalizeShapeProfile({
      version: 1,
      kind: 'cone',
      name: region.name,
      range: radius,
      width: 2 * radius * Math.tan((shape.angle * Math.PI) / 360),
    });
  }
  return normalizeShapeProfile({
    version: 1,
    kind: 'circle',
    name: region.name,
    radius,
    mode: region.flags?.[ID]?.damageMode ?? 'uniform',
  });
}
export async function placeShapeProfile(profile) {
  try {
    const p = normalizeShapeProfile(profile);
    if (!globalThis.canvas?.ready || !canvas.regions)
      throw new Error('Open a scene before placing a saved shape.');
    if (game.paused && !game.user.isGM)
      throw new Error('Unpause the game before placing a Region.');
    const converted = yardsToSceneUnits(
      p.kind === 'cone' ? p.range : p.radius,
      canvas.scene.grid.units,
    );
    if (!converted.recognised)
      throw new Error('Set recognised scene units before placing a saved shape.');
    const shape = { type: p.kind, x: 0, y: 0, radius: converted.value * scale(), gridBased: true };
    if (p.kind === 'cone')
      Object.assign(shape, { angle: calculateConeAngle(p.range, p.width), rotation: 0 });
    return await canvas.regions.placeRegion(
      {
        name: p.name,
        shapes: [shape],
        color: game.user.color,
        restriction: { enabled: true, type: 'move' },
        highlightMode: 'coverage',
        displayMeasurements: true,
        visibility: CONST.REGION_VISIBILITY.OBSERVER,
        ownership: {
          default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER,
          [game.user.id]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER,
        },
        ...(canvas.level?.id ? { levels: [canvas.level.id] } : {}),
        flags: {
          [ID]:
            p.kind === 'cone'
              ? {
                  maximumRangeYards: p.range,
                  maximumWidthYards: p.width,
                  widthUnspecified: false,
                  calculatedAngle: shape.angle,
                }
              : { damageMode: p.mode, radiusYards: p.radius },
        },
      },
      { allowRotation: p.kind === 'cone' },
    );
  } catch (error) {
    ui.notifications.error('Shape profile: ' + error.message);
    return false;
  }
}
export function shapeCommand(profile) {
  return `const module = game.modules.get('${ID}');\nif (!module?.active || !module.api?.placeShapeProfile) { ui.notifications.warn('Enable Cone Regions 0.3.0 or later to use this shape.'); } else { await module.api.placeShapeProfile(${JSON.stringify(normalizeShapeProfile(profile))}); }`;
}
let saving = false;
export async function saveShapeProfile(profile) {
  if (saving) return null;
  saving = true;
  try {
    const p = normalizeShapeProfile(profile),
      MacroClass = globalThis.Macro ?? globalThis.foundry?.documents?.Macro;
    if (!MacroClass?.canUserCreate(game.user) || !game.user.can('MACRO_SCRIPT'))
      throw new Error('You need permission to create and use script macros. Ask the GM.');
    const result = await foundry.applications.api.DialogV2.input({
      window: { title: 'Save shape as macro' },
      position: { width: 440 },
      content: `<label>Macro name<input name="name" value="${esc(p.name)}" maxlength="100" required></label><p>Saves shape dimensions in yards and its area mode. Each use starts new placement on the current scene. Positions, targets, ownership, elevation restrictions and Region behaviours are not copied.</p>`,
      ok: { label: 'Save macro', icon: 'fa-solid fa-floppy-disk' },
    });
    if (!result) return null;
    const name = String(result.name ?? '').trim();
    if (!name) throw new Error('Enter a macro name.');
    const macro = await MacroClass.create({
      name: name.slice(0, 100),
      type: 'script',
      img: 'icons/svg/explosion.svg',
      command: shapeCommand({ ...p, name: name.slice(0, 100) }),
      ownership: { default: 0, [game.user.id]: 3 },
      flags: { [ID]: { profile: { ...p, name: name.slice(0, 100) } } },
    });
    if (!macro) throw new Error('Macro creation did not complete.');
    ui.notifications.info(`Saved “${name}” in Macros. Drag it to your hotbar.`);
    return macro;
  } catch (error) {
    ui.notifications.error('Save shape: ' + error.message);
    return null;
  } finally {
    saving = false;
  }
}
export async function openSaveShapeDialog() {
  try {
    if (!globalThis.canvas?.ready) throw new Error('Open a scene first.');
    const regions = Array.from(canvas.scene.regions ?? []).filter(
      (r) =>
        r.shapes?.length === 1 &&
        ['cone', 'circle'].includes(r.shapes[0].type) &&
        !r.shapes[0].hole &&
        r.testUserPermission(game.user, 'OBSERVER'),
    );
    if (!regions.length) throw new Error('Place a cone or circle first.');
    const selected = canvas.regions?.controlled?.[0]?.document?.id;
    const result = await foundry.applications.api.DialogV2.input({
      window: { title: 'Save existing shape' },
      content: `<label>Shape<select name="region">${regions.map((r) => `<option value="${esc(r.id)}" ${r.id === selected ? 'selected' : ''}>${esc(r.name)}</option>`).join('')}</select></label>`,
      ok: { label: 'Continue' },
    });
    if (result)
      await saveShapeProfile(profileFromRegion(regions.find((r) => r.id === result.region)));
  } catch (error) {
    ui.notifications.error(error.message);
  }
}
