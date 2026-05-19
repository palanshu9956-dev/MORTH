import React, { useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { getDashboardDataForSelection, getDataByLevel, getClusterTopViolations } from '../data/morthData';
import topSchoolsData from '../data/schools-zone-top-schools.json';
import schoolsZoneStateTopSchoolsData from '../data/schools-zone-state-top-schools.json';
import schoolsZoneDistrictTopSchoolsData from '../data/schools-zone-district-top-schools.json';
import mortStateBarsData from '../data/data/mort-state-bars.json';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend, Filler
);

const barValueLabelPlugin = {
  id: 'barValueLabel',
  afterDatasetsDraw(chart, _args, pluginOptions) {
    if (!pluginOptions?.enabled || chart.config.type !== 'bar') return;

    const { ctx } = chart;
    chart.data.datasets.forEach((dataset, datasetIndex) => {
      const meta = chart.getDatasetMeta(datasetIndex);
      if (meta.hidden) return;

      meta.data.forEach((barElement, index) => {
        const rawValue = dataset.data?.[index];
        const value = Number(rawValue);
        if (!Number.isFinite(value)) return;

        ctx.save();
        ctx.fillStyle = pluginOptions.color || '#111827';
        ctx.font = pluginOptions.font || '600 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(value.toLocaleString('en-IN'), barElement.x, barElement.y - 4);
        ctx.restore();
      });
    });
  }
};

const doughnutValueLabelPlugin = {
  id: 'doughnutValueLabel',
  afterDatasetsDraw(chart, _args, pluginOptions) {
    if (!pluginOptions?.enabled || chart.config.type !== 'doughnut') return;

    const { ctx, data, chartArea } = chart;
    const meta = chart.getDatasetMeta(0);
    if (meta.hidden) return;

    const centerX = (chartArea.left + chartArea.right) / 2;
    const centerY = (chartArea.top + chartArea.bottom) / 2;

    meta.data.forEach((datapoint, index) => {
      const value = data.datasets[0]?.data?.[index];
      if (!Number.isFinite(value)) return;

      const { x: pointX, y: pointY } = datapoint.getProps(['x', 'y']);
      const distance = 0.75;
      const x = centerX + (pointX - centerX) * distance;
      const y = centerY + (pointY - centerY) * distance;

      ctx.save();
      ctx.fillStyle = pluginOptions.color || '#fff';
      ctx.font = pluginOptions.font || '600 11px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(value.toLocaleString('en-IN'), x, y);
      ctx.restore();
    });
  }
};

ChartJS.register(barValueLabelPlugin, doughnutValueLabelPlugin);

const chartDefaults = {
  responsive: true,
  maintainAspectRatio: false,
  layout: { padding: { top: 12 } },
  plugins: {
    legend: { display: false },
    barValueLabel: { enabled: false }
  },
  scales: {
    x: { grid: { display: false }, ticks: { color: '#1f2937',weight:'bold', font: { size: 12 }, maxRotation: 30 } },
    y: { grid: { color: '#f0f0f0' }, ticks: { color: '#1f2937', font: { size: 11 } }, beginAtZero: true },
  },
};

const titleOpt = (text) => ({ display: true, text, font: { size: 14, weight: '700' }, color: '#1a1a2e', padding: { bottom: 18 } });

// ── Rank badge colors ─────────────────────────────────────────────────────────
const rankColors = ['#f59e0b', '#94a3b8', '#b45309'];

// ── Component ─────────────────────────────────────────────────────────────────
export default function BottomDashboard({ selectedCategory, selectedStateName, selectedDistrictName }) {
  const isSchoolZone = selectedCategory === 'schools-zone';
  const isDbScanNonNh = selectedCategory === 'cluster';
  const selectionData = getDataByLevel({
    category: selectedCategory,
    stateName: selectedStateName,
    districtName: selectedDistrictName
  });
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
  const top20Clusters = dashboardData.top20Clusters || [];
  const [expandedChart, setExpandedChart] = useState(null);
  const hasScopedSelection = Boolean(selectedStateName || selectedDistrictName);
  const hasNoSelectionData = hasScopedSelection && !selectionData;

  const normalizeKey = (value) =>
    String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  const toNumeric = (value) => Number(value) || 0;
  const sortRowsByValueDesc = (rows = []) =>
    [...rows].sort((a, b) => toNumeric(b?.value) - toNumeric(a?.value));
  const isAgeGroupTitle = (title) => {
    const titleKey = normalizeKey(title);
    return (
      titleKey === normalizeKey('Accidents by Age Group') ||
      titleKey === normalizeKey('Accidents by Age Groups')
    );
  };
  const getAgeOrderValue = (label) => {
    const text = String(label || '').toLowerCase();

    if (text.includes('missing') || text.includes('invalid') || text.includes('unknown')) {
      return Number.POSITIVE_INFINITY;
    }

    const numericMatches = text.match(/\d+/g);
    if (!numericMatches || numericMatches.length === 0) {
      return Number.POSITIVE_INFINITY - 1;
    }

    const lowerBound = Number(numericMatches[0]);
    if (!Number.isFinite(lowerBound)) return Number.POSITIVE_INFINITY - 1;

    // Put open-ended bins like "60+" after closed ranges that start at the same age.
    return lowerBound + (text.includes('+') ? 0.5 : 0);
  };
  const sortRowsByAgeAsc = (rows = []) =>
    [...rows].sort((a, b) => {
      const ageDiff = getAgeOrderValue(a?.label) - getAgeOrderValue(b?.label);
      if (ageDiff !== 0) return ageDiff;
      return String(a?.label || '').localeCompare(String(b?.label || ''));
    });
  const PREVIEW_ROW_LIMIT = 4;
  const getBarRowsForDisplay = (bar = {}) => {
    const expandedRows = Array.isArray(bar?.rows_expanded) ? bar.rows_expanded : [];
    const baseRows = Array.isArray(bar?.rows) ? bar.rows : [];
    return expandedRows.length ? expandedRows : baseRows;
  };
  const getPreviewRowsForCard = (bar = {}) => {
    const allRows = getBarRowsForDisplay(bar);
    if (allRows.length <= PREVIEW_ROW_LIMIT) return allRows;

    const titleKey = normalizeKey(bar?.title);
    const keepOriginalOrder =
      titleKey === normalizeKey('Crashes by Time') ||
      titleKey === normalizeKey('Accidents by Time Window');
    if (keepOriginalOrder) {
      return allRows.slice(0, PREVIEW_ROW_LIMIT);
    }

    if (isAgeGroupTitle(bar?.title)) {
      return sortRowsByAgeAsc(allRows);
    }

    return sortRowsByValueDesc(allRows).slice(0, PREVIEW_ROW_LIMIT);
  };
  const barPalette = ['#42a5f5', '#26c6da', '#5c6bc0', '#66bb6a', '#ffa726', '#ef5350', '#8d6e63', '#ab47bc', '#26a69a', '#d4e157'];
  const getBarColors = (count = 0) =>
    Array.from({ length: count }, (_, index) => barPalette[index % barPalette.length]);
  const sortChartDataDesc = (labels = [], values = []) =>
    labels
      .map((label, index) => ({ label, value: toNumeric(values[index]) }))
      .sort((a, b) => b.value - a.value);
  const normalizeDbScanTimeLabel = (label) => {
    const key = normalizeKey(label);
    if (key.includes('morning')) return 'Morning (5am - 10am)';
    if (key.includes('afternoon')) return 'Afternoon (10am - 4pm)';
    if (key.includes('evening')) return 'Evening (4pm - 8pm)';
    if (key.includes('night')) return 'Night (8pm - 5am)';
    return label;
  };

  const fmt = (n) => Number(String(n).replace(/,/g, '')).toLocaleString('en-IN');
  const rankingValueClassByIndex = (idx) => {
    if (idx === 0) return 'bd-rank-value bd-rank-value-top';
    if (idx === 1) return 'bd-rank-value bd-rank-value-mid';
    return 'bd-rank-value bd-rank-value-base';
  };

  const rankingIcons = ['🛣️', '⚠️', '🏆'];
  const noDataChartTitles = (() => {
    const configuredTitles = (bars || [])
      .map((bar) => bar?.title)
      .filter(Boolean);

    const uniqueConfiguredTitles = Array.from(new Set(configuredTitles));
    if (uniqueConfiguredTitles.length > 0) {
      return uniqueConfiguredTitles.slice(0, 4);
    }

    const fallbackByCategory = {
      cluster: ['Accident Severity', 'Crashes by Time', 'Crashes by Vehicle Pair', 'Year-wise Crashes'],
      'schools-zone': ['Distribution of accidents mapped to schools', 'Accidents by Age Group', 'Accidents by Time Window', 'Pedestrian Accidents Involvement by Vehicle Type'],
      irc: ['Accident Severity', 'Crashes by Type', 'Crashes by Collision Nature', 'Crashes by Time'],
      mort: ['Accident Severity', 'Crashes by Type', 'Crashes by Collision Nature', 'Crashes by Time']
    };

    return fallbackByCategory[selectedCategory] || fallbackByCategory.mort;
  })();
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

  const selectedStateKey = normalizeKey(selectedStateName);
  const selectedDistrictKey = normalizeKey(selectedDistrictName);
  const top20ClustersScoped = (top20Clusters || [])
    .filter((row) => {
      if (selectedDistrictKey) {
        return normalizeKey(row?.district) === selectedDistrictKey;
      }

      if (selectedStateKey) {
        return normalizeKey(row?.state) === selectedStateKey;
      }

      return true;
    })
    .sort((a, b) => (Number(b?.accident_count) || 0) - (Number(a?.accident_count) || 0))
    .slice(0, 20);

  const fatalRatio = 0.1625;
  const grievousRatio = 0.366;
  const minorRatio = 0.365;

  // For cluster category, prefer actual data from JSON; for others, use ratio-based calculation
  const calculateSeverity = (accidentCount, clusterData = null) => {
    // If cluster data with actual accident counts is provided, use it
    if (clusterData && selectedCategory === 'cluster') {
      return {
        fatal: Number(clusterData?.fatal_accidents) || 0,
        grievous: Number(clusterData?.grievous_accidents) || 0,
        minor: Number(clusterData?.minor_accidents) || 0
      };
    }
    
    // Otherwise, use ratio-based calculation
    return {
      fatal: Math.max(1, Math.round(accidentCount * fatalRatio)),
      grievous: Math.max(1, Math.round(accidentCount * grievousRatio)),
      minor: Math.max(1, Math.round(accidentCount * minorRatio))
    };
  };

  const top20ClusterFallbackRows = selectedDistrictName
    ? (selectionData
        ? [
            {
              cluster_id: selectionData?.district_name || selectionData?.name || selectedDistrictName,
              state: selectionData?.state_name || selectedStateName || '-',
              district: selectionData?.district_name || selectedDistrictName,
              accident_count:
                Number(selectionData?.total_accidents) ||
                Number(selectionData?.total_fg) ||
                Number(selectionData?.fg_covered) ||
                0,
              ...calculateSeverity(
                Number(selectionData?.total_accidents) ||
                Number(selectionData?.total_fg) ||
                Number(selectionData?.fg_covered) ||
                0,
                selectionData
              )
            }
          ]
        : [])
    : (selectedStateName
        ? (dashboardData.states || [])
            .map((row) => {
              const count = Number(row?.total_accidents) ||
                Number(row?.total_fg) ||
                Number(row?.fg_covered) ||
                0;
              return {
                cluster_id: row?.district_name || row?.name || '-',
                state: row?.state_name || selectedStateName || '-',
                district: row?.district_name || row?.name || '-',
                accident_count: count,
                ...calculateSeverity(count, row)
              };
            })
            .sort((a, b) => (Number(b?.accident_count) || 0) - (Number(a?.accident_count) || 0))
            .slice(0, 20)
        : []);

  const top20ClustersForDisplay = top20ClustersScoped.length
    ? top20ClustersScoped
    : top20ClusterFallbackRows;

  const clusterScopeLabel = selectedDistrictName
    ? String(selectedDistrictName).toUpperCase()
    : selectedStateName
      ? String(selectedStateName).toUpperCase()
      : 'INDIA';

  const clusterTableTitle = `Top 20 Clusters by Accident Count — ${clusterScopeLabel}`;

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

  if (hasNoSelectionData) {
    const scopeLabel = selectedDistrictName
      ? `district ${selectedDistrictName}`
      : `state ${selectedStateName}`;

    return (
      <div className="bottom-dashboard">
        <div className="dashboard-no-data dashboard-no-data-rich" role="status" aria-live="polite">
          <div className="dashboard-no-data-heading-row">
            <span className="dashboard-no-data-icon" aria-hidden="true">ⓘ</span>
            <span className="dashboard-no-data-heading">Data Not Available</span>
          </div>
          <p className="dashboard-no-data-text">
            {scopeLabel.charAt(0).toUpperCase() + scopeLabel.slice(1)} has no accident records in the database.
          </p>
        </div>

        <div className="dashboard-no-data-grid" aria-hidden="true">
          {noDataChartTitles.map((title) => (
            <article key={title} className="bd-empty-chart-card">
              <span className="material-icons-outlined bd-empty-chart-icon">bar_chart</span>
              <h4 className="bd-empty-chart-title">{title}</h4>
              <span className="bd-empty-chart-subtitle">Data Not Available</span>
            </article>
          ))}
        </div>
      </div>
    );
  }

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
    const stateTopSchoolsMap = schoolsZoneStateTopSchoolsData.states || {};
    const districtTopSchoolsContainer =
      schoolsZoneDistrictTopSchoolsData.districts ||
      schoolsZoneDistrictTopSchoolsData.states ||
      {};

    // const stateTopSchools = resolvedStateKey
    //   ? stateTopSchoolsMap?.[resolvedStateKey] || []
    //   : [];
    const selectedStateUpper = String(
      selectedStateName || selectedDistrictRow?.state_name || ''
    ).toUpperCase().trim();
    const selectedDistrictLabel = selectedDistrictName || selectedDistrictRow?.district_name || '';

    const stateTopSchools = selectedStateUpper
      ? stateTopSchoolsMap?.[selectedStateUpper] || []
      : [];

    const districtRowsForStateSelection = selectedStateUpper
      ? districtTopSchoolsContainer?.[selectedStateUpper] || null
      : null;
    const selectedDistrictUpper = String(selectedDistrictLabel || '').toUpperCase().trim();
    const districtRowsFromNestedMap =
      districtRowsForStateSelection &&
      !Array.isArray(districtRowsForStateSelection) &&
      selectedDistrictUpper
        ? districtRowsForStateSelection?.[selectedDistrictUpper] || []
        : [];

    const districtRowsForState = Array.isArray(districtRowsForStateSelection)
      ? districtRowsForStateSelection
      : Object.values(districtRowsForStateSelection || {}).flat();
    const districtRowsAcrossStates = Object.values(districtTopSchoolsContainer || {}).flatMap(
      (stateValue) =>
        Array.isArray(stateValue)
          ? stateValue
          : Object.values(stateValue || {}).flat()
    );
    const districtRowsSource = districtRowsForState.length
      ? districtRowsForState
      : districtRowsAcrossStates;
    const districtTopSchools = selectedDistrictLabel
      ? districtRowsFromNestedMap.length
        ? districtRowsFromNestedMap
        : districtRowsSource.filter(
            (row) => normalizeKey(row?.district) === normalizeKey(selectedDistrictLabel)
          )
      : [];

    const topSchoolRows = districtTopSchools.length
      ? districtTopSchools.map((row) => ({
          ...row,
          state: selectedStateName || selectedDistrictRow?.state_name || row?.state,
          district: selectedDistrictLabel || row?.district
        }))
      : stateTopSchools.length
        ? stateTopSchools.map((row) => ({
            ...row,
            state: selectedStateName || selectedDistrictRow?.state_name || row?.state,
            district: row?.district || selectedDistrictLabel
          }))
        : nationalTopSchools;

    const topSchoolScopeLabel = districtTopSchools.length
      ? `District Level — ${selectedDistrictLabel}`
      : stateTopSchools.length
        ? `State Level — ${selectedStateName || selectedDistrictRow?.state_name}`
        : 'National Level';

   

    const scopedStates = selectedDistrictRow
      ? [selectedDistrictRow]
      : selectedStateRow
        ? [selectedStateRow]
        : states;

    /*    

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

    */

    const aggregateMetricRows = (rowsSelector) => {
      const map = {};

      scopedStates.forEach((state) => {
        const rows = rowsSelector(state);

        if (!Array.isArray(rows)) return;

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

    const age618Map = (() => {
      const map = {};

      scopedStates.forEach((state) => {
        const ageMetric = state?.school_zone_metrics?.accidents_age_6_18;

        if (Array.isArray(ageMetric)) {
          ageMetric.forEach((row) => {
            const label = row?.label || '6-18 yrs';
            map[label] = (map[label] || 0) + (Number(row?.value) || 0);
          });
          return;
        }

        const value = Number(ageMetric);
        if (!Number.isFinite(value)) return;
        map['6-18 yrs'] = (map['6-18 yrs'] || 0) + value;
      });

      return map;
    })();

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
    const accidentsAge618Rows = sortRowsByAgeAsc(
      Object.entries(age618Map).map(([label, value]) => ({ label, value: toNumeric(value) }))
    );
    const accidentsAge618 = {
      labels: accidentsAge618Rows.map((row) => row.label),
      values: accidentsAge618Rows.map((row) => row.value)
    };
    const timeWindowAccidents = toChartData(topEntries(timeWindowMap));
  const roadUserTypeAccidents = buildRoadUserTypeChart(pedestrianMap);

    const barColors = ['#42a5f5', '#26c6da', '#5c6bc0', '#66bb6a', '#ffa726'];

    const renderBarCard = (title, chart) => {
      const chartRows = chart.labels.map((label, index) => ({
        label,
        value: toNumeric(chart.values[index])
      }));
      const sortedChartRows = isAgeGroupTitle(title)
        ? sortRowsByAgeAsc(chartRows)
        : sortChartDataDesc(chart.labels, chart.values);
      const data = {
        labels: sortedChartRows.map((row) => row.label),
        datasets: [{ data: sortedChartRows.map((row) => row.value), backgroundColor: barColors.slice(0, sortedChartRows.length), borderRadius: 4 }]
      };
      const options = {
        ...chartDefaults,
        plugins: {
          ...chartDefaults.plugins,
          title: titleOpt(title),
          barValueLabel: { enabled: true }
        }
      };

      return renderExpandableChartCard({
        title,
        onExpand: () => openChartPopup({ type: 'bar', title, data, options }),
        children: <Bar data={data} options={options} />
      });
    };

    const sharedCrashBarTitles = [
      'Distribution of accidents mapped to school',
      'Accidents by Year',
      'Accidents by Time Window',
      'Accidents by Age Group',
      'Accidents by Junction Type',
      'Accidents by Vehicle Pair',
      'Accidents by Type',
      'Accidents by Nature',
      'Pedestrian Accidents Involvement by Vehicle Type',
      'Pedestrian Fatalities by Vehicle Type',
      'Violations'
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
      const isViolationChart = normalizeKey(bar?.title).includes('violation');

      const buildBarData = (rows = []) => {
        const sortedRows = isAgeGroupTitle(bar?.title)
          ? sortRowsByAgeAsc(rows)
          : sortRowsByValueDesc(rows);
        const labels = sortedRows.map((row) => row?.label || '');
        const values = sortedRows.map((row) => toNumeric(row?.value));

        return {
          labels,
          datasets: [{ data: values, backgroundColor: getBarColors(labels.length), borderRadius: 4 }]
        };
      };

      const cardData = buildBarData(getPreviewRowsForCard(bar));
      const popupData = buildBarData(getBarRowsForDisplay(bar));

      const cardOptions = {
        ...chartDefaults,
        plugins: {
          ...chartDefaults.plugins,
          title: titleOpt(bar?.title || 'Chart'),
          barValueLabel: { enabled: true }
        }
      };

      const popupOptions = {
        ...cardOptions,
        scales: {
          ...chartDefaults.scales,
          x: {
            ...chartDefaults.scales.x,
            ticks: {
              ...(chartDefaults.scales?.x?.ticks || {}),
              autoSkip: false,
              maxRotation: 55,
              minRotation: 45
            }
          }
        }
      };

      const doughnutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: titleOpt(bar?.title || 'Chart'),
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              color: '#1f2937',
              boxWidth: 11,
              font: { size: 11 }
            }
          }
        }
      };

      if (isViolationChart) {
        return renderExpandableChartCard({
          title: bar?.title || 'Chart',
          onExpand: () =>
            openChartPopup({
              type: 'doughnut',
              title: bar?.title || 'Chart',
              data: popupData,
              options: doughnutOptions
            }),
          children: <Doughnut data={cardData} options={doughnutOptions} />
        });
      }

      return renderExpandableChartCard({
        title: bar?.title || 'Chart',
        onExpand: () =>
          openChartPopup({
            type: 'bar',
            title: bar?.title || 'Chart',
            data: popupData,
            options: popupOptions
          }),
        children: <Bar data={cardData} options={cardOptions} />
      });
    };

    return (
      <div className="bottom-dashboard">
        {dashboardData.school_zone_metrics && (
        <div className="bd-charts-row">
          {renderBarCard('Distribution of accidents mapped to schools', accidentsPerBuffer)}
          {renderBarCard('Accidents by Age Groups', accidentsAge618)}
          {renderBarCard('Time Window Accidents', timeWindowAccidents)}
          {/*
          {renderBarCard('Road user type accident', roadUserTypeAccidents)}
          */}
          {roadUserTypeAccidents.values?.some((value) => value > 0) &&
            renderBarCard('Road user type accident', roadUserTypeAccidents)}
        </div>
        )}

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
            <table className="bd-table bd-table-ranked">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th className="bd-th-left">School</th>
                  <th className="bd-th-left">State</th>
                  <th className="bd-th-left">District</th>
                  <th>Accidents</th>
                  {/*<th>Safety Score</th>*/}
                </tr>
              </thead>
              <tbody>
                {topSchoolRows.map((row, index) => (
                  <tr key={`${row.school_name || row.name}-${index}`}>
                    <td>{index + 1}</td>
                    <td className="bd-td-name" title={row.school_name || row.name || '-'}>{row.school_name || row.name || '-'}</td>
                    <td className="bd-td-left bd-td-state" title={row.state || '-'}>{row.state || '-'}</td>
                    <td className="bd-td-left bd-td-district" title={row.district || '-'}>{row.district || '-'}</td>
                    <td className="bd-td-red">{fmt(row.accidents || 0)}</td>
                    {/*<td className="bd-td-green">{fmt(row.safety_score || 0)}</td>*/}
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

  const states = dashboardData.states || [];
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

  // For cluster category, get violations from the specialized JSON files
  let clusterViolations = [];
  if (selectedCategory === 'cluster') {
    if (selectedDistrictName && selectedStateName) {
      clusterViolations = getClusterTopViolations.byDistrict(selectedStateName, selectedDistrictName);
    } else if (selectedStateName) {
      clusterViolations = getClusterTopViolations.byState(selectedStateName);
    } else {
      clusterViolations = getClusterTopViolations.national();
    }
  }

  const topViolationRows = selectedCategory === 'cluster' && clusterViolations.length > 0
    ? clusterViolations
    : hasScopedSelection
      ? scopedViolations
      : insightTopViolations.length
        ? insightTopViolations
        : aggregatedTopViolations;

  const renderTopViolationsCard = () => {
    if (!topViolationRows.length) return null;

    const title = 'Top Violations';
    
    const isClusterViolations = selectedCategory === 'cluster';
    
    if (isClusterViolations) {
      // Doughnut chart for cluster category with numbered labels and values on segments
      const sortedRows = [...topViolationRows].sort((a, b) => b.value - a.value).slice(0, 5);
      const data = {
        labels: sortedRows.map((row, idx) => `${idx + 1}. ${row.name}`),
        datasets: [{ 
          data: sortedRows.map((row) => row.value), 
          backgroundColor: ['#3b9be0', '#f45b85', '#f6a340', '#66bb6a', '#ab47bc'],
          borderRadius: 4
        }],
      };
      const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: titleOpt(title),
          legend: {
            display: true,
            position: 'bottom',
            labels: { boxWidth: 11, font: { size: 11 }, color: '#1f2937' }
          },
          doughnutValueLabel: { enabled: true, color: '#fff', font: '600 12px Arial' }
        }
      };

      return renderExpandableChartCard({
        title,
        onExpand: () => openChartPopup({ type: 'doughnut', title, data, options }),
        children: <Doughnut data={data} options={options} />
      });
    } else {
      // Doughnut chart for other categories
      const data = {
        labels: topViolationRows.map((row) => row.name),
        datasets: [{ data: topViolationRows.map((row) => row.value), backgroundColor: ['#1976d2', '#e53935', '#ffa726', '#66bb6a', '#ab47bc'] }],
      };
      const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: titleOpt(title),
          legend: {
            display: true,
            position: 'bottom',
            labels: { boxWidth: 11, font: { size: 11 }, color: '#1f2937' }
          }
        }
      };

      return renderExpandableChartCard({
        title,
        onExpand: () => openChartPopup({ type: 'doughnut', title, data, options }),
        children: <Doughnut data={data} options={options} />
      });
    }
  };

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
      {false && visibleRankings.length > 0 && (
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
      {(bars.length > 0 || topViolationRows.length > 0) && (
        <div className="bd-charts-row">
          {bars.map((bar) => {
            const buildBarData = (rows = []) => {
              const sortedRows = bar.title === 'Crashes by Time' ? rows : sortRowsByValueDesc(rows);
              const labels = sortedRows.map((r) => {
                const rawLabel = r?.label || '';
                return isDbScanNonNh && bar.title === 'Crashes by Time'
                  ? normalizeDbScanTimeLabel(rawLabel)
                  : rawLabel;
              });
              const values = sortedRows.map((r) => toNumeric(r?.value));

              return {
                labels,
                datasets: [{ data: values, backgroundColor: getBarColors(labels.length), borderRadius: 4 }],
              };
            };

            const cardData = buildBarData(getPreviewRowsForCard(bar));
            const popupData = buildBarData(getBarRowsForDisplay(bar));
            const isVehiclePairChart = normalizeKey(bar?.title) === normalizeKey('Crashes by Vehicle Pair');
            const cardOptions = {
              ...chartDefaults,
              plugins: {
                ...chartDefaults.plugins,
                title: titleOpt(bar.title),
                barValueLabel: { enabled: true }
              },
              scales: chartDefaults.scales
            };

            const popupOptions = {
              ...cardOptions,
              scales: isVehiclePairChart
                ? {
                    ...chartDefaults.scales,
                    x: {
                      ...chartDefaults.scales.x,
                      ticks: {
                        ...(chartDefaults.scales?.x?.ticks || {}),
                        autoSkip: false,
                        maxRotation: 55,
                        minRotation: 45
                      }
                    }
                  }
                : chartDefaults.scales
            };
            return (
              renderExpandableChartCard({
                title: bar.title,
                onExpand: () => openChartPopup({ type: 'bar', title: bar.title, data: popupData, options: popupOptions }),
                children: <Bar data={cardData} options={cardOptions} />
              })
            );
          })}
          {renderTopViolationsCard()}
        </div>
      )}

      {/* ── Charts Row 2 — Derived from JSON states data ──────── */}
      {(isDbScanNonNh || (hasScopedSelection && selectedCategory === 'mort')) && states.length > 0 && (() => {
        const isDistrictScoped = hasScopedSelection && states.some((row) => Boolean(row?.district_name));
        const displayName = (row) => row?.district_name || row?.name || 'Unknown';
        
        // For scoped selection (state/district level), aggregate ONLY from the selected scope, not from peer states/clusters
        const aggregationSource = (hasScopedSelection && (selectedCategory === 'mort' || selectedCategory === 'cluster')) 
          ? (selectionData ? [selectionData] : states)
          : states;
        
        // Crash types aggregated across all states
        const crashTypeMap = {};
        aggregationSource.forEach((s) => (s.crash_types || []).forEach((ct) => {
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
        aggregationSource.forEach((s) => (s.crash_natures || []).forEach((cn) => {
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

        const allScopeFatalRows = states.map((row) => ({
          name: displayName(row),
          value: Number(row?.total_fatalities) || 0
        }));
        const allScopeFgRows = states.map((row) => ({
          name: displayName(row),
          value: Number(row?.fg_covered) || 0
        }));

        const topFatalRowsForScope = hasScopedSelection
          ? [...allScopeFatalRows].sort((a, b) => (b.value || 0) - (a.value || 0)).slice(0, 5)
          : topStatesFatal;

        const topFgRowsForScope = hasScopedSelection
          ? [...allScopeFgRows].sort((a, b) => (b.value || 0) - (a.value || 0)).slice(0, 5)
          : topStatesFg;

        const popupFatalRowsForScope = [...allScopeFatalRows].sort((a, b) => (b.value || 0) - (a.value || 0));
        const popupFgRowsForScope = [...allScopeFgRows].sort((a, b) => (b.value || 0) - (a.value || 0));

        const sortedTopFatalRowsForScope = [...topFatalRowsForScope].sort((a, b) => (b?.value || 0) - (a?.value || 0));
        const sortedTopFgRowsForScope = [...topFgRowsForScope].sort((a, b) => (b?.value || 0) - (a?.value || 0));
        const sortedPopupFatalRowsForScope = [...popupFatalRowsForScope].sort((a, b) => (b?.value || 0) - (a?.value || 0));
        const sortedPopupFgRowsForScope = [...popupFgRowsForScope].sort((a, b) => (b?.value || 0) - (a?.value || 0));

        return (
          <div className="bd-charts-row">
            {/* Crash Types Bar */}
            {(() => {
              const title = 'Crashes by Type';
              const data = {
                labels: crashTypeLabels,
                datasets: [{ data: crashTypeValues, backgroundColor: crashTypeColors, borderRadius: 4 }],
              };
              const options = {
                ...chartDefaults,
                plugins: {
                  ...chartDefaults.plugins,
                  title: titleOpt(title),
                  barValueLabel: { enabled: true }
                }
              };

              return renderExpandableChartCard({
                title,
                onExpand: () => openChartPopup({ type: 'bar', title, data, options }),
                children: <Bar data={data} options={options} />
              });
            })()} 

            {/* Crash Natures Bar */}
            {(() => {
              const title = 'Crashes by Collision Nature';
              const data = {
                labels: crashNatureLabels,
                datasets: [{ data: crashNatureValues, backgroundColor: ['#42a5f5', '#ef5350', '#ffa726', '#66bb6a', '#ab47bc'], borderRadius: 4 }],
              };
              const options = {
                ...chartDefaults,
                plugins: {
                  ...chartDefaults.plugins,
                  title: titleOpt(title),
                  barValueLabel: { enabled: true }
                },
                scales: {
                  ...chartDefaults.scales,
                  x: { ...chartDefaults.scales.x, ticks: { color: '#1f2937', font: { size: 11 } } }
                }
              };

              return renderExpandableChartCard({
                title,
                onExpand: () => openChartPopup({ type: 'bar', title, data, options }),
                children: <Bar data={data} options={options} />
              });
            })()} 

            {/* Top States / Top Districts (by Fatalities) Bar */}
            {isDbScanNonNh && (() => {
              const title = isDistrictScoped ? 'Top Districts (by Fatalities)' : 'Top States (by Fatalities)';
              const cardFatalRowsForScope = sortedPopupFatalRowsForScope.slice(0, 5);
              const cardData = {
                labels: cardFatalRowsForScope.map((s) => s.name),
                datasets: [{ data: cardFatalRowsForScope.map((s) => s.value), backgroundColor: ['#e53935', '#fb8c00', '#ffa726', '#66bb6a', '#42a5f5'], borderRadius: 4 }],
              };
              const popupData = {
                labels: sortedPopupFatalRowsForScope.map((s) => s.name),
                datasets: [{ data: sortedPopupFatalRowsForScope.map((s) => s.value), backgroundColor: ['#e53935', '#fb8c00', '#ffa726', '#66bb6a', '#42a5f5'], borderRadius: 4 }],
              };
              const options = {
                ...chartDefaults,
                plugins: {
                  ...chartDefaults.plugins,
                  title: titleOpt(title),
                  barValueLabel: { enabled: true }
                },
                scales: {
                  ...chartDefaults.scales,
                  x: { ...chartDefaults.scales.x, ticks: { color: '#1f2937', font: { size: 11 } } }
                }
              };

              return renderExpandableChartCard({
                title,
                onExpand: () => openChartPopup({ type: 'bar', title, data: popupData, options }),
                children: <Bar data={cardData} options={options} />
              });
            })()}

            {/* Top States / Top Districts (by Fatal+Grievous Accidents) Bar */}
            {isDbScanNonNh && (() => {
              const title = isDistrictScoped ? 'Top Districts (by Fatal+Grievous Accidents)' : 'Top States (by Fatal+Grievous Accidents)';
              const cardFgRowsForScope = sortedPopupFgRowsForScope.slice(0, 5);
              const cardData = {
                labels: cardFgRowsForScope.map((s) => s.name),
                datasets: [{
                  label: title,
                  data: cardFgRowsForScope.map((s) => s.value),
                  borderColor: '#1976d2',
                  backgroundColor: 'rgba(25, 118, 210, 0.2)',
                  fill: true,
                  tension: 0.35,
                  pointRadius: 3,
                  pointHoverRadius: 4,
                  borderWidth: 2.5
                }],
              };
              const popupData = {
                labels: sortedPopupFgRowsForScope.map((s) => s.name),
                datasets: [{
                  label: title,
                  data: sortedPopupFgRowsForScope.map((s) => s.value),
                  borderColor: '#1976d2',
                  backgroundColor: 'rgba(25, 118, 210, 0.2)',
                  fill: true,
                  tension: 0.35,
                  pointRadius: 3,
                  pointHoverRadius: 4,
                  borderWidth: 2.5
                }],
              };
              const options = {
                ...chartDefaults,
                plugins: {
                  ...chartDefaults.plugins,
                  title: titleOpt(title),
                  barValueLabel: { enabled: true }
                },
                scales: {
                  ...chartDefaults.scales,
                  x: {
                    ...chartDefaults.scales.x,
                    ticks: {
                      color: '#1f2937',
                      font: { size: 11 },
                      autoSkip: false,
                      maxRotation: 55,
                      minRotation: 45
                    }
                  }
                }
              };

              return renderExpandableChartCard({
                title,
                onExpand: () => openChartPopup({ type: 'line', title, data: popupData, options }),
                children: <Line data={cardData} options={options} />
              });
            })()}
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
      <table className="bd-table bd-table-ranked bd-table-corridors">
        <thead>
          <tr>
            <th>Rank</th>
            <th className="bd-th-left">Road</th>
            <th className="bd-th-left">Corridor</th>
            <th className="bd-th-left">{hasScopedSelection ? 'District' : 'State'}</th>
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
              <td className="bd-td-left">
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

{isDbScanNonNh && top20ClustersForDisplay.length > 0 && (
  <div className="bd-section-card">
    <div className="bd-section-header">
      <span className="bd-section-icon material-icons-outlined">table_chart</span>
      <span className="bd-section-title">{clusterTableTitle}</span>
    </div>

    <div className="bd-table-wrap">
      <table className="bd-table bd-table-ranked">
        <thead>
          <tr>
            <th>Rank</th>
            <th className="bd-th-left">Cluster</th>
            <th className="bd-severity-fatal">Fatal</th>
            <th className="bd-severity-grievous">Grievous</th>
            <th className="bd-severity-minor">Minor</th>
            <th className="bd-th-left">State</th>
            <th className="bd-th-left">District</th>
            <th>Accident Count</th>
          </tr>
        </thead>
        <tbody>
          {top20ClustersForDisplay.map((row, index) => (
            <tr key={`${row.cluster_id || row.district || 'cluster'}-${index}`}>
              <td>{index + 1}</td>
              <td className="bd-td-name">{row.cluster_id || '-'}</td>
              <td className="bd-td-fatal">{fmt(row.fatal || row.fatal_count || 0)}</td>
              <td className="bd-td-grievous">{fmt(row.grievous || row.grievous_count || 0)}</td>
              <td className="bd-td-minor">{fmt(row.minor || row.minor_count || 0)}</td>
              <td className="bd-td-left">{row.state || '-'}</td>
              <td className="bd-td-left">{row.district || '-'}</td>
              <td className="bd-td-red">{fmt(row.accident_count || 0)}</td>
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
