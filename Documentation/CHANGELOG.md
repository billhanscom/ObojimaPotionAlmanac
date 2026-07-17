# Changelog

## 2026-07-17

### Region and Search Area Audit

- Restored `River` and `Ruins` to Mount Arbora.
- Restored `Ruins` to the Land of Hot Water; it had been dropped unintentionally during the Search Area restructuring.
- Audited every Region against the last established regional Search Area lists.
- Confirmed that all Region Search Area names exist in `search_areas.json`.
- Removed duplicate root-level copies of `FORAGING_MODEL.md` and `README_STATIC.md`; documentation now lives only in `Documentation/`.

## 2026-07-17

### Search Areas

- Replaced `Mountain` with more specific Search Areas, including `Cliffside`, `Grassland`, `Geothermal`, and `Mine`.
- Added `Cliffside`, `Mine`, and `Underwater` to the canonical Search Area data.
- Retained `Lake` as a distinct, player-expected foraging environment.
- Folded swamp environments into `Wetland`.
- Replaced Yatamon's `Waterfront` with `River`.
- Kept `Market` exclusive to Yatamon.
- Updated Mount Arbora and Land of Hot Water Search Area lists.
- Reassigned all ingredient references to the retired `Mountain` Search Area.
- Added the canonical Search Area civilization scale and rationales to `FORAGING_MODEL.md`.

## 2026-07-17

### Foraging Aid

- Restricted related Search Area matching to Search Areas that actually exist in the selected Region.
- Updated debug language so ingredients associated only with unavailable Search Areas report no Search Area relationship in that Region.
- Added the Documentation folder and started an ongoing changelog.
