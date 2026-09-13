# Testing

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
