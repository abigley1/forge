# P2S owned materials — Studio 2.4 compatible kit

**Current delivery: v2 Studio24.** Seven filament and three process presets have been imported and saved in the installed Bambu Studio 2.4.0.70. Use names containing **Forge START 2026-10-15 v2 Studio24**. No physical calibration is claimed.

- [Material inventory and design reference](MATERIALS.md)
- [Compatibility and native-import status](COMPATIBILITY.md)
- [Settings and source decisions](PROFILE-DECISIONS.md)
- [Sources and identity evidence](SOURCES.md)
- [Validation evidence](validation/RESULTS.md)
- [Machine-readable inventory](inventory.json)

## Reimport on Studio 2.4 only if needed

The current Mac already has all ten v2 presets. Save any open project before a future import. Use **File → Import → Import Configs** and select **Forge-P2S-START-v2-Studio24.bbscfg**. Alternatively select all ten JSON files in **profiles-studio24/**. Do not import manufacturer sources or validation JSON. Preserve existing settings if an overwrite prompt appears. No restart was needed for the successful import.

Select **Bambu Lab P2S 0.4 nozzle**, normally **Direct Drive Standard**, then the exact filament. **The three supplied process presets are optional examples. Andrew prefers his own process settings and can use them with these filament profiles.** Review the chosen process for material-appropriate geometry and speeds. The user confirmed the stock 0.4 mm nozzle; this was not independently inspected. Filled materials require hardened steel. No 0.2 mm filled-material presets are supplied; moving to 0.6 mm requires matching profiles.

| Filament name prefix | Optional example process name prefix | Nozzle / bed °C | Flow cap mm³/s |
|---|---|---:|---:|
| ELEGOO PETG-CF Black | 0.20mm Rigid | 255 / 70 | 8 |
| ELEGOO Rapid TPU95A Black | 0.20mm Flexible 95A | 230 / 35 | 3 |
| CC3D TPU72D Black | 0.20mm CC3D 72D | 235 / 60 | 3 |
| Fiberon PET-GF15 Blue | 0.20mm Rigid | 290 / 80 | 8 |
| Fiberon PA6-GF25 Grey | 0.20mm Rigid | 290 / 50 | 6 |
| Fiberon ASA-CF08 Navy Blue | 0.20mm Rigid | 270 / 100 | 8 |
| ELEGOO ABS Blue ORDER-MATCH | 0.20mm Rigid | 260 / 100 | 8 |

All temperatures apply to first and subsequent layers. `ORDER-MATCH` means the remaining 450 g ABS spool must still be matched to the ELEGOO Blue purchase. The CC3D 72D profile is distinct from soft TPU95A.

Use your actual plate. Textured PEI, smooth/high-temperature PEI and Engineering temperatures are configured. Cool Plate and SuperTack are unsupported (0); do not select them. Follow plate adhesive/release instructions. Start with low-drag external feeding; these profiles do not establish AMS approval for TPU or third-party filled materials.

Preview temperatures, plate, cooling and flow cap before use. Flow ratio/dynamics and bonding remain uncalibrated. The rigid/72D processes use 3 walls, 20% gyroid, 5 top/4 bottom layers; soft TPU uses 2 walls and 15% gyroid, all at 0.20 mm. Support is off until geometry requires it. These recipes do not establish a structural load rating. Costs are zero/unknown; generic density estimates can affect predicted grams.

The original v1 bundle is deliberately excluded from this corrected distribution. See COMPATIBILITY.md for the failed 2.4 import and partial-entry limitation. Historical v1 CLI validation remains clearly labeled as evidence from Studio 2.8, not a v2 slicing claim.

Inventory now includes **SUNLU PLA+ 2.0 Black, approximately 400 g**. This is a reference-only addition: no eighth filament preset or additional process was created.
