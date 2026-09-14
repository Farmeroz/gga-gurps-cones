# GGA: GURPS Cone Regions

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
