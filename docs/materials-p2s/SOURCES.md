# Sources and identity evidence

Checked2026-10-15. Distinguish manufacturer formulation data, manufacturer slicer presets, local software configuration, authenticated purchase identities, and our uncalibrated engineering choices.

## Identity only — Amazon read-only order search

| Material | ASIN / product | Ordered | Evidence |
|---|---|---|---|
| ELEGOO PETG-CF Black1kg | [B0F37YCK6K](https://www.amazon.com/dp/B0F37YCK6K) |2026-10-12|Exact order item, also previously verified in task2|
| ELEGOO Rapid TPU95A Black1kg | [B0F37YWDZS](https://www.amazon.com/dp/B0F37YWDZS) |2026-01-23|Exact order item|
| CC3D TPU72D Black1kg | [B0CFXZR974](https://www.amazon.com/dp/B0CFXZR974) |2026-01-25|Exact72D order search result|
| Fiberon PET-GF15 Blue1kg | [B0FBWGFGR6](https://www.amazon.com/dp/B0FBWGFGR6) |2026-02-05|Exact order item|
| Fiberon PA6-GF25 Grey0.5kg | [B0D4Q464VB](https://www.amazon.com/dp/B0D4Q464VB) |2026-02-05|Order text also uses former PA6-GF name|
| Fiberon ASA-CF08 Navy Blue0.5kg | [B0F741PB6S](https://www.amazon.com/dp/B0F741PB6S) |2026-02-05|Exact order item|
| ELEGOO ABS Blue1kg | [B0F37X21DJ](https://www.amazon.com/dp/B0F37X21DJ) |2026-01-23|Only actual ABS item found across two pages of ABS-filament order results; physical450g spool match remains conditional|

No order IDs, addresses, payment details or credentials are retained. Original purchased masses in this table are **not remaining inventory**. Other purchases were not added to owned stock without a remaining-stock report.

CC3D's brand product description on its exact listing was read directly: TPU/nylon composite,230–240°C nozzle,60°C glued bed,30–40mm/s (bullets20–40),60–65°C6h drying, dry during printing, and not suitable for remote feeding. Its retraction-distance unit is malformed (`mm/s`); that line was not adopted. These are brand-listing instructions, not a verified laboratory TDS. No customer-review recipe was used as manufacturer evidence.

## Manufacturer material documentation

- [ELEGOO PETG-CF product](https://us.elegoo.com/products/petg-cf-filament-1-75mm-colored-1kg):240–270°C,65–75°C, wear-resistant0.4mm minimum; conflicting60/70°C drying text preserved.
- [ELEGOO general filament guide](https://wiki.elegoo.com/en/filaments/guide-to-fdm-printing-filament): contextual PETG drying guidance, not a substitute for exact-spool instructions.
- [Rapid TPU product](https://us.elegoo.com/products/rapid-tpu-filament-1-75mm-colored-1kg) and [Rapid TPU manufacturer article](https://www.elegoo.com/blogs/3d-printer-user-guide/revolutionizing-flexible-printing-rapid-tpu-in-fdm-technology): exact material, storage/drying. Apparent standard/Rapid speed-row inconsistencies are not used to choose P2S throughput.
- [ELEGOO ABS product](https://us.elegoo.com/products/abs-filament-1-75mm-colored-1kg): impact/heat-positioning and enclosed-printer use; no certified continuous-load rating inferred.
- [PET-GF15 TDS V1.0](https://fiberon.polymaker.com/wp-content/uploads/TDS_FIBERON-PET-GF15_V1.0_EN.pdf) and [product](https://shop.polymaker.com/products/fiberon-pet-gf15): density, printing/drying, as-printed versus annealed values.
- [PA6-GF25 TDS V1.1](https://fiberon.polymaker.com/wp-content/uploads/TDS_FIBERON-PA6-GF25_V1.1_EN.pdf) and [product](https://shop.polymaker.com/products/fiberon-pa6-gf25): density, moisture/annealing conditions, room-temperature chamber and hardened0.4mm+ requirement.
- [ASA-CF08 TDS V1.0](https://fiberon.polymaker.com/wp-content/uploads/TDS_FIBERON-ASA-CF08_V1.0_EN.pdf) and [product](https://shop.polymaker.com/products/fiberon-asa-cf08): UV/weather use, printing/drying, brittleness and >60mm bend diameter.

The linked TDS documents are the authoritative originals. Direct local PDF download returned HTTP403; no successful offline PDF download is claimed. The product and TDS research was read through the web tool and supplied manufacturer research.

## Profile sources retained locally

- [Polymaker preset downloader](https://presets.polymaker.com/) / [official repository](https://github.com/Polymaker3D/Polymaker-Preset). Exact downloaded Fiberon files are pinned to commit **a58ac3ae9e93656fd7b4263667497fd4ee756bc5** and retained in `sources/`. Downloader HTML/app code and repository tree are audit evidence. It documents full-printer-name rewriting, [import/restart issue10583](https://github.com/bambulab/BambuStudio/issues/10583), and the P2S cooling workaround. Custom profiles use full printer names. Do not import the source files as well as custom profiles.
- [ELEGOO Rapid TPU95A ECC2 source](https://github.com/elegooofficial/ElegooSlicer/blob/2d507e39a96ab9562b35d06b23ef5df8fe613297/resources/profiles/Elegoo/filament/ECC2/Elegoo%20Rapid%20TPU%2095A%20%40ECC2.json), ABS ECC2 and their bases are retained in `sources/`, pinned to **2d507e39a96ab9562b35d06b23ef5df8fe613297**. These establish material starting values on a different machine, not P2S pressure advance or max flow.
- Local official BBL preset pack at `~/Library/Application Support/BambuStudio/system/BBL/`. Selected configuration names P2S0.4 and `Polymaker PETG Black - Latch Test`; selected preset does not establish physical hardware. User preset names were inspected for collisions, not modified.
- Previous project: `/Users/andrewbigley/Documents/Codex/2026-10-14/task-2/elegoo-petg-cf-p2s/`, including its validated255/70/Q8 start and independent-slice diagnosis. Read before creating this package; not overwritten.

## Hardware/feed sources

- [Official P2S specs](https://bambulab.com/en/p2s/specs):300°C nozzle,110°C bed, hardened steel and0.4mm included. These are product specifications, not proof of the currently installed nozzle.
- [P2S FAQ](https://wiki.bambulab.com/en/p2s/manual/p2s-faq): machine capabilities and nozzle context.
- [Official AMS2Pro compatibility and drying specs](https://eu.store.bambulab.com/en-ch/products/ams-2-pro): exclusions for TPU/non-Bambu CF/GF;65°C dryer maximum. Cart selection of an AMS2Pro does not prove ownership or installation.
- [Bambu issue8801](https://github.com/bambulab/BambuStudio/issues/8801) plus actual local P2S start G-code: reason to inspect, document and avoid blindly transplanting the manufacturer's older cooling workaround. Live firmware behavior remains unverified.

## Local reference placement

Forge project: `/Users/andrewbigley/Projects/ProjectAccelerator`. Its existing `docs/PRINT_QUEUE.md` describes exact material/profile and notes fields, with queue status separate from physical printing. This delivery adds documentation/artifacts alongside that project; it does not migrate inventory tables, alter queue rows, launch a server, deploy, or redesign the UI.

## Later inventory addition

User reported SUNLU PLA+ 2.0 Black, approximately 400 g remaining. No order identity was inferred. [SUNLU official PLA+ 2.0 page](https://www.sunlu.com/products/pla-plus-2.0-3d-printing-filament) supports the qualitative toughness description only; no added profile or numerical property claim.
