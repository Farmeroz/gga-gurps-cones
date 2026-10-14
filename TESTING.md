# Testing

## Saved-shape checks

Automated tests exercise current edited geometry, yards/feet/metres conversion, fresh placement without old scene state, cone/circle mode roundtrips, permissions, cancellation, unsupported shapes/units and generated macro replay. Foundry placement and Macro documents are mocked.

Live check: save during cone creation and from an existing edited circle; drag the macros to the hotbar. Reuse on a differently scaled scene and confirm physical size, rotation/placement and cancellation. Check the current level and user ownership, and that old Region behaviours are not copied. Send the placed shape to Manual Damage and load a saved area-damage profile; review recipients, radius and distances before preparing. Test with a connected player who can create/use script macros and another without that permission. These connected-world results still require live verification.

Start with the setup commands in [CONTRIBUTING.md](CONTRIBUTING.md).

## Automated coverage

New regression tests cover cone angles, fractional dimensions, unit conversion, invalid inputs, the region toolbar, placement data and scene scaling, cancelled/concurrent dialogues, paused-player restrictions, and preview updates. Region placement and dialogue services are mocked.

The suite exercises these behaviours but does not claim complete coverage or reproduce a connected Foundry world. All automated cases should run; the standard test command treats skipped Node tests as a failure. Test output is saved under `test-output/`.

## Source fixtures

No external source download is needed. Setup confirms that the suite uses its local fixtures or mocks.

## Live check

Create a specified-width cone and an unspecified-width cone. Place, rotate, and cancel placement. Check a scene using your usual grid units.

Use your normal Foundry/GGA versions and module combination, and refresh connected clients after updating. Record unexpected notifications, visibility changes, or changed resource totals, together with the module versions and steps to reproduce them.

## Package verification

The build checks module/package versions, install URLs, declared assets, local imports, the allowed archive file list, and every archived file's bytes. The release ZIP contains only runtime files, the licence, and user documentation.
