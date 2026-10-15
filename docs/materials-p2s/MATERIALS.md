# Owned filament and practical material choices

**Profile update:** The installed Studio 2.4.0.70 successfully imported all ten **v2 Studio24** presets. Use `profiles-studio24/` or `Forge-P2S-START-v2-Studio24.bbscfg`; avoid partial v1 entries. [Compatibility and verification limits](COMPATIBILITY.md). Stock and material research below are unchanged. The user confirmed the stock 0.4 mm nozzle; physical calibration and visual selector inspection were not performed.

**Printer setup — user confirmed 2026-10-15:** Andrew has **no AMS**; every spool is fed externally. The installed nozzle is **hardened**, so it is suitable for the abrasive CF/GF filaments. His own dryer has dried **PET-GF15** with good print results. That is his report, not a measured temperature or humidity. This replaces the earlier "dryer and AMS model unconfirmed" note. The AMS 2 Pro limits below are reference only.

Stock snapshot **2026-10-15**, supplied by Andrew. Purchase history identifies products; it does not measure remaining stock. Deduct actual use, scrap and calibration material when reported. Do not silently refresh these quantities from original purchase weights.

| Owned material | Remaining stock as supplied | Planning mass | Good design candidates | Strengths | Weaknesses / decision limits |
|---|---|---:|---|---|---|
| ELEGOO PETG-CF, black | Full 1 kg | 1,000 g | Rigid indoor jigs, equipment covers, light brackets, matte visible parts | Stiffness and dimensional stability; matte finish | Abrasive; stiffness does not ensure impact toughness or Z strength; sustained-load creep and exact heat/UV ratings unverified |
| ELEGOO Rapid TPU 95A, black | Full 1 kg | 1,000 g | Feet, grips, bumpers, compliant guards | Elasticity, impact absorption, flexible fit | Stringing, difficult bridges/support removal; moisture sensitive; compression set and long-term sealing performance unqualified |
| CC3D TPU 72D, black | 650 g | 650 g | Tough clips, resilient protective shells, semi-rigid wear/contact parts | Much harder than 95A; brand describes a TPU/nylon composite and high toughness | Not a soft rubber substitute; no verified grade TDS or quantified thermal/creep data; moisture sensitive; direct feed recommended |
| Fiberon PET-GF15, blue | **180 m** | **≈619 g** | Rigid jigs, brackets and housings where low moisture uptake matters | 15% glass fiber; lower moisture uptake than PA6; stiffness and chemical resistance | **PET, not PETG**; abrasive; annealing can alter fit; as-printed heat behavior is far below annealed headline; UV lifetime not established |
| Fiberon PA6-GF25, grey | **100 m** | **≈289 g** | Tough engineering brackets, fixtures and heat-exposed prototypes after qualification | 25% glass fiber nylon; dry stiffness, toughness and useful layer bonding | Very moisture sensitive; wet stiffness and dimensions change; dry feeding and high-temperature drying; advertised thermal/mechanical tests use annealed specimens |
| Fiberon ASA-CF08, navy blue | **Approximately 40 m** | **≈105 g** | Small outdoor sensor housings, UV-exposed covers, stiff cosmetic parts | UV/weather resistance, matte finish and reduced warping | Small remaining budget; brittle spool, weak Z/impact compared with XY stiffness; abrasive; enclosure and ventilation; bend diameter >60 mm |
| ABS, likely ELEGOO blue (order match) | **450 g**, initially unknown brand/color | 450 g | Indoor housings, impact-resistant enclosures, warm-service prototypes | Toughness, machinability, better warm-service potential than basic low-temperature plastics | Verify spool identity; warping and emissions; enclosure/ventilation; UV durability generally poorer than ASA; no qualified continuous-service temperature |
| SUNLU PLA+ 2.0, black | **Approximately 400 g** (user report) | **≈400 g** | Indoor prototypes, organizers and models | Manufacturer describes improved toughness and impact resistance versus standard PLA | Grade-specific long-term heat/creep performance not established here; no profile or process preset requested for this addition |

Planning total **≈4.51 kg**, not a measured total. Meter conversions use 1.75 mm nominal diameter and densities PET-GF15 **1.43**, PA6-GF25 **1.20**, ASA-CF08 **1.09 g/cm³**:

`mass_g = length_m × π × (diameter_mm / 2)² × density_g/cm³`

Original units and approximate flags are preserved in [inventory.json](inventory.json). Diameter tolerances, stock-length estimates and moisture change true mass. Do not round 180 m into a falsely measured 619 g. Budget by sliced total including supports, purge, tests and waste, with a project-specific margin; ≈105 g ASA-CF08 should be treated as a small-part reserve.

## Material selection habits for future designs

Choose Rapid TPU95A when compliance is the point; use CC3D 72D when some resilience with much higher hardness is useful. The Shore A and D scales are different; 72D is harder despite the smaller numeral. Do not infer a bend stiffness from hardness alone: wall thickness and geometry dominate the printed part.

Choose ASA-CF08 first among this stock for UV-exposed stiff covers. For rigid parts in changing humidity, PET-GF15 is a useful candidate before PA6-GF25. Choose PA6-GF25 when its toughness/annealed thermal performance justifies the drying, conditioning and fit-validation effort. Use PETG-CF for straightforward stiff matte indoor parts when its unqualified thermal and creep behavior is acceptable. ABS offers a less abrasive alternative for tough indoor shells once the spool identity is checked. These are engineering candidate choices, not ratings.

Fibers improve some properties and reduce others. Neither CF nor GF automatically improves every impact or layer-direction result. Compare load direction, fasteners, temperature, sustained load, creep, moisture and failure consequences before selecting a material. Avoid blanket high infill: start with geometry/orientation and shell thickness, then compare sliced grams/time and test representative parts. No food-contact, ESD, dielectric, flame, pressure, medical or structural certification is established by this reference.

## Thermal values with their conditions

- **PET-GF15:** manufacturer TDS gives as-printed HDT **81.6°C at 0.45 MPa / 71.8°C at 1.8 MPa**. The **133.7°C at 0.45 MPa** headline uses specimens annealed **120°C for 16 h**. Tg is **59.5°C**; the profile's source value 232.6°C is Vicat, not Tg. Annealing is optional for ordinary parts but may shrink/warp them. Validate fit afterwards.
- **PA6-GF25:** quoted TDS thermal/mechanical specimens were annealed **100°C for 16 h**. Dry XY Young's modulus is approximately **5,357 MPa**, versus **1,794 MPa** for the specified wet test (60°C water for 48 h). That is about one-third the dry stiffness, and is not a claim about ordinary room humidity. The **191°C HDT at 0.45 MPa** is not an as-printed continuous-load rating. Condition and test the actual part in its use environment.
- **ASA-CF08:** the TDS reports Tg **106.6°C**. Keep that separate from HDT and continuous service. No anneal is prescribed here. Its outdoor suitability does not guarantee unlimited weathering life.
- **ELEGOO PETG-CF, Rapid TPU95A, CC3D 72D and this ABS spool:** no measured or grade-qualified continuous-service temperature is established here. Brand advertising and the performance of another formulation do not fill that gap.

HDT is a short standardized deflection test at a specified stress. It does not give a long-term safe temperature or creep life for the user's part.

## Drying, feeding and storage

| Material | Preparation reference | Feed / environment |
|---|---|---|
| ELEGOO PETG-CF | **60°C / 8 h** chosen from repeated exact-product guidance; one manufacturer block says 70°C / 8 h | External drybox initially; obey supplied spool label if it differs |
| Rapid TPU95A | **70±5°C / 8 h**, exact Rapid material documentation | Dry, low-drag external feed; RH ≤20% storage guidance |
| CC3D 72D | Brand product description: **60–65°C / 6 h** | Dry in-line feeding; brand excludes remote filament feeding; don't infer AMS support from hardness |
| PET-GF15 | **100°C / 10 h**, RH <20% for storage and printing | Room-temperature chamber guidance; hardened nozzle; external dry feeding |
| PA6-GF25 | **100°C / 10 h**, RH <20% | Room-temperature chamber guidance, keep ambient below 50°C; hardened nozzle; external dry feeding |
| ASA-CF08 | **90°C / 6 h** when damp, RH <20% | Enclosure and ventilation/filtration; external feed with bend diameter >60 mm |
| ABS order match | Exact spool drying instruction unresolved; check label | Enclosed printing with suitable room ventilation; avoid drafts over the part |

Use controlled equipment rated for both filament and spool; do not assume a printer or domestic oven can accurately do these jobs. No drying/annealing command is executed by the presets. **AMS 2 Pro's 65°C maximum cannot deliver the 90–100°C Fiberon drying recipes.** A longer 65°C cycle is not claimed equivalent. There is no AMS, and Andrew's own dryer handles PET-GF15 (user-confirmed 2026-10-15; see the printer setup note above).

Bambu's current AMS 2 Pro specification excludes generic TPU and non-Bambu CF/GF. Specific Bambu-filled products being supported does not approve these brands. Product/spool-fit or retailer AMS claims do not override an applicable Bambu restriction. Drying storage and AMS feeding are distinct capabilities. An external spool path is the practical common starting recommendation; cardboard rings alone do not resolve material compatibility.

## Keeping this reference useful

For every completed print, record filament ID, actual consumed grams (or clearly marked slicer estimate), failed-print waste, date and measured remaining stock if weighed. Keep original meter observations in history. Save physical calibration as a new dated profile with nozzle/plate, drying condition, flow ratio, flow dynamics and test notes; retain these START presets as provenance. Queue rows should carry the exact filament and profile names plus dry/nozzle prerequisites, and remain draft until the part-specific review is complete. This documentation does not mark any queued job ready or printed.

SUNLU stock identity and remaining quantity are user-reported. Its qualitative toughness description comes from the [official SUNLU PLA+ 2.0 product page](https://www.sunlu.com/products/pla-plus-2.0-3d-printing-filament); no numerical comparison or load rating is adopted.

The three supplied process presets are optional examples. Andrew prefers his own process settings with these filament profiles; importing a filament profile does not require selecting its suggested process. Review geometry, speeds and cooling for the material.
