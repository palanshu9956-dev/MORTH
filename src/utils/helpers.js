import { KNOWN_STATES, SYNONYMS, getStateDataMap } from '../data/morthData';

export const normalize = (s) => String(s || '').toLowerCase().replace(/[^a-z]/g, '');

export const canon = (s) => {
  const n = normalize(s);
  return SYNONYMS[n] || n;
};

export const formatNumber = (n) => {
  return Number(n || 0).toLocaleString('en-IN');
};

export const getColorBySeverity = (fg) => {
  if (!fg || fg === 0) return '#e0e0e0';
  if (fg > 15000) return '#b71c1c';
  if (fg > 10000) return '#F44336';
  if (fg > 5000) return '#FF9800';
  return '#FFC107';
};

export const getStateName = (feature) => {
  const props = feature?.properties || {};
  const keys = ['STNAME', 'STNAME_SH', 'STATE_NAME', 'STATE', 'ST_NM', 'STATENAME', 'State', 'NAME_1', 'NAME'];
  for (const k of keys) {
    if (props[k]) return props[k];
  }
  for (const v of Object.values(props)) {
    if (KNOWN_STATES.some(st => normalize(v) === normalize(st))) return v;
  }
  return 'Unknown';
};

export const getDistrictName = (props) => {
  const preferred = ['DISTNAME', 'DISTRICT', 'DTNAME', 'DIST_NAME', 'DISTRICT_NAME', 'DIST_NM', 'DISTRICT_N', 'NAME', 'NAME_1', 'NAME_2', 'district', 'distname', 'dtname'];
  for (const k of preferred) {
    if (props?.[k]) return props[k];
  }
  for (const [k, v] of Object.entries(props || {})) {
    if (typeof v === 'string' && /dist|dt/i.test(k) && !/state/i.test(k)) return v;
  }
  return 'District';
};

export const districtMatchesState = (props, stateName) => {
  if (!props || !stateName) return false;
  const cs = canon(stateName);
  const stateKeys = ['ST_NM', 'st_nm', 'STATE_NAME', 'STATE', 'STNAME', 'STATE/UT', 'STATE_UT', 'STATEUT', 'State', 'stname'];
  for (const key of stateKeys) {
    if (key in props && props[key] && canon(props[key]) === cs) return true;
  }
  for (const [k, v] of Object.entries(props)) {
    if ((/state/i.test(k) || /^st(_?nm|name)$/i.test(k)) && v && canon(v) === cs) return true;
  }
  return false;
};

export const getMorthStateData = (geoStateName, category) => {
  if (!geoStateName) return null;
  const stateDataMap = getStateDataMap(category);
  const key = geoStateName.toUpperCase();
  // Direct match
  if (stateDataMap[key.toLowerCase()]) return stateDataMap[key.toLowerCase()];
  // Fuzzy: normalize and compare
  const geoNorm = normalize(geoStateName);
  for (const [k, v] of Object.entries(stateDataMap)) {
    if (normalize(k) === geoNorm) return v;
  }
  return null;
};
