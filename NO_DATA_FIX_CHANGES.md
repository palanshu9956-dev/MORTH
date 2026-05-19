# No-Data Fallback Fix — Changed Files Summary

Date: 2026-04-22

This document lists the files changed to fix the issue where missing district/state JSON entries were incorrectly showing fallback data.

## 1) `src/data/morthData.js`

### What changed
- Removed cross-category fallback inside `getDistrictFactorsForState(...)`.
  - Before: if category district factors were missing, it could fall back to `MORTH_DISTRICT_DATA` factors.
  - After: returns only factors from the selected category/state.
- Added `getMatchedDistrictFactor(districtConfig, stateName, districtName)`.
  - This returns a factor only when the selected district has an exact configured factor match.
- Updated `getDistrictData(stateName, districtName, category)`.
  - Before: used `buildDistrictScaleFactor(...)`, which could produce synthetic district data.
  - After: uses exact `getMatchedDistrictFactor(...)`.
  - If no exact district entry/factor exists, returns `null` (no data).

### Why
- Prevents missing districts (e.g., districts not present in JSON) from showing incorrect state-derived values.

---

## 2) `src/components/AnalyticsPanel.jsx`

### What changed
- Added scoped selection checks:
  - `hasSelection`
  - `hasNoSelectionData`
- Added early return UI when selected state/district has no matching data:
  - Message: `There is no data available for selected ...`

### Why
- Ensures stats cards don’t show misleading values when selection data is missing.

---

## 3) `src/components/BottomDashboard.jsx`

### What changed
- Added `getDataByLevel(...)` lookup for current selection.
- Added `hasNoSelectionData` logic.
- Added early return no-data message card:
  - `There is no data available for selected ...`

### Why
- Prevents charts/tables from rendering with fallback values for missing district/state records.

---

## 4) `src/components/ComparisonsPanel.jsx`

### What changed
- Updated import to use `getDataByLevel` (removed `getDistrictData` fallback import usage).
- Added `selectionData` and `hasNoSelectionData` checks.
- Added early return no-data UI for missing selected state data.
- Removed popup fallback path that attempted to inject a fallback district when district rows were empty.

### Why
- Keeps comparisons aligned with real available data only; no synthetic fallback entity is shown.

---

## 5) `src/styles/analytics.css`

### What changed
- Added styles:
  - `.analytics-no-data`
  - `.analytics-no-data.analytics-no-data-header`

### Why
- Provides consistent visual treatment for analytics no-data messages.

---

## 6) `src/styles/comparisons.css`

### What changed
- Added style:
  - `.comparisons-no-data`

### Why
- Provides clear no-data message styling in comparisons panel.

---

## 7) `src/App.css`

### What changed
- Added style:
  - `.dashboard-no-data`

### Why
- Provides clear no-data message styling for bottom dashboard.

---

## Result of this fix

- If selected district/state exists in JSON: data displays normally.
- If selected district/state does **not** exist in JSON: UI now shows an explicit no-data message.
- Incorrect fallback display (state/other data shown for missing district) is removed.
