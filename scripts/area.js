import { yardsToSceneUnits } from './math.js';
const ID = 'gga-gurps-cones';
const esc = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
let opening = false;

export function snapshotRegion(region, elevation = 0, view = globalThis.canvas) {
  if (
    !view?.ready ||
    !region ||
    region.parent?.id !== view.scene?.id ||
    !view.scene.regions?.get(region.id)
  )
    throw new Error('The template is no longer on the active scene.');
  if (!region.testUserPermission(game.user, 'OBSERVER'))
    throw new Error('You cannot view this template.');
  const shape = Array.from(region.shapes ?? [])[0];
  if (region.shapes.length !== 1 || !['circle', 'cone'].includes(shape?.type))
    throw new Error('Use a single circle or cone Region.');
  if (!Number.isFinite(elevation))
    throw new Error('Enter a valid blast-centre elevation in scene units.');
  if (![shape.x, shape.y].every(Number.isFinite))
    throw new Error('The template has no usable centre.');
  const tokens = Array.from(region.tokens ?? [])
    .map((d) => d.object ?? view.tokens.get(d.id))
    .filter((t) => t && (game.user.isGM || t.isVisible));
  const flags = region.flags?.[ID] ?? {};
  const mode =
    shape.type === 'cone' ? 'cone' : flags.damageMode === 'explosion' ? 'explosion' : 'uniform';
  const signature = JSON.stringify({
    id: region.uuid,
    shapes: region.toObject().shapes,
    elevation: region.toObject().elevation,
    levels: region.toObject().levels,
    grid: view.scene.grid,
    originElevation: elevation,
    tokens: Array.from(view.tokens.placeables ?? [])
      .filter((t) => game.user.isGM || t.isVisible)
      .map((t) => ({
        id: t.document.uuid,
        x: t.document.x,
        y: t.document.y,
        elevation: t.document.elevation,
        width: t.document.width,
        height: t.document.height,
        actorId: t.document.actorId,
        actorLink: t.document.actorLink,
      })),
    members: tokens.map((t) => t.document.uuid),
  });
  return {
    name: region.name,
    signature,
    tokens,
    mode,
    origin: { x: shape.x, y: shape.y, elevation, sceneId: view.scene.id },
  };
}

export async function sendRegion(region, elevation = 0) {
  const module = game.modules.get('gurps-manual-add');
  if (!module?.active || typeof module.api?.openArea !== 'function')
    throw new Error('Enable GURPS Manual Damage 0.4.0 or its test build to review this area.');
  const snap = snapshotRegion(region, elevation);
  return module.api.openArea({
    tokens: snap.tokens,
    mode: snap.mode,
    origin: snap.origin,
    template: snap,
    snapshot: () => snapshotRegion(region, elevation),
  });
}

export async function openAreaDialog() {
  if (opening) return;
  if (!globalThis.canvas?.ready || !canvas.regions)
    return ui.notifications.warn('Open a scene first.');
  if (game.paused && !game.user.isGM)
    return ui.notifications.warn('Unpause the game before placing a Region.');
  opening = true;
  try {
    const input = await foundry.applications.api.DialogV2.input({
      window: { title: 'Create GURPS area' },
      position: { width: 420 },
      content: `<p>Place a circular area, then use <strong>Send area to Manual Damage</strong> to review its recipients.</p><label>Effect<select name="mode"><option value="uniform">Uniform AoE — no falloff</option><option value="explosion">Explosion — distance falloff</option></select></label><label>Radius (yards)<input name="radius" type="number" min="0.01" step="any" value="3" required></label><details><summary>Which radius?</summary><p>Use the listed radius for an area effect. Ordinary GURPS 4e blast radius is 2 × damage dice × multiplier (B414). This marker selects candidates; it does not roll or apply damage.</p></details>`,
      ok: { label: 'Place area', icon: 'fa-solid fa-location-dot' },
    });
    if (!input) return;
    const radius = yardsToSceneUnits(Number(input.radius), canvas.scene.grid.units);
    if (!radius.recognised)
      throw new Error(
        'Use recognised scene distance units (for example yards, feet or metres) before creating an area in yards.',
      );
    const scale =
      Number(canvas.dimensions?.distancePixels) ||
      Number(canvas.scene.grid.size) / Number(canvas.scene.grid.distance);
    if (!Number.isFinite(scale) || scale <= 0)
      throw new Error('The scene has no usable distance scale.');
    if (!['uniform', 'explosion'].includes(input.mode))
      throw new Error('Choose Uniform AoE or Explosion.');
    await canvas.regions.placeRegion(
      {
        name: `${input.mode === 'explosion' ? 'Explosion' : 'Uniform AoE'} — ${Number(input.radius)} yd radius`,
        shapes: [{ type: 'circle', x: 0, y: 0, radius: radius.value * scale, gridBased: true }],
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
        flags: { [ID]: { damageMode: input.mode, radiusYards: Number(input.radius) } },
      },
      { allowRotation: false },
    );
    ui.notifications.info(
      'Area placed. Use Send area to Manual Damage in Region Controls when ready.',
    );
  } catch (error) {
    ui.notifications.error(error.message);
  } finally {
    opening = false;
  }
}

export async function openSendDialog() {
  if (opening) return;
  if (!globalThis.canvas?.ready) return ui.notifications.warn('Open a scene first.');
  opening = true;
  try {
    const regions = Array.from(canvas.scene.regions ?? []).filter(
      (r) =>
        r.shapes?.length === 1 &&
        ['circle', 'cone'].includes(r.shapes[0].type) &&
        r.testUserPermission(game.user, 'OBSERVER'),
    );
    if (!regions.length) throw new Error('Place a circle or cone Region first.');
    const selected = canvas.regions?.controlled?.[0]?.document?.id;
    const result = await foundry.applications.api.DialogV2.input({
      window: { title: 'Send area to Manual Damage' },
      position: { width: 440 },
      content: `<label>Template<select name="region">${regions.map((r) => `<option value="${esc(r.id)}" ${r.id === selected ? 'selected' : ''}>${esc(r.name)}</option>`).join('')}</select></label><details><summary>Elevation and coverage</summary><label>Centre elevation (${esc(canvas.scene.grid.units)})<input name="elevation" type="number" step="any" value="0"></label><p>Use the detonation height for an airburst. Foundry Region membership selects candidates, including covered token spaces. Review edge cases and cover in Manual Damage; walls do not automatically exclude recipients.</p></details>`,
      ok: { label: 'Review recipients', icon: 'fa-solid fa-calculator' },
    });
    if (result)
      await sendRegion(
        regions.find((r) => r.id === result.region),
        Number(result.elevation),
      );
  } catch (error) {
    ui.notifications.error(error.message);
  } finally {
    opening = false;
  }
}
