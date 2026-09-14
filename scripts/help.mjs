import { createHelpController, helpResolver } from './tooltip-engine.mjs';
export const helpConfig = {
  id: 'gga-gurps-cones',
  scope:
    '.gga-gurps-cone-dialog, .gga-gurps-cone-form, [data-tool="gurpsCone"], [name^="gga-gurps-cones."], [data-key^="gga-gurps-cones."], [data-tool="gga-gurps-cones"], [data-control="gga-gurps-cones"]',
  actions: {},
  fields: {
    maximumRange:
      'Maximum cone range in yards. The module converts this to the scene’s distance units.',
    maximumWidth: 'Maximum cone width in yards at its maximum range.',
    widthUnspecified:
      'Use the default spread when no maximum width is specified. The stored width field is ignored while ticked.',
  },
  rules: [
    [
      '[data-action="ok"]',
      'Start cone placement: move the pointer, rotate with the wheel, and click to place. Escape or right-click cancels.',
    ],
    [
      '[data-tool="gurpsCone"]',
      'Enter a GURPS cone’s range and width, then place a native Foundry Region.',
    ],
  ],
  actionAttributes: ['data-action'],
};
let resolve = helpResolver(helpConfig);

export const helpController = createHelpController({ ...helpConfig, resolve });
if (globalThis.Hooks) {
  Hooks.once('init', () => helpController.register());
  Hooks.once('ready', () => helpController.start());
}
