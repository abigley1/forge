# Profile basis and deliberate decisions

All seven profiles inherit installed official P2S machine-specific filament parents. In v2 Studio24, conservative values are repeated for the two supported extruder variants (Standard and High Flow), with no higher throughput inferred for high-flow variants. Validation uses Direct Drive Standard; actual hardware must match. No machine preset, pressure-advance/K calibration, firmware or device setting is changed.

| Material | Source versus authored decision |
|---|---|
| ELEGOO PETG-CF | Preserve the previous validated starting nozzle/bed/flow **255/70/8**, flow ratio 0.95, fan20–40%, bridge80%, aux0 and drying60°C8h. New name avoids collisions. The previous preset and files remain intact. Density1.25 is generic, not measured. |
| Rapid TPU95A | Exact ELEGOO Rapid TPU preset uses230°C. Its inherited TPU family supplies35°Cbed and full part cooling; the local P2S TPU parent supplies short0.4mm retraction. Use230/35/Q3, flow1.0, partfan100% after first layer, aux0. Do not transfer Centauri's Q12 or pressure advance0.1 to a P2S. |
| CC3D TPU72D | Brand listing describes TPU/nylon composite,230–240°C nozzle,60°Cbed,20–40mm/s and60–65°C6h drying. Choose235/60/Q3 and process extrusion≤35mm/s. Cooling20–40%, bridge60%, short P2S TPU retraction and flow1.0 are provisional engineering choices; density1.24 is a generic estimate. No formulation-specific Tg/HDT is invented. |
| PET-GF15 | Source P2S preset says270°C despite its own280°C minimum. Use290°C within TDS280–310 but cap range at printer300°C. Bed80°C, fanOFF and chamber0 (no requested heat) follow TDS70–80/room temperature. Preserve source flow ratio0.94 and Q8 as starts; Tg corrected232.6→59.5°C. `PET-CF` remains Polymaker's Bambu slicer type alias; the material identity is PET-GF15 and inventory is never relabeled CF. |
| PA6-GF25 | Source uses280°C/Q12/chamber60/fan0–10. Use290°C/Q6,50°Cbed, fanOFF and chamber0 to follow the room-temperature product guidance. Source flow ratio0.95 retained as an estimate; hardened HRC40 requirement retained. |
| ASA-CF08 | Source270/100/Q16, flow0.79, fan10–30 and HRC3 are not copied blindly. Use270/100/Q8, provisional flow0.95, fanOFF per product/TDS, HRC40 for wear-resistant nozzle. Correct Tg110.8→106.6°C. Chamber50 is an unheated-enclosure management request, not a claim the P2S has an active heater. |
| ABS | Order identifies ELEGOO Blue, but physical450g spool identity is not established. Supply an explicitly `ORDER-MATCH` conservative start260/100/Q8, flow0.95, fan0–20%, bridge50%, aux0. Manufacturer Centauri preset270°C/Q18 is source evidence, not P2S calibration; Bambu generic's unmodified270°C/Q15 was reduced. Density1.10 follows ELEGOO source. Exact drying instruction remains unresolved. |

All three Fiberons have bridge cooling disabled initially, consistent with manufacturer fanOFF guidance; bridging performance must be checked in the part. No universal strength claim follows from less cooling.

Bambu's vitrification field is integer-valued. The authored control values are rounded to PET-GF15 60°C, PA6-GF25 70°C and ASA-CF08 107°C; the reference retains the actual TDS values 59.5/70.4/106.6°C. Other material control values inherit their generic parent and are not claimed measured Tg values for these brands.

## P2S cooling workaround review

The current Polymaker downloader documents a temporary workaround for [Bambu Studio issue8801](https://github.com/bambulab/BambuStudio/issues/8801). All three downloaded Fiberon files inject the same commands: force `M145 P0`, burst auxiliary/chamber fans, wait via `M191 S0`, then a PETG exhaust-control command. The ASA preset simultaneously requests60°C chamber, so copying that block would undermine the enclosed warm-process intent. The local newer P2S machine start logic also includes conditional handling for alternative fan hardware that the older pasted block lacks.

**Decision: retain the installed P2S stock machine and filament start/end G-code without injecting that workaround or falsifying Tg.** For PET-GF15 and PA6-GF25 the profile requests no chamber heat; follow room-temperature chamber guidance with ventilation/open enclosure as appropriate and verify actual chamber behavior during the first supervised trial. A numeric chamber0 setting is not proof of ambient air. The stock P2S logic uses both chamber request and vitrification temperature to choose airduct behavior; aux0 in filament settings is not a guarantee that every machine-managed fan is physically off. If heat creep/cooling problems remain, investigate current firmware/profile guidance before saving a dedicated tested change. For ASA/ABS preserve enclosure management and room ventilation. No arbitrary heating or printer commands were sent.

This is an explicit limitation of the starts. Neither slicing nor selecting fan values establishes live firmware behavior. Source G-code is retained for inspection in `sources/`, but only `profiles-studio24/` belongs in the current import bundle.

## Portability

The bundle imports user overlays with local official parents, not cloned printer presets. Dependencies: Generic PETG-CF, Generic TPU, Bambu PET-CF, Generic PA-CF, Bambu ASA-CF0.4, Generic ABS, and0.20mmStandard for P2S. This keeps the actual machine safety/start logic under the official installed pack. Source snapshots and resolved validation settings record the tested version; future pack updates may change inherited behavior. Check the preview again after updating Studio.

The published source presets contain other unverified fields (costs, automated drying metadata, geometry compensation and safety-property flags). These were not imported wholesale into the custom overlays. Inherited slicer metadata is not manufacturer evidence; consult MATERIALS.md for drying and property claims. None of the presets remotely starts drying or a print.

## Studio 2.4 compatibility update — 2026-10-15

Use **Forge-P2S-START-v2-Studio24.bbscfg**, or the ten JSON files in **profiles-studio24/**. All seven filament and three process presets were imported into the installed Bambu Studio **2.4.0.70**. Its dialog confirmed **10 configs imported**, and all ten saved JSON files were verified. Names contain **Forge START 2026-10-15 v2 Studio24**.

The original v1 overlays used three extruder variants from Studio 2.8 (Standard, High Flow, E3D High Flow). The running 2.4 app supports two. Importing v1 failed with `ConfigOptionVector::set_with_nil(): rhs size different with inherits size`, leaving partial names in memory. Do not use those v1 entries in Studio 2.4; they were left untouched while the user prepared to print. The corrected version keeps Standard and High Flow, removes the unsupported third variant and the unrecognized display-only `filament_colour` key, and uses new names. Intended temperatures, flow caps, ratios, cooling, speeds and shell/infill settings are unchanged. Parent profiles remain official; no machine G-code is added.

Selector visibility was **not visually verified** because native main-window control failed. Import success and saved-file existence are verified. No restart, project replacement, print or calibration was performed. The user confirmed the **stock 0.4 mm nozzle**; this is user confirmation, not independent physical inspection. Filled materials still require hardened steel. These remain **uncalibrated starting presets**.

The seven recorded CLI slices are historical **v1 / Studio 2.8.2.61** results. The v2 change was checked for settings equivalence and successful native import; those historical slices are not relabeled as v2/2.4 slicing tests.

The three process presets are optional examples; the user prefers their own process settings with the material profiles. SUNLU PLA+ 2.0 Black (approximately 400 g) is an inventory-only addition with no new preset.
