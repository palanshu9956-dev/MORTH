// ===== MORTH Road Safety Dashboard Data =====

import mortNationalData from './data/mort-national.json';
import mortStatesData from './data/mort-states.json';
import mortDistrictData from './data/mort-districts.json';
import mortStateBarsData from './data/mort-state-bars.json';
import mortDistrictBarsData from './data/mort-district-bars.json';
import schoolsZoneStateBarsData from './data/schools-zone-state-bars.json';
import schoolsZoneDistrictBarsData from './data/schools-zone-district-bars.json';
import clusterStateBarsData from './data/cluster-state-bars.json';
import clusterDistrictBarsData from './data/cluster-district-bars.json';
import ircStateBarsData from './data/irc-state-bars.json';
import ircDistrictBarsData from './data/irc-district-bars.json';
import ircNationalData from './irc-national.json';
import ircStatesData from './irc-states.json';
import ircDistrictData from './irc-districts.json';
import clusterNationalData from './cluster-national.json';
import clusterStatesData from './cluster-states.json';
import clusterDistrictData from './cluster-districts.json';
import schoolsZoneNationalData from './data/schools-zone-national.json';
import schoolsZoneStatesData from './data/schools-zone-states.json';
import schoolsZoneDistrictData from './data/schools-zone-districts.json';

export const MORTH_DATA = {
  summary: mortNationalData.summary,
  states: mortStatesData,
  agencies: mortNationalData.agencies,
  rankings: mortNationalData.rankings,
  bars: mortNationalData.bars,
  nationalInsights: mortNationalData.national_insights || mortNationalData.nationalInsights || null
};

export const MORTH_DISTRICT_DATA = mortDistrictData;

const CATEGORY_DISTRICT_CONFIGS = {
  mort: mortDistrictData,
  irc: ircDistrictData,
  'schools-zone': schoolsZoneDistrictData,
  cluster: clusterDistrictData
};

const CATEGORY_STATE_BAR_CONFIGS = {
  mort: mortStateBarsData,
  irc: ircStateBarsData,
  'schools-zone': schoolsZoneStateBarsData,
  cluster: clusterStateBarsData
};

const CATEGORY_DISTRICT_BAR_CONFIGS = {
  mort: mortDistrictBarsData,
  irc: ircDistrictBarsData,
  'schools-zone': schoolsZoneDistrictBarsData,
  cluster: clusterDistrictBarsData
};

// Build lookup: state name (lowercase) → MORTH state data
const toNumber = (value) => Number(String(value ?? 0).replace(/,/g, '')) || 0;
const toIndianString = (value, fractionDigits = 0) =>
  Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  });

const toNumericValue = (value) => {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return Number(value) || 0;

  const normalized = value.replace(/,/g, '').trim();
  const matched = normalized.match(/[\d.]+/);
  if (!matched) return 0;
  return Number(matched[0]) || 0;
};

const topEntriesBy = (rows = [], valueSelector, max = 5) =>
  [...(rows || [])]
    .sort((a, b) => (valueSelector(b) || 0) - (valueSelector(a) || 0))
    .slice(0, max);

const buildNationalInsightsFromStates = (states = []) => {
  const topStatesFatalities = topEntriesBy(states, (state) => Number(state?.total_fatalities) || 0, 5).map((state) => ({
    name: state.name,
    value: Number(state.total_fatalities) || 0
  }));

  const topStatesFatalGrievous = topEntriesBy(states, (state) => Number(state?.fg_covered) || 0, 5).map((state) => ({
    name: state.name,
    value: Number(state.fg_covered) || 0
  }));

  const violationMap = {};
  (states || []).forEach((state) => {
    (state?.violations || []).forEach((violation) => {
      const name = violation?.name;
      if (!name) return;
      violationMap[name] = (violationMap[name] || 0) + (Number(violation?.count) || 0);
    });
  });

  const topViolations = Object.entries(violationMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, value]) => ({ name, value }));

  return {
    top_states: {
      fatalities: topStatesFatalities,
      fatal_grievous: topStatesFatalGrievous
    },
    top_violations: topViolations
  };
};

const scaleRows = (rows, valueKey, factor) =>
  (rows || []).map((row) => ({
    ...row,
    [valueKey]: Math.max(1, Math.round((row[valueKey] || 0) * factor))
  }));

const scaleSchoolZoneMetrics = (metrics, factor) => {
  if (!metrics || typeof metrics !== 'object') return metrics;

  const scaleMetricRows = (rows) =>
    (rows || []).map((row) => ({
      ...row,
      value: Math.max(1, Math.round((row.value || 0) * factor))
    }));

  return {
    ...metrics,
    total_school_zones: Math.max(1, Math.round((metrics.total_school_zones || 0) * factor)),
    total_accidents: Math.max(1, Math.round((metrics.total_accidents || 0) * factor)),
    accidents_age_6_18: Math.max(1, Math.round((metrics.accidents_age_6_18 || 0) * factor)),
    pedestrian_accidents: Math.max(1, Math.round((metrics.pedestrian_accidents || 0) * factor)),
    accidents_per_buffer: scaleMetricRows(metrics.accidents_per_buffer),
    age_group_accidents: scaleMetricRows(metrics.age_group_accidents),
    time_window_accidents: scaleMetricRows(metrics.time_window_accidents),
    pedestrian_by_zone: scaleMetricRows(metrics.pedestrian_by_zone)
  };
};

const scaleState = (state, factor) => ({
  ...state,
  fg_covered: Math.max(1, Math.round((state.fg_covered || 0) * factor)),
  blackspots: Math.max(1, Math.round((state.blackspots || 0) * factor)),
  corridors: Math.max(1, Math.round((state.corridors || 0) * factor)),
  total_fatalities: Math.max(1, Math.round((state.total_fatalities || 0) * factor)),
  total_grievous: Math.max(1, Math.round((state.total_grievous || 0) * factor)),
  total_fg: Math.max(1, Math.round((state.total_fg || 0) * factor)),
  spot_distribution: scaleRows(state.spot_distribution, 'value', factor),
  violations: scaleRows(state.violations, 'count', factor),
  crash_types: scaleRows(state.crash_types, 'count', factor),
  crash_natures: scaleRows(state.crash_natures, 'count', factor),
  school_zone_metrics: scaleSchoolZoneMetrics(state.school_zone_metrics, factor)
});

const scaleRankingValue = (value, factor) => {
  if (typeof value !== 'string') return value;
  const normalized = value.replace(/,/g, '');
  const kmMatch = normalized.match(/^([\d.]+)\s*km$/i);
  if (kmMatch) {
    const scaled = Number(kmMatch[1]) * factor;
    return `${toIndianString(scaled, 1)} km`;
  }

  const pureNumber = Number(normalized);
  if (!Number.isNaN(pureNumber)) {
    return toIndianString(Math.round(pureNumber * factor));
  }

  return value;
};

const buildCategoryDataset = (baseDataset, factor) => ({
  summary: {
    total_length_processed: toIndianString(toNumber(baseDataset.summary.total_length_processed) * factor, 1),
    fatal_grievous_covered: toIndianString(toNumber(baseDataset.summary.fatal_grievous_covered) * factor),
    blackspots: toIndianString(toNumber(baseDataset.summary.blackspots) * factor),
    fg_coverage: toIndianString(toNumber(baseDataset.summary.fg_coverage) * factor),
    total_school_zones: toIndianString(toNumber(baseDataset.summary.total_school_zones) * factor),
    total_accidents: toIndianString(toNumber(baseDataset.summary.total_accidents) * factor),
    accidents_age_6_18: toIndianString(toNumber(baseDataset.summary.accidents_age_6_18) * factor),
    pedestrian_accidents: toIndianString(toNumber(baseDataset.summary.pedestrian_accidents) * factor)
  },
  states: (baseDataset.states || []).map((state) => scaleState(state, factor)),
  agencies: (baseDataset.agencies || []).map((agency) => ({
    ...agency,
    length: toIndianString(toNumber(agency.length) * factor, 1),
    corridors: toIndianString(toNumber(agency.corridors) * factor),
    accidents: toIndianString(toNumber(agency.accidents) * factor),
    fatalities: toIndianString(toNumber(agency.fatalities) * factor)
  })),
  rankings: (baseDataset.rankings || []).map((ranking) => ({
    ...ranking,
    rows: (ranking.rows || []).map((row) => ({
      ...row,
      value: scaleRankingValue(row.value, factor)
    }))
  })),
  bars: (baseDataset.bars || []).map((bar) => ({
    ...bar,
    rows: (bar.rows || []).map((row) => ({
      ...row,
      value: Math.max(1, Math.round((row.value || 0) * factor))
    }))
  })),
  nationalInsights: buildNationalInsightsFromStates((baseDataset.states || []).map((state) => scaleState(state, factor)))
});

export const DEFAULT_CATEGORY = 'mort';
export const CATEGORY_OPTIONS = ['mort', 'irc', 'schools-zone', 'cluster'];

const resolveCategoryFactor = (data) => {
  const factor = Number(data?.scale_factor);
  if (Number.isFinite(factor) && factor > 0) return factor;
  return null;
};

const resolveCategoryStates = (statesData) => {
  if (Array.isArray(statesData)) return statesData;
  const factor = resolveCategoryFactor(statesData);
  if (!factor) return [];
  return (MORTH_DATA.states || []).map((state) => scaleState(state, factor));
};

const resolveNationalData = (nationalData) => {
  const normalizedNationalRoot =
    nationalData && typeof nationalData === 'object' && nationalData.dashboard
      ? nationalData.dashboard
      : nationalData;

  const normalizeNationalInsights = (insights, fallbackStates = []) => {
    if (!insights || typeof insights !== 'object') {
      return buildNationalInsightsFromStates(fallbackStates);
    }

    const topStates = insights.top_states || insights.topStates || {};
    const topViolations = insights.top_violations || insights.topViolations || [];

    const normalizeRows = (rows = []) =>
      (rows || []).map((row) => ({
        name: row?.name,
        value: toNumericValue(row?.value)
      }));

    const normalized = {
      top_states: {
        fatalities: normalizeRows(topStates.fatalities),
        fatal_grievous: normalizeRows(topStates.fatal_grievous || topStates.fatalGrievous)
      },
      top_violations: normalizeRows(topViolations)
    };

    if (!normalized.top_states.fatalities.length || !normalized.top_states.fatal_grievous.length || !normalized.top_violations.length) {
      const fallback = buildNationalInsightsFromStates(fallbackStates);
      return {
        top_states: {
          fatalities: normalized.top_states.fatalities.length ? normalized.top_states.fatalities : fallback.top_states.fatalities,
          fatal_grievous: normalized.top_states.fatal_grievous.length ? normalized.top_states.fatal_grievous : fallback.top_states.fatal_grievous
        },
        top_violations: normalized.top_violations.length ? normalized.top_violations : fallback.top_violations
      };
    }

    return normalized;
  };

  const hasFullNationalDataset =
    normalizedNationalRoot &&
    typeof normalizedNationalRoot === 'object' &&
    normalizedNationalRoot.summary &&
    Array.isArray(normalizedNationalRoot.agencies) &&
    Array.isArray(normalizedNationalRoot.rankings) &&
    Array.isArray(normalizedNationalRoot.bars);

  if (hasFullNationalDataset) {
    const fallbackStates = MORTH_DATA.states || [];
    return {
      summary: normalizedNationalRoot.summary,
      agencies: normalizedNationalRoot.agencies,
      rankings: normalizedNationalRoot.rankings,
      bars: normalizedNationalRoot.bars,
      nationalInsights: normalizeNationalInsights(
        (nationalData && (nationalData.national_insights || nationalData.nationalInsights)) || null,
        fallbackStates
      )
    };
  }

  const factor = resolveCategoryFactor(normalizedNationalRoot);
  if (!factor) {
    return {
      summary: {},
      agencies: [],
      rankings: [],
      bars: [],
      nationalInsights: buildNationalInsightsFromStates(MORTH_DATA.states || [])
    };
  }

  const derived = buildCategoryDataset(MORTH_DATA, factor);
  return {
    summary: derived.summary,
    agencies: derived.agencies,
    rankings: derived.rankings,
    bars: derived.bars,
    nationalInsights: derived.nationalInsights
  };
};

const IRC_NATIONAL = resolveNationalData(ircNationalData);
const SCHOOLS_ZONE_NATIONAL = resolveNationalData(schoolsZoneNationalData);
const CLUSTER_NATIONAL = resolveNationalData(clusterNationalData);

const IRC_STATES = resolveCategoryStates(ircStatesData);
const SCHOOLS_ZONE_STATES = resolveCategoryStates(schoolsZoneStatesData);
const CLUSTER_STATES = resolveCategoryStates(clusterStatesData);

export const IRC_DATA = {
  summary: IRC_NATIONAL.summary,
  states: IRC_STATES,
  agencies: IRC_NATIONAL.agencies,
  rankings: IRC_NATIONAL.rankings,
  bars: IRC_NATIONAL.bars,
  nationalInsights: IRC_NATIONAL.nationalInsights
};

export const SCHOOLS_ZONE_DATA = {
  summary: SCHOOLS_ZONE_NATIONAL.summary,
  states: SCHOOLS_ZONE_STATES,
  agencies: SCHOOLS_ZONE_NATIONAL.agencies,
  rankings: SCHOOLS_ZONE_NATIONAL.rankings,
  bars: SCHOOLS_ZONE_NATIONAL.bars,
  nationalInsights: SCHOOLS_ZONE_NATIONAL.nationalInsights
};

export const CLUSTER_DATA = {
  summary: CLUSTER_NATIONAL.summary,
  states: CLUSTER_STATES,
  agencies: CLUSTER_NATIONAL.agencies,
  rankings: CLUSTER_NATIONAL.rankings,
  bars: CLUSTER_NATIONAL.bars,
  nationalInsights: CLUSTER_NATIONAL.nationalInsights
};

export const CATEGORY_DATASETS = {
  mort: MORTH_DATA,
  irc: IRC_DATA,
  'schools-zone': SCHOOLS_ZONE_DATA,
  cluster: CLUSTER_DATA
};

export const getDashboardData = (category = DEFAULT_CATEGORY) =>
  CATEGORY_DATASETS[category] || MORTH_DATA;

const buildStateMap = (states) => {
  const stateMap = {};
  (states || []).forEach((state) => {
    stateMap[state.name.toLowerCase()] = state;
  });
  return stateMap;
};

const CATEGORY_STATE_DATA_MAPS = Object.fromEntries(
  Object.entries(CATEGORY_DATASETS).map(([category, data]) => [category, buildStateMap(data.states)])
);

// Backward-compatible default map (MoRT)
export const STATE_DATA_MAP = CATEGORY_STATE_DATA_MAPS.mort;

export const getStateDataMap = (category = DEFAULT_CATEGORY) =>
  CATEGORY_STATE_DATA_MAPS[category] || STATE_DATA_MAP;

export const KNOWN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'NCT of Delhi', 'Jammu and Kashmir', 'Ladakh', 'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Lakshadweep', 'Puducherry'
];

export const SYNONYMS = {
  nctofdelhi: 'delhi', delhi: 'delhi',
  uttaranchal: 'uttarakhand', orissa: 'odisha'
};

const CHART_COLORS = ['#3b9be0', '#f45b85', '#f6a340'];

const buildSeriesByState = (states) => {
  const sorted = [...states].sort((a, b) => b.fg_covered - a.fg_covered);
  const rows = sorted.slice(0, 3);
  return rows.map((state, idx) => ({
    label: state.name,
    color: CHART_COLORS[idx],
    state
  }));
};

const buildComparisonCardData = (seriesRows) => {
  const [a, b, c] = seriesRows.map((row) => row.state);
  const metric = (state, key) => Number(state?.[key]) || 0;
  const topViolationCount = (state) =>
    Math.max(0, ...((state?.violations || []).map((item) => item?.count || 0)), 0);

  const topViolationValues = [topViolationCount(a), topViolationCount(b), topViolationCount(c)];

  return {
    bars: [
      {
        title: 'Black Corridors',
        max: Math.max(metric(a, 'corridors'), metric(b, 'corridors'), metric(c, 'corridors')),
        values: [metric(a, 'corridors'), metric(b, 'corridors'), metric(c, 'corridors')]
      },
      {
        title: 'Fatal + Grievous Covered',
        max: Math.max(metric(a, 'fg_covered'), metric(b, 'fg_covered'), metric(c, 'fg_covered')),
        values: [metric(a, 'fg_covered'), metric(b, 'fg_covered'), metric(c, 'fg_covered')]
      },
      {
        title: 'Blackspots',
        max: Math.max(metric(a, 'blackspots'), metric(b, 'blackspots'), metric(c, 'blackspots')),
        values: [metric(a, 'blackspots'), metric(b, 'blackspots'), metric(c, 'blackspots')]
      },
      {
        title: 'Fatalities',
        max: Math.max(metric(a, 'total_fatalities'), metric(b, 'total_fatalities'), metric(c, 'total_fatalities')),
        values: [metric(a, 'total_fatalities'), metric(b, 'total_fatalities'), metric(c, 'total_fatalities')]
      }
    ],
    pies: [
      {
        title: '% Fatal + Grievous Share',
        values: [metric(a, 'fg_covered'), metric(b, 'fg_covered'), metric(c, 'fg_covered')]
      },
      {
        title: '% Fatality Accident',
        values: [metric(a, 'total_fatalities'), metric(b, 'total_fatalities'), metric(c, 'total_fatalities')]
      },
      {
        title: '% Grievous Share',
        values: [metric(a, 'total_grievous'), metric(b, 'total_grievous'), metric(c, 'total_grievous')]
      },
      {
        title: 'Top Violations',
        values: topViolationValues
      }
    ]
  };
};

const normalizeKey = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const cloneBars = (bars = []) =>
  (bars || []).map((bar) => ({
    ...bar,
    rows: (bar.rows || []).map((row) => ({ ...row }))
  }));

const scaleBarsByFactor = (bars = [], factor = 1) =>
  cloneBars(bars).map((bar) => ({
    ...bar,
    rows: (bar.rows || []).map((row) => ({
      ...row,
      value: Math.max(1, Math.round((Number(row?.value) || 0) * factor))
    }))
  }));

const getStateLevelBarsFromConfig = (category = DEFAULT_CATEGORY, stateName = null) => {
  const config = CATEGORY_STATE_BAR_CONFIGS[category] || CATEGORY_STATE_BAR_CONFIGS.mort || null;
  if (!config || typeof config !== 'object') return [];

  const stateKey = normalizeKey(stateName);
  const stateBars = stateKey ? config?.states?.[stateKey] : null;
  const bars = Array.isArray(stateBars) && stateBars.length
    ? stateBars
    : Array.isArray(config.default)
      ? config.default
      : [];

  return cloneBars(bars);
};

const getDistrictLevelBarsFromConfig = (
  category = DEFAULT_CATEGORY,
  stateName = null,
  districtName = null
) => {
  const config = CATEGORY_DISTRICT_BAR_CONFIGS[category] || CATEGORY_DISTRICT_BAR_CONFIGS.mort || null;
  if (!config || typeof config !== 'object' || !stateName) return [];

  const stateKey = normalizeKey(stateName);
  const districtKey = normalizeKey(districtName);
  const stateConfig = config?.states?.[stateKey] || {};

  const districtBars = districtKey ? stateConfig?.districts?.[districtKey] : null;
  const bars = Array.isArray(districtBars) && districtBars.length
    ? districtBars
    : Array.isArray(stateConfig?.default)
      ? stateConfig.default
      : Array.isArray(config.default)
        ? config.default
        : [];

  return cloneBars(bars);
};

const getDistrictSchoolZoneMetricsOverride = (stateName, districtName, category = DEFAULT_CATEGORY) => {
  const districtConfig = CATEGORY_DISTRICT_CONFIGS[category] || MORTH_DISTRICT_DATA;
  const stateKey = normalizeKey(stateName);
  const districtKey = normalizeKey(districtName);

  return districtConfig?.district_school_zone_metrics?.[stateKey]?.[districtKey] || null;
};

const getDistrictManualEntriesForState = (districtConfig, stateName) => {
  const allStateDistrictData = districtConfig?.district_data_by_state || {};
  const requestedStateKey = normalizeKey(stateName);
  const matchedEntry = Object.entries(allStateDistrictData).find(
    ([key]) => normalizeKey(key) === requestedStateKey
  );

  return matchedEntry ? matchedEntry[1] : {};
};

const getManualDistrictData = (districtConfig, stateName, districtName, baseState) => {
  const districtEntries = getDistrictManualEntriesForState(districtConfig, stateName);
  const requestedDistrictKey = normalizeKey(districtName);
  const matchedDistrictEntry = Object.entries(districtEntries).find(
    ([key]) => normalizeKey(key) === requestedDistrictKey
  );

  if (!matchedDistrictEntry) return null;

  const manualDistrict = matchedDistrictEntry[1];
  if (!manualDistrict || typeof manualDistrict !== 'object') return null;

  return {
    ...baseState,
    ...manualDistrict,
    name: manualDistrict.name || `${districtName.toUpperCase()} (${baseState.name})`,
    district_name: manualDistrict.district_name || districtName,
    state_name: manualDistrict.state_name || baseState.name
  };
};

const getDistrictFactorsForState = (districtConfig, stateName) => {
  const allStateFactors = districtConfig?.district_factors_by_state || {};
  const requestedStateKey = normalizeKey(stateName);
  const matchedEntry = Object.entries(allStateFactors).find(
    ([key]) => normalizeKey(key) === requestedStateKey
  );
  if (matchedEntry) return matchedEntry[1];

  // Cross-category fallback: if category-level district config is sparse,
  // reuse MoRT district factors so state/district scoped charts still show
  // district names instead of reverting to state rows.
  const fallbackStateFactors = MORTH_DISTRICT_DATA?.district_factors_by_state || {};
  const fallbackMatchedEntry = Object.entries(fallbackStateFactors).find(
    ([key]) => normalizeKey(key) === requestedStateKey
  );

  return fallbackMatchedEntry ? fallbackMatchedEntry[1] : {};
};

const buildDistrictScaleFactor = (stateName, districtName, category = DEFAULT_CATEGORY) => {
  const districtConfig = CATEGORY_DISTRICT_CONFIGS[category] || MORTH_DISTRICT_DATA;
  const defaultFactor = Number(districtConfig?.default_factor);
  if (!districtName) return defaultFactor;

  const districtKey = normalizeKey(districtName);
  const stateFactors = getDistrictFactorsForState(districtConfig, stateName);

  if (stateFactors) {
    const matchedFactor = Object.entries(stateFactors).find(([name]) => normalizeKey(name) === districtKey)?.[1];
    if (typeof matchedFactor === 'number' && matchedFactor > 0) {
      return matchedFactor;
    }
  }

  if (Number.isFinite(defaultFactor) && defaultFactor > 0) {
    return defaultFactor;
  }

  return null;
};

const scaleDistributionRows = (rows, factor) => {
  return (rows || []).map((row) => ({
    ...row,
    value: Math.max(1, Math.round((row.value || 0) * factor))
  }));
};

const scaleCountRows = (rows, factor) => {
  return (rows || []).map((row) => ({
    ...row,
    count: Math.max(1, Math.round((row.count || 0) * factor))
  }));
};

export const getDistrictData = (stateName, districtName, category = DEFAULT_CATEGORY) => {
  if (!stateName || !districtName) return null;

  const stateDataMap = getStateDataMap(category);
  const baseState = stateDataMap[stateName.toLowerCase()];
  if (!baseState) return null;

  const districtConfig = CATEGORY_DISTRICT_CONFIGS[category] || MORTH_DISTRICT_DATA;
  const manualDistrictData = getManualDistrictData(districtConfig, stateName, districtName, baseState);
  const schoolZoneOverride = getDistrictSchoolZoneMetricsOverride(stateName, districtName, category);

  if (manualDistrictData) {
    if (!schoolZoneOverride) return manualDistrictData;

    return {
      ...manualDistrictData,
      school_zone_metrics: {
        ...(manualDistrictData.school_zone_metrics || {}),
        ...schoolZoneOverride
      }
    };
  }

  const factor = buildDistrictScaleFactor(stateName, districtName, category);
  if (!factor || factor <= 0) return null;
  const schoolZoneMetrics = scaleSchoolZoneMetrics(baseState.school_zone_metrics, factor);

  return {
    ...baseState,
    name: `${districtName.toUpperCase()} (${baseState.name})`,
    district_name: districtName,
    state_name: baseState.name,
    fg_covered: Math.max(1, Math.round(baseState.fg_covered * factor)),
    blackspots: Math.max(1, Math.round(baseState.blackspots * factor)),
    corridors: Math.max(1, Math.round(baseState.corridors * factor)),
    total_fatalities: Math.max(1, Math.round(baseState.total_fatalities * factor)),
    total_grievous: Math.max(1, Math.round(baseState.total_grievous * factor)),
    total_fg: Math.max(1, Math.round(baseState.total_fg * factor)),
    spot_distribution: scaleDistributionRows(baseState.spot_distribution, factor),
    violations: scaleCountRows(baseState.violations, factor),
    crash_types: scaleCountRows(baseState.crash_types, factor),
    crash_natures: scaleCountRows(baseState.crash_natures, factor),
    school_zone_metrics: schoolZoneOverride
      ? {
          ...schoolZoneMetrics,
          ...schoolZoneOverride
        }
      : schoolZoneMetrics
  };
};

export const getDistrictComparisonRows = (stateName, category = DEFAULT_CATEGORY, districtNames = []) => {
  if (!stateName) return [];

  const districtConfig = CATEGORY_DISTRICT_CONFIGS[category] || MORTH_DISTRICT_DATA;
  const stateFactors = getDistrictFactorsForState(districtConfig, stateName);
  const manualDistrictEntries = getDistrictManualEntriesForState(districtConfig, stateName);

  const configuredNames = Object.keys(stateFactors);
  const manualNames = Object.keys(manualDistrictEntries || {});
  const inputNames = Array.isArray(districtNames) ? districtNames : [];
  const namePool = inputNames.length
    ? [...inputNames, ...manualNames, ...configuredNames]
    : [...manualNames, ...configuredNames];
  const uniqueDistrictNames = Array.from(
    new Map(namePool.map((name) => [normalizeKey(name), name])).values()
  ).filter(Boolean);

  return uniqueDistrictNames
    .map((districtName) => getDistrictData(stateName, districtName, category))
    .filter(Boolean);
};

export const getDataByLevel = ({
  category = DEFAULT_CATEGORY,
  stateName = null,
  districtName = null
} = {}) => {
  if (stateName && districtName) {
    return getDistrictData(stateName, districtName, category);
  }

  if (stateName) {
    return getStateDataMap(category)[stateName.toLowerCase()] || null;
  }

  return getDashboardData(category);
};

const toTitleCase = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/\b\w/g, (ch) => ch.toUpperCase());

const topRowsByCount = (rows = [], max = 3) =>
  [...rows]
    .sort((a, b) => (b.count || 0) - (a.count || 0))
    .slice(0, max)
    .map((row) => ({
      name: row.name,
      value: toIndianString(row.count || 0)
    }));

const topRowsByValue = (rows = [], max = 5) =>
  [...rows]
    .sort((a, b) => (b.value || 0) - (a.value || 0))
    .slice(0, max)
    .map((row) => ({
      label: row.label,
      value: row.value || 0
    }));

const buildSelectionDashboardData = ({
  category = DEFAULT_CATEGORY,
  stateName = null,
  districtName = null,
  selectionData = null
} = {}) => {
  const baseDashboard = getDashboardData(category);
  if (!stateName || !selectionData) return baseDashboard;

  const scopeName = districtName ? toTitleCase(districtName) : toTitleCase(selectionData.name || stateName);
  // If user selected a state (with or without district), prefer district-level rows
  // so the bottom dashboard charts aggregate district data for that scope.
  let scopedStates = [];
  if (stateName) {
    const districtRows = getDistrictComparisonRows(
      stateName,
      category,
      districtName ? [districtName] : []
    );
    if (districtRows && districtRows.length > 0) {
      if (districtName) {
        const selectedDistrictKey = normalizeKey(districtName);
        const selectedDistrict = districtRows.find(
          (row) => normalizeKey(row?.district_name || row?.name) === selectedDistrictKey
        );

        if (selectedDistrict) {
          const neighborDistricts = districtRows
            .filter((row) => normalizeKey(row?.district_name || row?.name) !== selectedDistrictKey)
            .sort((a, b) => {
              const d1 = Math.abs((a?.fg_covered || 0) - (selectedDistrict?.fg_covered || 0));
              const d2 = Math.abs((b?.fg_covered || 0) - (selectedDistrict?.fg_covered || 0));
              return d1 - d2;
            })
            .slice(0, 7);

          scopedStates = [selectedDistrict, ...neighborDistricts];
        } else {
          scopedStates = [...districtRows]
            .sort((a, b) => (b.fg_covered || 0) - (a.fg_covered || 0))
            .slice(0, 8);
        }
      } else {
        // state selected (no district): show top districts for that state
        scopedStates = [...districtRows]
          .sort((a, b) => (b.fg_covered || 0) - (a.fg_covered || 0))
          .slice(0, 8);
      }
    }
  }

  // Fallback to state-level peers if no district rows found or when a district is selected
  if (!scopedStates.length) {
    const peerStates = (baseDashboard.states || []).filter(
      (state) => state.name.toLowerCase() !== (stateName || '').toLowerCase()
    );

    scopedStates = districtName
      ? [selectionData, ...peerStates.slice(0, 4)]
      : [selectionData, ...peerStates.slice(0, 7)];
  }

  const fallbackBars = [
    {
      title: `Severity Overview — ${scopeName}`,
      rows: [
        { label: 'Fatalities', value: selectionData.total_fatalities || 0 },
        { label: 'Grievous', value: selectionData.total_grievous || 0 },
        { label: 'Fatal + Grievous', value: selectionData.total_fg || 0 }
      ]
    },
    {
      title: `Corridors & Blackspots — ${scopeName}`,
      rows: [
        { label: 'Corridors', value: selectionData.corridors || 0 },
        { label: 'Blackspots', value: selectionData.blackspots || 0 },
        { label: 'F+G Covered', value: selectionData.fg_covered || 0 }
      ]
    },
    {
      title: `Hotspot Distribution — ${scopeName}`,
      rows: topRowsByValue(selectionData.spot_distribution)
    }
  ];

  const configuredStateBars = getStateLevelBarsFromConfig(category, stateName);
  const districtFactor = districtName
    ? buildDistrictScaleFactor(stateName, districtName, category) || 1
    : 1;
  const configuredDistrictBars = districtName
    ? getDistrictLevelBarsFromConfig(category, stateName, districtName)
    : [];

  const scopedBars = districtName
    ? (configuredDistrictBars.length
        ? configuredDistrictBars
        : configuredStateBars.length
          ? scaleBarsByFactor(configuredStateBars, districtFactor)
          : (selectionData.bars || []).length
            ? scaleBarsByFactor(selectionData.bars || [], districtFactor)
            : fallbackBars)
    : (configuredStateBars.length
        ? configuredStateBars
        : (selectionData.bars || []).length
          ? selectionData.bars
          : fallbackBars);

  return {
    ...baseDashboard,
    states: scopedStates,
    agencies: [
      {
        name: scopeName,
        length: toIndianString(selectionData.fg_covered || 0),
        corridors: toIndianString(selectionData.corridors || 0),
        accidents: toIndianString(selectionData.total_fg || 0),
        fatalities: toIndianString(selectionData.total_fatalities || 0)
      }
    ],
    rankings: [
      {
        title: `Top Crash Types — ${scopeName}`,
        rows: topRowsByCount(selectionData.crash_types)
      },
      {
        title: `Top Violations — ${scopeName}`,
        rows: topRowsByCount(selectionData.violations)
      },
      {
        title: `Collision Nature — ${scopeName}`,
        rows: topRowsByCount(selectionData.crash_natures)
      }
    ],
    bars: scopedBars
  };
};

export const getDashboardDataForSelection = ({
  category = DEFAULT_CATEGORY,
  stateName = null,
  districtName = null
} = {}) => {
  const selectionData = getDataByLevel({ category, stateName, districtName });
  return buildSelectionDashboardData({ category, stateName, districtName, selectionData });
};

const asSeriesRow = (state, color) => ({
  label: state.name,
  color,
  state
});

const sumMetricValues = (rows = []) =>
  (rows || []).reduce((sum, row) => sum + (Number(row?.value) || 0), 0);

const getTopViolationCount = (violations = []) => {
  const top = [...(violations || [])].sort((a, b) => (b.count || 0) - (a.count || 0))[0];
  return Number(top?.count) || 0;
};

const buildSchoolZoneComparisonBars = (seriesRows) => {
  const perBufferValues = seriesRows.map((row) => {
    const metrics = row.state?.school_zone_metrics || {};
    const totalAccidents = Number(metrics.total_accidents) || Number(row.state?.fg_covered) || 0;
    const totalZones = Number(metrics.total_school_zones) || Number(row.state?.blackspots) || 0;
    if (totalZones <= 0) return totalAccidents;
    return Math.round((totalAccidents / totalZones) * 100) / 100;
  });

  const age618Values = seriesRows.map((row) => {
    const metrics = row.state?.school_zone_metrics || {};
    return Number(metrics.accidents_age_6_18) || Number(row.state?.total_fatalities) || 0;
  });

  const timeWindowValues = seriesRows.map((row) => {
    const metrics = row.state?.school_zone_metrics || {};
    const aggregated = sumMetricValues(metrics.time_window_accidents);
    return aggregated || Number(metrics.total_accidents) || Number(row.state?.fg_covered) || 0;
  });

  const pedestrianValues = seriesRows.map((row) => {
    const metrics = row.state?.school_zone_metrics || {};
    return Number(metrics.pedestrian_accidents) || Number(row.state?.total_grievous) || 0;
  });

  const buildBar = (title, values) => ({
    title,
    max: Math.max(1, ...values),
    values
  });

  return [
    buildBar('Accidents per School Buffer', perBufferValues),
    buildBar('Accidents (Age 6–18)', age618Values),
    buildBar('Time Window Accidents', timeWindowValues),
    buildBar('Pedestrian Accidents', pedestrianValues)
  ];
};

const buildSchoolZoneComparisonPies = (seriesRows) => {
  const topViolationValues = seriesRows.map((row) =>
    getTopViolationCount(row.state?.violations)
  );

  return [
    {
      title: 'Top Violations',
      values: topViolationValues
    }
  ];
};

const findNeighborStates = (states, stateName) => {
  const selected = states.find((state) => state.name === stateName);
  if (!selected) return buildSeriesByState(states);

  const byDistance = [...states]
    .filter((state) => state.name !== selected.name)
    .sort((a, b) => {
      const d1 = Math.abs(a.fg_covered - selected.fg_covered);
      const d2 = Math.abs(b.fg_covered - selected.fg_covered);
      return d1 - d2;
    })
    .slice(0, 2);

  const rows = [selected, ...byDistance];
  return rows.map((state, idx) => ({
    label: state.name,
    color: CHART_COLORS[idx],
    state
  }));
};

const getIndiaTopRows = (states) => buildSeriesByState(states);

const buildChartEntry = (label, seriesRows, category = DEFAULT_CATEGORY) => {
  if (category === 'schools-zone') {
    return {
      label,
      series: seriesRows.map((row) => ({ label: row.label, color: row.color })),
      line: null,
      bars: buildSchoolZoneComparisonBars(seriesRows),
      pies: buildSchoolZoneComparisonPies(seriesRows)
    };
  }

  const cardData = buildComparisonCardData(seriesRows);
  return {
    label,
    series: seriesRows.map((row) => ({ label: row.label, color: row.color })),
    line: null,
    bars: cardData.bars,
    pies: cardData.pies
  };
};

const buildComparisonChartDataForDataset = (dataset, category = DEFAULT_CATEGORY) => {
  const states = dataset?.states || [];
  const chartData = {
    india: buildChartEntry('India (Top States)', getIndiaTopRows(states), category)
  };

  states.forEach((state) => {
    chartData[state.name.toLowerCase()] = buildChartEntry(
      state.name,
      findNeighborStates(states, state.name),
      category
    );
  });

  return chartData;
};

const CATEGORY_COMPARISON_CHART_DATA = Object.fromEntries(
  Object.entries(CATEGORY_DATASETS).map(([category, dataset]) => [
    category,
    buildComparisonChartDataForDataset(dataset, category)
  ])
);

// Backward-compatible default comparison data (MoRT)
export const COMPARISON_CHART_DATA = CATEGORY_COMPARISON_CHART_DATA.mort;

export const getComparisonChartData = (stateName, category = DEFAULT_CATEGORY) => {
  const chartData = CATEGORY_COMPARISON_CHART_DATA[category] || COMPARISON_CHART_DATA;
  if (!stateName) return chartData.india;
  return chartData[stateName.toLowerCase()] || chartData.india;
};

const buildDistrictSeriesRows = (districtRows = [], selectedDistrictName = null) => {
  if (!districtRows.length) return [];

  const labelForDistrict = (row) => row?.district_name || row?.name || 'District';
  const asLabeledDistrict = (row) => ({
    ...row,
    name: labelForDistrict(row)
  });

  const sortedRows = [...districtRows].sort((a, b) => (b.fg_covered || 0) - (a.fg_covered || 0));

  let scopedRows = sortedRows.slice(0, 3);

  if (selectedDistrictName) {
    const selectedKey = normalizeKey(selectedDistrictName);
    const selected = districtRows.find(
      (row) => normalizeKey(row?.district_name || row?.name) === selectedKey
    );

    if (selected) {
      const neighbors = districtRows
        .filter((row) => normalizeKey(row?.district_name || row?.name) !== selectedKey)
        .sort((a, b) => {
          const d1 = Math.abs((a?.fg_covered || 0) - (selected?.fg_covered || 0));
          const d2 = Math.abs((b?.fg_covered || 0) - (selected?.fg_covered || 0));
          return d1 - d2;
        })
        .slice(0, 2);

      scopedRows = [selected, ...neighbors];
    }
  }

  const topRows = scopedRows
    .map(asLabeledDistrict)
    .slice(0, 3);

  if (!topRows.length) return [];

  while (topRows.length < 3) {
    topRows.push({ ...topRows[topRows.length - 1] });
  }

  return topRows.map((district, idx) => asSeriesRow(district, CHART_COLORS[idx]));
};

export const getComparisonChartDataForSelection = (
  stateName,
  districtName,
  category = DEFAULT_CATEGORY,
  districtNames = []
) => {
  if (!stateName) {
    return getComparisonChartData(null, category);
  }

  const districtRows = getDistrictComparisonRows(stateName, category, districtNames);
  if (districtRows.length > 0) {
    const districtSeriesRows = buildDistrictSeriesRows(districtRows, districtName);
    if (districtSeriesRows.length > 0) {
      const chartLabel = districtName
        ? `${toTitleCase(districtName)}, ${stateName}`
        : `${stateName} (Districts)`;
      return buildChartEntry(chartLabel, districtSeriesRows, category);
    }
  }

  return getComparisonChartData(stateName, category);
};
