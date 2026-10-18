# Native import and compatibility

## Studio 2.4 compatibility update — 2026-10-15

Use **Forge-P2S-START-v2-Studio24.bbscfg**, or the ten JSON files in **profiles-studio24/**. All seven filament and three process presets were imported into the installed Bambu Studio **2.4.0.70**. Its dialog confirmed **10 configs imported**, and all ten saved JSON files were verified. Names contain **Forge START 2026-10-15 v2 Studio24**.

The original v1 overlays used three extruder variants from Studio 2.8 (Standard, High Flow, E3D High Flow). The running 2.4 app supports two. Importing v1 failed with `ConfigOptionVector::set_with_nil(): rhs size different with inherits size`, leaving partial names in memory. Do not use those v1 entries in Studio 2.4; they were left untouched while the user prepared to print. The corrected version keeps Standard and High Flow, removes the unsupported third variant and the unrecognized display-only `filament_colour` key, and uses new names. Intended temperatures, flow caps, ratios, cooling, speeds and shell/infill settings are unchanged. Parent profiles remain official; no machine G-code is added.

Selector visibility was **not visually verified** because native main-window control failed. Import success and saved-file existence are verified. No restart, project replacement, print or calibration was performed. The user confirmed the **stock 0.4 mm nozzle**; this is user confirmation, not independent physical inspection. Filled materials still require hardened steel. These remain **uncalibrated starting presets**.

The seven recorded CLI slices are historical **v1 / Studio 2.8.2.61** results. The v2 change was checked for settings equivalence and successful native import; those historical slices are not relabeled as v2/2.4 slicing tests.

The three process presets are optional examples; the user prefers their own process settings with the material profiles. SUNLU PLA+ 2.0 Black (approximately 400 g) is an inventory-only addition with no new preset.
