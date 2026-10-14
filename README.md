# GGA: GURPS Cone Regions — areas test build 0.2.0-rc1

This Foundry VTT module creates native cone Regions from the two values used by GURPS: maximum range and maximum width. It calculates the required Foundry angle, converts the range to the Scene's distance unit, and starts Foundry's normal Region placement workflow.

## Requirements

- Foundry Virtual Tabletop v14
- GURPS Game Aid (GGA) v0.18 or later

## Install or update

From Foundry's **Setup** screen, open **Add-on Modules**, paste the following address into **Manifest URL**, and select **Install**:

```text
https://github.com/Farmeroz/gga-gurps-cones/releases/latest/download/module.json
```

Open your GURPS world and enable **GGA: GURPS Cone Regions** in **Manage Modules**. For a manual installation, download the versioned ZIP from [GitHub Releases](https://github.com/Farmeroz/gga-gurps-cones/releases) and extract its `gga-gurps-cones` folder into `Data/modules/`.

## Circular areas and Manual Damage

Region Controls now has **Create GURPS area / blast** and **Send area to Manual Damage**, alongside the existing cone tool.

1. Create a cone as usual, or choose **Create GURPS area / blast**. Choose **Uniform AoE — no falloff** or **Explosion — distance falloff**, enter radius in yards, and place the circle.
2. Move or edit the Region normally, then choose **Send area to Manual Damage**. Select the Region and, for an elevated blast, expand **Elevation and coverage** to set centre height in scene units (default 0).
3. Review the suggested recipients in Manual Damage, enter fixed damage or dice, **Prepare damage**, then **Review in ADD**. No token is damaged by placement or handoff.

Requires Manual Damage **0.4.0-rc1** or later for handoff. The existing cone placement remains usable without Manual Damage. The module ID remains unchanged.

Foundry's Region membership supplies the candidate tokens, using its covered token spaces and Region restrictions. This handles large tokens using Foundry's membership rules; it is not a promise that every visual sliver of overlap counts. Hidden tokens are not exposed to players. Manual Damage enforces GM/ownership permissions and linked-actor deduplication. Review partial overlap, cover, line of effect and dodge-and-drop; walls do not automatically remove recipients.

Uniform AoE and cones have no falloff. Explosions use GURPS 4e B414 falloff in Manual Damage. For dice, the B414 collateral radius is 2 × dice × multiplier; choose a marker large enough to include that radius. A smaller marker can omit candidates, so add selected tokens or correct the Region before preparing damage. Fixed damage needs an explicit blast radius in Manual Damage. Special Dissipation, internal/contact explosions and enhanced falloff are not automated.

The handoff uses a snapshot. Moving the Region or tokens requires an explicit **Refresh template** in Manual Damage, discarding any prepared results first. Manual changes are not silently overwritten.

Test manifest: https://github.com/Farmeroz/gga-gurps-cones/releases/download/v0.2.0-rc1/module.json

## Use

1. Open **Region Controls** in the Scene controls.
2. Select **Create GURPS Cone** (the bullhorn button).
3. Enter the maximum range and maximum width in yards. If GURPS gives no maximum width, select **Maximum width is unspecified**.
4. Select **Place Cone**.
5. Move the pointer to the cone's origin, rotate it with the mouse wheel, and left-click to place it. Right-click or press Escape to cancel.

The created Region uses **Covered Grid Spaces**, displays its measurements, uses the creator's colour, and gives its creator Owner permission. Other users receive Observer permission. A placed cone remains a normal Foundry Region that can be selected, moved, rotated, or edited with the standard Region controls.

Players may create cones, but Foundry does not permit a non-GM to place Regions while the game is paused.

## Calculation

The full cone angle is:

`angle = 2 × atan(maximum width ÷ (2 × maximum range))`

The result is converted from radians to degrees. When maximum width is unspecified, the effective maximum width equals the maximum range, matching the GURPS default spread of one yard per yard of range.

Rule reference: _GURPS Basic Set: Campaigns_, p. 413.

## Support and licence

Report problems through [GitHub Issues](https://github.com/Farmeroz/gga-gurps-cones/issues). Released under the [MIT licence](LICENSE).

GURPS is a trademark of Steve Jackson Games. This unofficial module is not affiliated with or endorsed by Steve Jackson Games, Foundry Gaming LLC, or the GURPS Game Aid maintainers.

## Help tooltips

Hover over a control or focus it with the keyboard for a short explanation. Press Escape to dismiss the help. Under **Configure Settings → Module Settings → GGA: GURPS Cone Regions**, turn off **Show help tooltips** to hide optional help on your client. Labels, settings descriptions, and important notices remain visible. Other users keep their own preference.
