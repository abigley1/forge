# Historical v1 slicing validation — 2026-10-15

Seven independent slices passed using Bambu Studio 2.8.2.61, Direct Drive Standard, official P2S 0.4 mm machine settings, Textured PEI, and an independent 20 × 20 × 10 mm cube (12 triangles, 50 layers). Each run returned code 0 / Success. An isolated `--datadir` prevented CLI use of the normal settings directory. No GUI project or printer was opened or controlled.

| Filament | Slice / exit | Estimated main grams | Estimated total minutes |
|---|---|---:|---:|
| ELEGOO PETG-CF Black | Pass / 0 | 2.439 | 16.62 |
| ELEGOO Rapid TPU95A Black | Pass / 0 | 2.067 | 19.48 |
| CC3D TPU72D Black | Pass / 0 | 2.547 | 21.61 |
| Fiberon PET-GF15 Blue | Pass / 0 | 2.761 | 15.58 |
| Fiberon PA6-GF25 Grey | Pass / 0 | 2.342 | 15.72 |
| Fiberon ASA-CF08 Navy Blue | Pass / 0 | 2.127 | 19.10 |
| ELEGOO ABS Blue ORDER-MATCH | Pass / 0 | 2.146 | 15.58 |

Estimates are diagnostics for this small cube, not measured consumption, throughput ratings or printed results. Process/filament differences mean these times are not a fair material-speed benchmark.

JSON parsing, all parent resolution, 10 unique names/no user-name collisions, ZIP CRC, and profile bundle member count passed. Exported effective settings and generated diagnostic G-code confirmed the requested nozzle/bed temperatures, volumetric cap, flow ratio, fans, layers, walls and infill. Bambu uses integer vitrification values; explicit rounded control values were verified. SHA-256 hashes of every user-preset file remained byte-identical before/after. Bundle hash is in `package-check.json`.

Each case retains `command-result.json`, `run.log`, `result.json`, effective settings and resolved input settings. `slice-summary.json` records hashes and inspected settings from generated diagnostic G-code, which was then removed. No printable G-code is delivered. Machine start/end G-code and filament start logic were preserved from local official presets.

The logs contain the existing stock-machine `Invalid T command (T65535)` diagnostic. The literal is in official P2S end G-code, all runs continue to Success, and prior task-2 stock/control tests reproduced it in successful slices. No code was changed to hide it. The earlier task-2 thumbnail/3MF-export macOS abort was avoided by using the successful slice-only path; GUI import/export was not validated here.

At this original validation stage, GUI import and physical nozzle were unverified. The later v2 native import succeeded and the user confirmed the stock 0.4 mm nozzle. Selected live plate, live firmware cooling behavior, actual AMS/dryer model and physical calibration remain unverified. This is a complete importable starting package with independent slicer evidence, not a claim of calibrated printing or rated part strength. Source pages and release-dependent parent behavior can change; recheck after updates.

## Studio 2.4 compatibility update — 2026-10-15

Use **Forge-P2S-START-v2-Studio24.bbscfg**, or the ten JSON files in **profiles-studio24/**. All seven filament and three process presets were imported into the installed Bambu Studio **2.4.0.70**. Its dialog confirmed **10 configs imported**, and all ten saved JSON files were verified. Names contain **Forge START 2026-10-15 v2 Studio24**.

The original v1 overlays used three extruder variants from Studio 2.8 (Standard, High Flow, E3D High Flow). The running 2.4 app supports two. Importing v1 failed with `ConfigOptionVector::set_with_nil(): rhs size different with inherits size`, leaving partial names in memory. Do not use those v1 entries in Studio 2.4; they were left untouched while the user prepared to print. The corrected version keeps Standard and High Flow, removes the unsupported third variant and the unrecognized display-only `filament_colour` key, and uses new names. Intended temperatures, flow caps, ratios, cooling, speeds and shell/infill settings are unchanged. Parent profiles remain official; no machine G-code is added.

Selector visibility was **not visually verified** because native main-window control failed. Import success and saved-file existence are verified. No restart, project replacement, print or calibration was performed. The user confirmed the **stock 0.4 mm nozzle**; this is user confirmation, not independent physical inspection. Filled materials still require hardened steel. These remain **uncalibrated starting presets**.

The seven recorded CLI slices are historical **v1 / Studio 2.8.2.61** results. The v2 change was checked for settings equivalence and successful native import; those historical slices are not relabeled as v2/2.4 slicing tests.
