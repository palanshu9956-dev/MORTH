import React, { useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { getDashboardDataForSelection } from '../data/morthData';
import topSchoolsData from '../data/schools-zone-top-schools.json';
import mortStateBarsData from '../data/data/mort-state-bars.json';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend, Filler
);

const chartDefaults = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { display: false }, ticks: { color: '#1f2937',weight:'bold', font: { size: 10 }, maxRotation: 30 } },
    y: { grid: { color: '#f0f0f0' }, ticks: { color: '#1f2937', font: { size: 9 } }, beginAtZero: true },
  },
};

const titleOpt = (text) => ({ display: true, text, font: { size: 12, weight: '700' }, color: '#1a1a2e', padding: { bottom: 8 } });

// ── Rank badge colors ─────────────────────────────────────────────────────────
const rankColors = ['#f59e0b', '#94a3b8', '#b45309'];

// ── Component ─────────────────────────────────────────────────────────────────
export default function BottomDashboard({ selectedCategory, selectedStateName, selectedDistrictName }) {
  const isSchoolZone = selectedCategory === 'schools-zone';
  const dashboardData = getDashboardDataForSelection({
    category: selectedCategory,
    stateName: selectedStateName,
    districtName: selectedDistrictName
  });
  const agencies = dashboardData.agencies || [];
  const rankings = dashboardData.rankings || [];
  const bars = dashboardData.bars || [];
  const nationalInsights = dashboardData.nationalInsights || null;
  const top20Corridors = dashboardData.top20Corridors || [];
  const [expandedChart, setExpandedChart] = useState(null);
  const hasScopedSelection = Boolean(selectedStateName || selectedDistrictName);

  const normalizeKey = (value) =>
    String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  const toNumeric = (value) => Number(value) || 0;
  const sortRowsByValueDesc = (rows = []) =>
    [...rows].sort((a, b) => toNumeric(b?.value) - toNumeric(a?.value));
  const sortChartDataDesc = (labels = [], values = []) =>
    labels
      .map((label, index) => ({ label, value: toNumeric(values[index]) }))
      .sort((a, b) => b.value - a.value);

  const fmt = (n) => Number(String(n).replace(/,/g, '')).toLocaleString('en-IN');
  const rankingValueClassByIndex = (idx) => {
    if (idx === 0) return 'bd-rank-value bd-rank-value-top';
    if (idx === 1) return 'bd-rank-value bd-rank-value-mid';
    return 'bd-rank-value bd-rank-value-base';
  };

  const rankingIcons = ['🛣️', '⚠️', '🏆'];
  const hiddenNationalRankingTitles = new Set([
    'Top NH (Fatal + Grievous)',
    'Top NH (Longest Length)'
  ]);
  const visibleRankings = hasScopedSelection
    ? rankings
    : rankings.filter((ranking) => !hiddenNationalRankingTitles.has(ranking?.title));

  const openChartPopup = ({ type, title, data, options }) => {
    setExpandedChart({ type, title, data, options });
  };

  const closeChartPopup = () => setExpandedChart(null);

  const renderExpandableChartCard = ({ title, onExpand, children }) => (
    <article
      key={title}
      className="bd-section-card bd-chart-card bd-chart-card-clickable"
      role="button"
      tabIndex={0}
      aria-label={`Open ${title} chart`}
      onClick={onExpand}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onExpand();
        }
      }}
    >
      <div className="bd-chart-inner">
        {children}
      </div>
    </article>
  );

  const renderExpandedChart = () => {
    if (!expandedChart) return null;

    const popupTitle = `${expandedChart.title} · Expanded View`;
    const popupOptions = {
      ...expandedChart.options,
      maintainAspectRatio: false,
      plugins: {
        ...(expandedChart.options?.plugins || {}),
        title: titleOpt(popupTitle)
      }
    };

    if (expandedChart.type === 'doughnut') {
      return <Doughnut data={expandedChart.data} options={popupOptions} />;
    }

    if (expandedChart.type === 'line') {
      return <Line data={expandedChart.data} options={popupOptions} />;
    }

    return <Bar data={expandedChart.data} options={popupOptions} />;
  };

  if (isSchoolZone) {
    const states = dashboardData.states || [];
    const selectedStateKey = normalizeKey(selectedStateName);
    const selectedDistrictKey = normalizeKey(selectedDistrictName);

    const selectedDistrictRow = selectedDistrictKey
      ? states.find(
          (row) => normalizeKey(row?.district_name || row?.name) === selectedDistrictKey
        )
      : null;

    const selectedStateRow = selectedStateKey
      ? states.find((row) => normalizeKey(row?.state_name || row?.name) === selectedStateKey)
      : null;

    const resolvedStateKey = selectedStateKey || normalizeKey(selectedDistrictRow?.state_name);
    const schoolListDataset = topSchoolsData || {};
    const nationalTopSchools = Array.isArray(schoolListDataset.national)
      ? schoolListDataset.national
      : [];
    const stateTopSchoolsMap = schoolListDataset.states || {};
    const districtTopSchoolsMap = schoolListDataset.districts || {};

    const districtTopSchools =
      resolvedStateKey && selectedDistrictKey
        ? districtTopSchoolsMap?.[resolvedStateKey]?.[selectedDistrictKey] || []
        : [];

    const stateTopSchools = resolvedStateKey
      ? stateTopSchoolsMap?.[resolvedStateKey] || []
      : [];

    const topSchoolRows = districtTopSchools.length
      ? districtTopSchools.map((row) => ({
          ...row,
          state: selectedStateName || selectedDistrictRow?.state_name || row?.state,
          district: selectedDistrictName || selectedDistrictRow?.district_name || row?.district
        }))
      : stateTopSchools.length
        ? stateTopSchools.map((row) => ({
            ...row,
            state: selectedStateName || selectedDistrictRow?.state_name || row?.state,
            district: row?.district || selectedDistrictName
          }))
        : nationalTopSchools;

    const topSchoolScopeLabel = districtTopSchools.length
      ? `District Level — ${selectedDistrictName}`
      : stateTopSchools.length
        ? `State Level — ${selectedStateName || selectedDistrictRow?.state_name}`
        : 'National Level';

    const scopedStates = selectedDistrictRow
      ? [selectedDistrictRow]
      : selectedStateRow
        ? [selectedStateRow]
        : states;

    const aggregateMetricRows = (rowsSelector) => {
      const map = {};
      scopedStates.forEach((state) => {
        const rows = rowsSelector(state) || [];
        rows.forEach((row) => {
          const label = row?.label || 'Unknown';
          map[label] = (map[label] || 0) + (Number(row?.value) || 0);
        });
      });
      return map;
    };

    const accidentsPerBufferMap = aggregateMetricRows(
      (state) => state.school_zone_metrics?.accidents_per_buffer
    );
    const age618Map = aggregateMetricRows(
      (state) => state.school_zone_metrics?.age_group_accidents
    );
    const timeWindowMap = aggregateMetricRows(
      (state) => state.school_zone_metrics?.time_window_accidents
    );
    const pedestrianMap = aggregateMetricRows(
      (state) => state.school_zone_metrics?.pedestrian_by_zone
    );

    const topEntries = (map, limit = 5) =>
      Object.entries(map)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit);

    const toChartData = (entries) => ({
      labels: entries.map(([label]) => label),
      values: entries.map(([, value]) => value)
    });

    const buildRoadUserTypeChart = (map) => {
      const categoryMap = {
        Driver: 0,
        Passengers: 0,
        Pedestrian: 0
      };

      Object.entries(map).forEach(([label, value]) => {
        const normalized = normalizeKey(label);
        const numericValue = Number(value) || 0;

        if (normalized.includes('zonea') || normalized.includes('driver')) {
          categoryMap.Driver += numericValue;
        } else if (normalized.includes('zoneb') || normalized.includes('passenger')) {
          categoryMap.Passengers += numericValue;
        } else if (normalized.includes('zonec') || normalized.includes('pedestrian')) {
          categoryMap.Pedestrian += numericValue;
        }
      });

      const sortedRows = sortRowsByValueDesc([
        { label: 'Driver', value: categoryMap.Driver },
        { label: 'Passengers', value: categoryMap.Passengers },
        { label: 'Pedestrian', value: categoryMap.Pedestrian }
      ]);

      return {
        labels: sortedRows.map((row) => row.label),
        values: sortedRows.map((row) => row.value)
      };
    };

    const accidentsPerBuffer = toChartData(topEntries(accidentsPerBufferMap));
    const accidentsAge618 = toChartData(topEntries(age618Map));
    const timeWindowAccidents = toChartData(topEntries(timeWindowMap));
  const roadUserTypeAccidents = buildRoadUserTypeChart(pedestrianMap);

    const barColors = ['#42a5f5', '#26c6da', '#5c6bc0', '#66bb6a', '#ffa726'];

    const renderBarCard = (title, chart) => {
      const sortedChartRows = sortChartDataDesc(chart.labels, chart.values);
      const data = {
        labels: sortedChartRows.map((row) => row.label),
        datasets: [{ data: sortedChartRows.map((row) => row.value), backgroundColor: barColors.slice(0, sortedChartRows.length), borderRadius: 4 }]
      };
      const options = { ...chartDefaults, plugins: { ...chartDefaults.plugins, title: titleOpt(title) } };

      return renderExpandableChartCard({
        title,
        onExpand: () => openChartPopup({ type: 'bar', title, data, options }),
        children: <Bar data={data} options={options} />
      });
    };

    const sharedCrashBarTitles = [
      'Crashes by Time',
      'Crashes by Junction Type',
      'Crashes by Vehicle Pair'
    ];
    const sharedCrashBarIndexByTitle = sharedCrashBarTitles.reduce((acc, title, index) => {
      acc[normalizeKey(title)] = index;
      return acc;
    }, {});

    const schoolZoneSharedBars = (bars || [])
      .filter((bar) => Object.prototype.hasOwnProperty.call(sharedCrashBarIndexByTitle, normalizeKey(bar?.title)))
      .sort(
        (a, b) =>
          sharedCrashBarIndexByTitle[normalizeKey(a?.title)] -
          sharedCrashBarIndexByTitle[normalizeKey(b?.title)]
      );

    const schoolZoneDefaultSharedBars = (mortStateBarsData?.default || [])
      .filter((bar) => Object.prototype.hasOwnProperty.call(sharedCrashBarIndexByTitle, normalizeKey(bar?.title)))
      .sort(
        (a, b) =>
          sharedCrashBarIndexByTitle[normalizeKey(a?.title)] -
          sharedCrashBarIndexByTitle[normalizeKey(b?.title)]
      );

    const effectiveSchoolZoneSharedBars = schoolZoneSharedBars.length
      ? schoolZoneSharedBars
      : schoolZoneDefaultSharedBars;

    const renderConfiguredBarCard = (bar) => {
      const sortedRows = sortRowsByValueDesc(bar?.rows || []);
      const labels = sortedRows.map((row) => row?.label || '');
      const values = sortedRows.map((row) => toNumeric(row?.value));
      const data = {
        labels,
        datasets: [{ data: values, backgroundColor: barColors.slice(0, labels.length), borderRadius: 4 }]
      };
      const options = { ...chartDefaults, plugins: { ...chartDefaults.plugins, title: titleOpt(bar?.title || 'Chart') } };

      return renderExpandableChartCard({
        title: bar?.title || 'Chart',
        onExpand: () => openChartPopup({ type: 'bar', title: bar?.title || 'Chart', data, options }),
        children: <Bar data={data} options={options} />
      });
    };

    return (
      <div className="bottom-dashboard">
        <div className="bd-charts-row">
          {renderBarCard('Distribution of accidents mapped to schools', accidentsPerBuffer)}
          {renderBarCard('Accidents (Age 6–18)', accidentsAge618)}
          {renderBarCard('Time Window Accidents', timeWindowAccidents)}
          {renderBarCard('Road user type accident', roadUserTypeAccidents)}
        </div>

        {effectiveSchoolZoneSharedBars.length > 0 && (
          <div className="bd-charts-row">
            {effectiveSchoolZoneSharedBars.map((bar) => renderConfiguredBarCard(bar))}
          </div>
        )}

        <div className="bd-section-card">
          <div className="bd-section-header">
            <span className="bd-section-icon material-icons-outlined">table_chart</span>
            <span className="bd-section-title">Top school list</span>
          </div>
          <div className="bd-section-subtitle">{topSchoolScopeLabel}</div>
          <div className="bd-table-wrap">
            <table className="bd-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th className="bd-th-left">School</th>
                  <th>State</th>
                  <th>District</th>
                  <th>Accidents</th>
                  <th>Safety Score</th>
                </tr>
              </thead>
              <tbody>
                {topSchoolRows.map((row, index) => (
                  <tr key={`${row.school_name || row.name}-${index}`}>
                    <td>{index + 1}</td>
                    <td className="bd-td-name">{row.school_name || row.name || '-'}</td>
                    <td>{row.state || '-'}</td>
                    <td>{row.district || '-'}</td>
                    <td className="bd-td-red">{fmt(row.accidents || 0)}</td>
                    <td className="bd-td-green">{fmt(row.safety_score || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {expandedChart && (
          <div className="bd-modal-overlay" role="dialog" aria-modal="true" aria-label={`${expandedChart.title} popup`} onClick={closeChartPopup}>
            <div className="bd-modal-card" onClick={(event) => event.stopPropagation()}>
              <div className="bd-modal-header">
                <h4>{expandedChart.title}</h4>
                <button
                  type="button"
                  className="bd-modal-close"
                  onClick={closeChartPopup}
                  aria-label="Close popup"
                >
                  ✕
                </button>
              </div>
              <div className="bd-modal-chart-wrap">
                {renderExpandedChart()}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bottom-dashboard">
      {/* ── Agency-wise Summary ─────────────────────────────────── */}
      {agencies.length > 0 && selectedCategory !== 'cluster' && (
        <div className="bd-section-card">
          <div className="bd-section-header">
            <span className="bd-section-icon material-icons-outlined">domain</span>
            <span className="bd-section-title">Agency-wise Summary</span>
          </div>
          <div className="bd-table-wrap">
            <table className="bd-table">
              <thead>
                <tr>
                  <th className="bd-th-left">Agency</th>
                  <th>Length (km)</th>
                  <th>Corridors</th>
                  <th>Accidents</th>
                  <th>Fatalities</th>
                </tr>
              </thead>
              <tbody>
                {agencies.map((a) => (
                  <tr key={a.name}>
                    <td className="bd-td-name">{a.name}</td>
                    <td className="bd-td-blue">{a.length}</td>
                    <td className="bd-td-purple">{a.corridors}</td>
                    <td className="bd-td-green">{a.accidents}</td>
                    <td className="bd-td-red">{a.fatalities}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Rankings Row ────────────────────────────────────────── */}
      {visibleRankings.length > 0 && (
        <div className="bd-rankings-row">
          {visibleRankings.map((ranking, rIdx) => (
            <div key={ranking.title} className="bd-section-card bd-ranking-card">
              <div className="bd-section-header">
                <span className="bd-section-title">{rankingIcons[rIdx] || '📊'} {ranking.title}</span>
              </div>
              <div className="bd-ranking-rows">
                {(ranking.rows || []).map((row, idx) => (
                  <div key={row.name} className="bd-ranking-item">
                    <span className="bd-rank-badge" style={{ background: rankColors[idx] }}>
                      {idx + 1}
                    </span>
                    <span className="bd-rank-name">{row.name}</span>
                    <span className={rankingValueClassByIndex(idx)}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Charts Row — from JSON bars data ──────────────────── */}
      {bars.length > 0 && (
        <div className="bd-charts-row">
          {bars.map((bar) => {
            const sortedRows = sortRowsByValueDesc(bar.rows || []);
            const labels = sortedRows.map((r) => r?.label || '');
            const values = sortedRows.map((r) => toNumeric(r?.value));
            const colors = ['#42a5f5', '#26c6da', '#5c6bc0', '#66bb6a', '#ffa726', '#ef5350'];
            const data = {
              labels,
              datasets: [{ data: values, backgroundColor: colors.slice(0, labels.length), borderRadius: 4 }],
            };
            const options = { ...chartDefaults, plugins: { ...chartDefaults.plugins, title: titleOpt(bar.title) } };
            return (
              renderExpandableChartCard({
                title: bar.title,
                onExpand: () => openChartPopup({ type: 'bar', title: bar.title, data, options }),
                children: <Bar data={data} options={options} />
              })
            );
          })}
        </div>
      )}

      {/* ── Charts Row 2 — Derived from JSON states data ──────── */}
      {(dashboardData.states || []).length > 0 && (() => {
        const states = dashboardData.states;
        const isDistrictScoped = hasScopedSelection && states.some((row) => Boolean(row?.district_name));
        const displayName = (row) => row?.district_name || row?.name || 'Unknown';
        // Crash types aggregated across all states
        const crashTypeMap = {};
        states.forEach((s) => (s.crash_types || []).forEach((ct) => {
          crashTypeMap[ct.name] = (crashTypeMap[ct.name] || 0) + ct.count;
        }));
        const crashTypeRows = Object.entries(crashTypeMap)
          .map(([label, value]) => ({ label, value: toNumeric(value) }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 6);
        const crashTypeLabels = crashTypeRows.map((row) => row.label);
        const crashTypeValues = crashTypeRows.map((row) => row.value);
        const crashTypeColors = ['#42a5f5', '#ef5350', '#ffa726', '#66bb6a', '#ab47bc', '#78909c'];

        // Crash natures aggregated
        const crashNatureMap = {};
        states.forEach((s) => (s.crash_natures || []).forEach((cn) => {
          crashNatureMap[cn.name] = (crashNatureMap[cn.name] || 0) + cn.count;
        }));
        const crashNatureRows = Object.entries(crashNatureMap)
          .map(([label, value]) => ({ label, value: toNumeric(value) }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5);
        const crashNatureLabels = crashNatureRows.map((row) => row.label);
        const crashNatureValues = crashNatureRows.map((row) => row.value);

        /*
        // Violations aggregated
        const violationMap = {};
        states.forEach((s) => (s.violations || []).forEach((v) => {
          violationMap[v.name] = (violationMap[v.name] || 0) + v.count;
        }));
        const aggregatedTopViolations = Object.entries(violationMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, value]) => ({ name, value }));

        const insightTopViolations = (nationalInsights?.top_violations || []).slice(0, 5).map((row) => ({
          name: row?.name,
          value: Number(row?.value) || 0
        }));

        const violationRows = !hasScopedSelection && insightTopViolations.length
          ? insightTopViolations
          : aggregatedTopViolations;
        */

                // Violations aggregated
        const violationMap = {};
        states.forEach((s) => (s.violations || []).forEach((v) => {
          violationMap[v.name] = (violationMap[v.name] || 0) + v.count;
        }));

        const aggregatedTopViolations = Object.entries(violationMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, value]) => ({ name, value }));

        const scopedViolations = hasScopedSelection
          ? (dashboardData.rankings || [])
              .find((ranking) => ranking.title?.includes('Top Violations'))
              ?.rows?.map((row) => ({
                name: row.name,
                value: Number(String(row.value).replace(/,/g, '')) || 0
              })) || []
          : [];

        const insightTopViolations = (nationalInsights?.top_violations || [])
          .slice(0, 5)
          .map((row) => ({
            name: row?.name,
            value: Number(row?.value) || 0
          }));

        const violationRows = hasScopedSelection
          ? scopedViolations
          : insightTopViolations.length
            ? insightTopViolations
            : aggregatedTopViolations;

        const violationLabels = violationRows.map((row) => row.name);
        const violationValues = violationRows.map((row) => row.value);

        // Top 5 states by fatalities and by fatal+grievous
        const defaultTopStatesFatal = [...states]
          .sort((a, b) => b.total_fatalities - a.total_fatalities)
          .slice(0, 5)
          .map((state) => ({ name: displayName(state), value: Number(state.total_fatalities) || 0 }));

        const defaultTopStatesFg = [...states]
          .sort((a, b) => b.fg_covered - a.fg_covered)
          .slice(0, 5)
          .map((state) => ({ name: displayName(state), value: Number(state.fg_covered) || 0 }));

        const insightTopStatesFatal = (nationalInsights?.top_states?.fatalities || []).slice(0, 5).map((row) => ({
          name: row?.name,
          value: Number(row?.value) || 0
        }));
        const insightTopStatesFg = (nationalInsights?.top_states?.fatal_grievous || []).slice(0, 5).map((row) => ({
          name: row?.name,
          value: Number(row?.value) || 0
        }));

        const topStatesFatal = !hasScopedSelection && insightTopStatesFatal.length
          ? insightTopStatesFatal
          : defaultTopStatesFatal;
        const topStatesFg = !hasScopedSelection && insightTopStatesFg.length
          ? insightTopStatesFg
          : defaultTopStatesFg;

        const selectedDistrictKey = normalizeKey(selectedDistrictName);
        const selectedDistrictRows = selectedDistrictName
          ? states.filter((row) => normalizeKey(row?.district_name || row?.name) === selectedDistrictKey)
          : [];

        const topFatalRowsForScope = selectedDistrictRows.length
          ? selectedDistrictRows.map((row) => ({
              name: displayName(row),
              value: Number(row?.total_fatalities) || 0
            }))
          : topStatesFatal;

        const topFgRowsForScope = selectedDistrictRows.length
          ? selectedDistrictRows.map((row) => ({
              name: displayName(row),
              value: Number(row?.fg_covered) || 0
            }))
          : topStatesFg;

        const sortedTopFatalRowsForScope = [...topFatalRowsForScope].sort((a, b) => (b?.value || 0) - (a?.value || 0));
        const sortedTopFgRowsForScope = [...topFgRowsForScope].sort((a, b) => (b?.value || 0) - (a?.value || 0));

        return (
          <div className="bd-charts-row">
            {/* Crash Types Bar */}
            {/* {(() => {
              const title = 'Crashes by Type';
              const data = {
                labels: crashTypeLabels,
                datasets: [{ data: crashTypeValues, backgroundColor: crashTypeColors, borderRadius: 4 }],
              };
              const options = { ...chartDefaults, plugins: { ...chartDefaults.plugins, title: titleOpt(title) } };

              return renderExpandableChartCard({
                title,
                onExpand: () => openChartPopup({ type: 'bar', title, data, options }),
                children: <Bar data={data} options={options} />
              });
            })()} */}

            {/* Crash Natures Bar */}
            {/* {(() => {
              const title = 'Crashes by Collision Nature';
              const data = {
                labels: crashNatureLabels,
                datasets: [{ data: crashNatureValues, backgroundColor: ['#42a5f5', '#ef5350', '#ffa726', '#66bb6a', '#ab47bc'], borderRadius: 4 }],
              };
              const options = { ...chartDefaults, plugins: { ...chartDefaults.plugins, title: titleOpt(title) }, scales: { ...chartDefaults.scales, x: { ...chartDefaults.scales.x, ticks: { color: '#1f2937', font: { size: 9 } } } } };

              return renderExpandableChartCard({
                title,
                onExpand: () => openChartPopup({ type: 'bar', title, data, options }),
                children: <Bar data={data} options={options} />
              });
            })()} */}

            {/* Violations Doughnut */}
            {(() => {
              const title = 'Top Violations';
              const data = {
                labels: violationLabels,
                datasets: [{ data: violationValues, backgroundColor: ['#1976d2', '#e53935', '#ffa726', '#66bb6a', '#ab47bc'] }],
              };
              const options = { responsive: true, maintainAspectRatio: false, plugins: { title: titleOpt(title), legend: { display: true, position: 'bottom', labels: { boxWidth: 9, font: { size: 9 }, color: '#1f2937' } } } };

              return renderExpandableChartCard({
                title,
                onExpand: () => openChartPopup({ type: 'doughnut', title, data, options }),
                children: <Doughnut data={data} options={options} />
              });
            })()}

            

            {/* Top States Fatalities Bar */}
            {/*
            {(() => {
              const title = isDistrictScoped ? 'Top Districts — Fatalities' : 'Top States — Fatalities';
              const data = {
                labels: sortedTopFatalRowsForScope.map((s) => s.name),
                datasets: [{ data: sortedTopFatalRowsForScope.map((s) => s.value), backgroundColor: ['#e53935', '#fb8c00', '#ffa726', '#66bb6a', '#42a5f5'], borderRadius: 4 }],
              };
              const options = { ...chartDefaults, plugins: { ...chartDefaults.plugins, title: titleOpt(title) }, scales: { ...chartDefaults.scales, x: { ...chartDefaults.scales.x, ticks: { color: '#1f2937', font: { size: 9 } } } } };

              return renderExpandableChartCard({
                title,
                onExpand: () => openChartPopup({ type: 'bar', title, data, options }),
                children: <Bar data={data} options={options} />
              });
            })()}
            */}

            {/* Top States F+G Line */}
            {/*
            {(() => {
              const title = isDistrictScoped ? 'Top Districts — Fatal + Grievous' : 'Top States — Fatal + Grievous';
              const data = {
                labels: topFgRowsForScope.map((s) => s.name),
                datasets: [{
                  data: topFgRowsForScope.map((s) => s.value),
                  borderColor: '#1976d2', backgroundColor: 'rgba(25,118,210,0.1)',
                  fill: true, tension: 0.3, pointRadius: 5, pointBackgroundColor: '#1976d2', borderWidth: 2.5,
                }],
              };
              const options = { ...chartDefaults, plugins: { ...chartDefaults.plugins, title: titleOpt(title) }, scales: { ...chartDefaults.scales, y: { ...chartDefaults.scales.y, beginAtZero: false } } };

              return renderExpandableChartCard({
                title,
                onExpand: () => openChartPopup({ type: 'line', title, data, options }),
                children: <Line data={data} options={options} />
              });
            })()}
              */}
          </div>
        );
      })()}

      {expandedChart && (
        <div className="bd-modal-overlay" role="dialog" aria-modal="true" aria-label={`${expandedChart.title} popup`} onClick={closeChartPopup}>
          <div className="bd-modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="bd-modal-header">
              <h4>{expandedChart.title}</h4>
              <button
                type="button"
                className="bd-modal-close"
                onClick={closeChartPopup}
                aria-label="Close popup"
              >
                ✕
              </button>
            </div>
            <div className="bd-modal-chart-wrap">
              {renderExpandedChart()}
            </div>
          </div>
        </div>
      )}

      {/* ── Top States Table ───────────────────────────────────── */}
      {/* {(dashboardData.states || []).length > 0 && (
        <div className="bd-section-card">
          <div className="bd-section-header">
            <span className="bd-section-icon material-icons-outlined">table_chart</span>
            <span className="bd-section-title">Top States — Fatal + Grievous</span>
          </div>
          <div className="bd-table-wrap">
            <table className="bd-table">
              <thead>
                <tr>
                  <th className="bd-th-left">State</th>
                  <th>F+G Covered</th>
                  <th>Fatalities</th>
                  <th>Grievous</th>
                  <th>Blackspots</th>
                </tr>
              </thead>
              <tbody>
                {[...dashboardData.states]
                  .sort((a, b) => b.fg_covered - a.fg_covered)
                  .slice(0, 8)
                  .map((s) => (
                    <tr key={s.name}>
                      <td className="bd-td-name">{s.name}</td>
                      <td className="bd-td-green">{fmt(s.fg_covered)}</td>
                      <td className="bd-td-red">{fmt(s.total_fatalities)}</td>
                      <td className="bd-td-orange">{fmt(s.total_grievous)}</td>
                      <td className="bd-td-purple">{fmt(s.blackspots)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )} */}

      {top20Corridors.length > 0 && (
  <div className="bd-section-card">
    <div className="bd-section-header">
      <span className="bd-section-icon material-icons-outlined">table_chart</span>
      <span className="bd-section-title">Top 20 Corridors (sorted by Fatal+Grievous Accidents)</span>
    </div>

    <div className="bd-table-wrap">
      <table className="bd-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th className="bd-th-left">Road</th>
            <th className="bd-th-left">Corridor</th>
            <th>{hasScopedSelection ? 'District' : 'State'}</th>
            <th>Fatal + Grievous Accidents</th>
            <th>Fatalities</th>
            <th>Length (km)</th>
          </tr>
        </thead>
        <tbody>
          {top20Corridors.map((row, index) => (
            <tr key={`${row.corridor_name}-${index}`}>
              <td>{index + 1}</td>
              <td className="bd-td-name">{row.road_name}</td>
              <td className="bd-td-name">{row.corridor_name}</td>
              <td>
                {selectedDistrictName
                  ? selectedDistrictName
                  : hasScopedSelection
                    ? (row.district || '-')
                    : (row.state || '-')}
              </td>
              <td className="bd-td-green">{fmt(row.fatal_grievous_accidents)}</td>
              <td className="bd-td-red">{fmt(row.fatalities)}</td>
              <td className="bd-td-blue">{row.length_km}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)}

    </div>
  );
}
