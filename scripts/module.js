import { calculateConeAngle, resolveMaximumWidth, yardsToSceneUnits } from './math.js';

const MODULE_ID = 'gga-gurps-cones';
const SETTINGS = Object.freeze({
  RANGE: 'lastMaximumRange',
  WIDTH: 'lastMaximumWidth',
  UNSPECIFIED: 'lastWidthUnspecified',
});

let coneDialogOpen = false;

Hooks.once('init', () => {
  registerSettings();

  const module = game.modules.get(MODULE_ID);
  if (module) {
    module.api = Object.freeze({
      calculateConeAngle,
      openConeDialog,
    });
  }
});

Hooks.on('getSceneControlButtons', (controls) => {
  const regions = controls.regions;
  if (!regions?.tools) return;

  regions.tools.gurpsCone = {
    name: 'gurpsCone',
    title: 'GGA_GURPS_CONES.Controls.Create',
    icon: 'fa-solid fa-bullhorn',
    order: nextToolOrder(regions.tools),
    button: true,
    visible: true,
    onChange: () => void openConeDialog(),
  };
});

function registerSettings() {
  game.settings.register(MODULE_ID, SETTINGS.RANGE, {
    scope: 'client',
    config: false,
    type: Number,
    default: 10,
  });

  game.settings.register(MODULE_ID, SETTINGS.WIDTH, {
    scope: 'client',
    config: false,
    type: Number,
    default: 5,
  });

  game.settings.register(MODULE_ID, SETTINGS.UNSPECIFIED, {
    scope: 'client',
    config: false,
    type: Boolean,
    default: false,
  });
}

async function openConeDialog() {
  if (coneDialogOpen) return;
  if (!canvas?.ready || !canvas.scene || !canvas.regions) {
    ui.notifications.warn(localise('Warnings.NoScene'));
    return;
  }
  if (game.paused && !game.user.isGM) {
    ui.notifications.warn(localise('Warnings.Paused'));
    return;
  }

  coneDialogOpen = true;
  try {
    const result = await foundry.applications.api.DialogV2.input({
      window: {
        title: localise('Dialog.Title'),
        icon: 'fa-solid fa-bullhorn',
      },
      position: { width: 430 },
      classes: ['gga-gurps-cone-dialog'],
      content: buildDialogContent(),
      ok: {
        label: localise('Dialog.Place'),
        icon: 'fa-solid fa-location-dot',
      },
      render: updateDialogPreview,
    });

    if (!result) return;

    const maximumRangeYards = Number(result.maximumRange);
    const enteredMaximumWidthYards = Number(result.maximumWidth);
    const widthUnspecified = Boolean(result.widthUnspecified);
    const maximumWidthYards = resolveMaximumWidth(
      maximumRangeYards,
      enteredMaximumWidthYards,
      widthUnspecified,
    );
    const angle = calculateConeAngle(maximumRangeYards, maximumWidthYards);

    await rememberInputs(maximumRangeYards, enteredMaximumWidthYards, widthUnspecified);
    await placeConeRegion({
      maximumRangeYards,
      maximumWidthYards,
      widthUnspecified,
      angle,
    });
  } catch (error) {
    console.error(`${MODULE_ID} | Failed to create a GURPS cone Region.`, error);
    ui.notifications.error(localise('Errors.CreationFailed'));
  } finally {
    coneDialogOpen = false;
  }
}

function buildDialogContent() {
  const maximumRange = Number(game.settings.get(MODULE_ID, SETTINGS.RANGE)) || 10;
  const maximumWidth = Number(game.settings.get(MODULE_ID, SETTINGS.WIDTH)) || 5;
  const widthUnspecified = Boolean(game.settings.get(MODULE_ID, SETTINGS.UNSPECIFIED));
  const sceneUnit = canvas.scene.grid.units || localise('Dialog.SceneUnitsFallback');

  return `
    <div class="gga-gurps-cone-form">
      <p class="hint">${localise('Dialog.Introduction')}</p>

      <div class="form-group">
        <label>${localise('Dialog.MaximumRange')}</label>
        <div class="form-fields">
          <input name="maximumRange" type="number" min="0.01" step="any" value="${maximumRange}" required autofocus>
          <span class="units">${localise('Dialog.Yards')}</span>
        </div>
      </div>

      <div class="form-group">
        <label>${localise('Dialog.MaximumWidth')}</label>
        <div class="form-fields">
          <input name="maximumWidth" type="number" min="0.01" step="any" value="${maximumWidth}" required>
          <span class="units">${localise('Dialog.Yards')}</span>
        </div>
      </div>

      <div class="form-group stacked">
        <label class="checkbox">
          <input name="widthUnspecified" type="checkbox" ${widthUnspecified ? 'checked' : ''}>
          ${localise('Dialog.WidthUnspecified')}
        </label>
        <p class="hint">${localise('Dialog.WidthUnspecifiedHint')}</p>
      </div>

      <div class="gga-gurps-cone-result" aria-live="polite">
        <span>${localise('Dialog.CalculatedAngle')}</span>
        <output data-role="calculated-angle">—</output>
      </div>

      <p class="hint">${format('Dialog.SceneUnitHint', { unit: sceneUnit })}</p>
      <p class="hint">${localise('Dialog.CoverageHint')}</p>
    </div>
  `;
}

function updateDialogPreview(_event, dialog) {
  const root = dialog.element instanceof HTMLElement ? dialog.element : dialog.element?.[0];
  if (!root) return;

  const maximumRange = root.querySelector('[name="maximumRange"]');
  const maximumWidth = root.querySelector('[name="maximumWidth"]');
  const widthUnspecified = root.querySelector('[name="widthUnspecified"]');
  const output = root.querySelector('[data-role="calculated-angle"]');
  if (!maximumRange || !maximumWidth || !widthUnspecified || !output) return;

  const update = () => {
    maximumWidth.readOnly = widthUnspecified.checked;

    const range = Number(maximumRange.value);
    const enteredWidth = Number(maximumWidth.value);
    try {
      const width = resolveMaximumWidth(range, enteredWidth, widthUnspecified.checked);
      output.textContent = `${formatAngle(calculateConeAngle(range, width))}°`;
    } catch (_error) {
      output.textContent = '—';
    }
  };

  root.addEventListener('input', update);
  update();
}

async function rememberInputs(maximumRangeYards, maximumWidthYards, widthUnspecified) {
  await Promise.all([
    game.settings.set(MODULE_ID, SETTINGS.RANGE, maximumRangeYards),
    game.settings.set(MODULE_ID, SETTINGS.WIDTH, maximumWidthYards),
    game.settings.set(MODULE_ID, SETTINGS.UNSPECIFIED, widthUnspecified),
  ]);
}

async function placeConeRegion({ maximumRangeYards, maximumWidthYards, widthUnspecified, angle }) {
  const sceneUnit = canvas.scene.grid.units;
  const convertedRange = yardsToSceneUnits(maximumRangeYards, sceneUnit);
  const radius = convertedRange.value * pixelsPerSceneUnit();

  if (!convertedRange.recognised) {
    ui.notifications.warn(
      format('Warnings.UnknownUnits', {
        unit: sceneUnit || localise('Dialog.SceneUnitsFallback'),
      }),
    );
  }

  const regionData = {
    name: buildRegionName(maximumRangeYards, maximumWidthYards, widthUnspecified),
    shapes: [
      {
        type: 'cone',
        x: 0,
        y: 0,
        radius,
        angle,
        rotation: 0,
        gridBased: true,
      },
    ],
    color: game.user.color,
    restriction: {
      enabled: true,
      type: 'move',
    },
    highlightMode: 'coverage',
    displayMeasurements: true,
    visibility: CONST.REGION_VISIBILITY.OBSERVER,
    ownership: {
      default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER,
      [game.user.id]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER,
    },
    flags: {
      [MODULE_ID]: {
        maximumRangeYards,
        maximumWidthYards,
        widthUnspecified,
        calculatedAngle: angle,
      },
    },
  };

  if (canvas.level?.id) regionData.levels = [canvas.level.id];

  ui.notifications.info(localise('Placement.Instructions'));
  await canvas.regions.placeRegion(regionData, { allowRotation: true });
}

function pixelsPerSceneUnit() {
  const distancePixels = Number(canvas.dimensions?.distancePixels);
  if (Number.isFinite(distancePixels) && distancePixels > 0) return distancePixels;

  const gridSize = Number(canvas.scene.grid.size);
  const gridDistance = Number(canvas.scene.grid.distance);
  if (
    Number.isFinite(gridSize) &&
    gridSize > 0 &&
    Number.isFinite(gridDistance) &&
    gridDistance > 0
  ) {
    return gridSize / gridDistance;
  }

  throw new Error('The current Scene has no usable distance scale.');
}

function buildRegionName(maximumRangeYards, maximumWidthYards, widthUnspecified) {
  if (widthUnspecified) {
    return format('Region.NameUnspecified', { range: formatNumber(maximumRangeYards) });
  }

  return format('Region.NameSpecified', {
    range: formatNumber(maximumRangeYards),
    width: formatNumber(maximumWidthYards),
  });
}

function nextToolOrder(tools) {
  return Math.max(0, ...Object.values(tools).map((tool) => Number(tool.order) || 0)) + 1;
}

function formatAngle(angle) {
  return new Intl.NumberFormat(game.i18n.lang, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(angle);
}

function formatNumber(number) {
  return new Intl.NumberFormat(game.i18n.lang, {
    maximumFractionDigits: 2,
  }).format(number);
}

function localise(key) {
  return game.i18n.localize(`GGA_GURPS_CONES.${key}`);
}

function format(key, data) {
  return game.i18n.format(`GGA_GURPS_CONES.${key}`, data);
}

export { openConeDialog };
