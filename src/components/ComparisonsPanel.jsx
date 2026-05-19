import React, { useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { getComparisonChartDataForSelection, getDashboardData, getDistrictComparisonRows, getDataByLevel } from '../data/morthData';
import { formatNumber } from '../utils/helpers';
import '../styles/comparisons.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
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

ChartJS.register(barValueLabelPlugin);

const chartDefaults = {
  responsive: true,
  maintainAspectRatio: false,
  layout: { padding: { top: 12 } },
  plugins: {
    legend: { display: false },
    barValueLabel: { enabled: false },
    tooltip: {
      callbacks: {
        label: (ctx) => `${ctx.dataset.label || 'Value'}: ${formatNumber(ctx.parsed.y ?? ctx.parsed ?? 0)}`
      }
    }
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: '#1f2937', font: { size: 12 }, maxRotation: 30 }
    },
    y: {
      grid: { color: '#edf2f7' },
      ticks: {
        color: '#1f2937',
        font: { size: 12 },
        callback: (value) => formatNumber(value)
      },
      beginAtZero: true
    }
  }
};

const titleOpt = (text) => ({
  display: true,
  text,
  font: { size: 15, weight: '700' },
  color: '#1a1a2e',
  padding: { bottom: 18 }
});

const BAR_COLORS = ['#42a5f5', '#26c6da', '#5c6bc0'];
const PIE_COLORS = ['#1976d2', '#e53935', '#ffa726'];
const sortLabelValuePairsDesc = (labels = [], values = []) =>
  labels
    .map((label, index) => ({ label, value: Number(values[index]) || 0 }))
    .sort((a, b) => b.value - a.value);

const isPercentTitle = (title = '') => String(title).trim().startsWith('%');

const LineCard = ({ title, months, lineSeries, onExpand }) => {
  const data = {
    labels: months,
    datasets: lineSeries.map((item) => ({
      label: item.label,
      data: item.values,
      borderColor: item.color,
      backgroundColor: `${item.color}22`,
      fill: true,
      tension: 0.35,
      pointRadius: 3,
      pointHoverRadius: 4,
      borderWidth: 2.5
    }))
  };

  return (
    <article
      className="comparison-card comparison-card-wide comparison-card-clickable"
      aria-label={title}
      onClick={onExpand}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onExpand();
        }
      }}
    >
      <div className="comparison-chart-inner">
        <Line
          data={data}
          options={{
            ...chartDefaults,
            plugins: {
              ...chartDefaults.plugins,
              title: titleOpt(title),
              legend: {
                display: true,
                position: 'bottom',
                labels: { boxWidth: 12, font: { size: 12 }, color: '#1f2937' }
              }
            }
          }}
        />
      </div>
    </article>
  );
};

const BarCard = ({ title, values, series, onExpand, showValueLabels = true }) => {
  const sortedPairs = sortLabelValuePairsDesc(
    series.map((item) => item.label),
    values
  );

  const data = {
    labels: sortedPairs.map((item) => item.label),
    datasets: [
      {
        label: title,
        data: sortedPairs.map((item) => item.value),
        backgroundColor: BAR_COLORS.slice(0, sortedPairs.length),
        borderRadius: 6
      }
    ]
  };

  const percentMode = isPercentTitle(title);

  return (
    <article
      className="comparison-card comparison-card-clickable"
      aria-label={title}
      onClick={onExpand}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onExpand();
        }
      }}
    >
      <div className="comparison-chart-inner">
        <Bar
          data={data}
          options={{
            ...chartDefaults,
            plugins: {
              ...chartDefaults.plugins,
              title: titleOpt(title),
              barValueLabel: { enabled: showValueLabels },
              tooltip: {
                callbacks: {
                  label: (ctx) => {
                    const value = ctx.parsed.y ?? ctx.parsed ?? 0;
                    return percentMode ? `${formatNumber(value)}%` : formatNumber(value);
                  }
                }
              }
            },
            scales: percentMode
              ? {
                  ...chartDefaults.scales,
                  y: {
                    ...chartDefaults.scales.y,
                    ticks: {
                      ...(chartDefaults.scales.y?.ticks || {}),
                      callback: (value) => `${formatNumber(value)}%`
                    }
                  }
                }
              : chartDefaults.scales
          }}
        />
      </div>
    </article>
  );
};

const PieCard = ({ title, values, series, onExpand }) => {
  const data = {
    labels: series.map((item) => item.label),
    datasets: [
      {
        data: values,
        backgroundColor: PIE_COLORS.slice(0, series.length)
      }
    ]
  };

  return (
    <article
      className="comparison-card comparison-card-clickable"
      aria-label={title}
      onClick={onExpand}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onExpand();
        }
      }}
    >
      <div className="comparison-chart-inner">
        <Doughnut
          data={data}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              title: titleOpt(title),
              legend: {
                display: true,
                position: 'bottom',
                labels: { boxWidth: 12, font: { size: 12 }, color: '#1f2937' }
              },
              tooltip: {
                callbacks: {
                  label: (ctx) => `${ctx.label}: ${formatNumber(ctx.parsed || 0)}`
                }
              }
            }
          }}
        />
      </div>
    </article>
  );
};

const ComparisonsPanel = ({ selectedStateName, selectedDistrictName, selectedCategory, selectedStateDistrictNames = [] }) => {
  const isDbScanNonNh = selectedCategory === 'cluster';
  const selectionData = getDataByLevel({
    category: selectedCategory,
    stateName: selectedStateName,
    districtName: selectedDistrictName
  });
  const hasNoSelectionData = Boolean(selectedStateName) && !selectionData;

  const chartData = getComparisonChartDataForSelection(
    selectedStateName,
    selectedDistrictName,
    selectedCategory,
    selectedStateDistrictNames
  );
  const hiddenComparisonTitles = new Set([
    '% Grievous Share',
    '% Fatal + Grievous Share',
    'Blackspots',
    'Top Violations',
    '% Fatality Accident'
  ]);
  {/*
  const fatalitySharePieCards = chartData.pies.filter((card) => card.title === '% Fatality Accident');
  const visibleBarCards = [
    ...chartData.bars.filter((card) => !hiddenComparisonTitles.has(card.title)),
    ...fatalitySharePieCards
  ];
  */}
  const visibleBarCards = chartData.bars.filter(
    (card) => !hiddenComparisonTitles.has(card.title)
  );
  const dbScanScopeAccidentTitle = selectedStateName
    ? 'Accident Count by District (NON-NH Clusters)'
    : 'Accident Count by State (NON-NH Clusters)';
  const visibleBarCardsForDisplay = isDbScanNonNh
    ? visibleBarCards.map((card) => {
        if (card.title === 'Black Corridors') {
          return { ...card, title: 'Cluster' };
        }

        if (card.title === 'Fatal + Grievous Accidents') {
          return { ...card, title: dbScanScopeAccidentTitle };
        }

        if (card.title === '% Fatality Accident by State' && selectedStateName) {
          return { ...card, title: '% Fatality Accident by District' };
        }

        return card;
      })
    : visibleBarCards;
  const visiblePieCards = chartData.pies.filter(
    (card) => !hiddenComparisonTitles.has(card.title) && card.title !== '% Fatality Accident'
  );

  const [expandedCard, setExpandedCard] = useState(null);
  const isDistrictScope = Boolean(selectedStateName);

  const dbScanRankingCards = useMemo(() => {
    if (!isDbScanNonNh) return [];

    const sourceRows = selectedStateName
      ? getDistrictComparisonRows(selectedStateName, selectedCategory, selectedStateDistrictNames)
      : (getDashboardData(selectedCategory)?.states || []);

    if (!sourceRows.length) return [];

    const displayName = (row) => row?.district_name || row?.name || 'Unknown';
    const toAccidentCount = (row) =>
      Number(row?.total_accidents) || Number(row?.fg_covered) || Number(row?.total_fg) || 0;
    const toFatalCount = (row) =>
      Number(row?.fatal_accidents) || Number(row?.total_fatalities) || 0;

    const topByAccidents = [...sourceRows]
      .sort((a, b) => toAccidentCount(b) - toAccidentCount(a))
      .slice(0, 3)
      .map((row) => ({ name: displayName(row), value: toAccidentCount(row) }));

    const topByFatal = [...sourceRows]
      .sort((a, b) => toFatalCount(b) - toFatalCount(a))
      .slice(0, 3)
      .map((row) => ({ name: displayName(row), value: toFatalCount(row) }));

    const entityTitle = selectedStateName ? 'Districts' : 'States';

    return [
      {
        title: `Top ${entityTitle} by Number of Accidents`,
        rows: topByAccidents
      },
      {
        title: `Top ${entityTitle} by Fatal Count`,
        rows: topByFatal
      }
    ];
  }, [isDbScanNonNh, selectedCategory, selectedStateDistrictNames, selectedStateName]);

  const getTopViolationCount = (violations = []) =>
    Math.max(0, ...((violations || []).map((item) => item?.count || 0)), 0);

  const metricValueByTitle = (entity, title) => {
    const schoolMetrics = entity?.school_zone_metrics || {};
    const toNumeric = (value) => Number(value) || 0;
    const sumMetricRows = (rows) =>
      Array.isArray(rows)
        ? rows.reduce((sum, row) => sum + (Number(row?.value) || 0), 0)
        : 0;

    switch (title) {
      case 'Black Corridors':
      case 'Cluster':
        return Number(entity?.corridors) || 0;
      case 'Fatal + Grievous Accidents':
      case 'Accident Count by State (NON-NH Clusters)':
      case 'Accident Count by District (NON-NH Clusters)':
      case '% Fatal + Grievous Share':
      case 'Monthly Fatal + Grievous Trend':
        return Number(entity?.total_accidents) || Number(entity?.fg_covered) || Number(entity?.total_fg) || 0;
      case 'Blackspots':
        return Number(entity?.blackspots) || 0;
      case 'Fatalities':
      case '% Fatality Accident':
        return Number(entity?.total_fatalities) || 0;
      case '% Fatality Accident by State':
      case '% Fatality Accident by District': {
        const fatalities = Number(entity?.total_fatalities) || 0;
        const accidents = Number(entity?.total_accidents) || Number(entity?.fg_covered) || 0;
        return accidents > 0 ? Number(((fatalities / accidents) * 100).toFixed(2)) : 0;
      }
      case '% Grievous Share':
        return Number(entity?.total_grievous) || 0;
      case 'Accidents per School Buffer': {
        const accidents = toNumeric(schoolMetrics.total_accidents) || toNumeric(entity?.fg_covered);
        const zones = toNumeric(schoolMetrics.total_school_zones) || toNumeric(entity?.blackspots);
        return zones > 0 ? Math.round((accidents / zones) * 100) / 100 : accidents;
      }
      case 'Accidents (Age 6–18)': {
        const ageMetric = schoolMetrics.accidents_age_6_18;
        if (Array.isArray(ageMetric)) return sumMetricRows(ageMetric);
        const numericAgeMetric = Number(ageMetric);
        return Number.isFinite(numericAgeMetric) ? numericAgeMetric : 0;
      }
      case 'Time Window Accidents':
        return sumMetricRows(schoolMetrics.time_window_accidents);
      case 'Pedestrian Accidents':
        return toNumeric(schoolMetrics.pedestrian_accidents) || toNumeric(entity?.total_grievous);
      case 'Top Violations':
        return getTopViolationCount(entity?.violations);
      default:
        return Number(entity?.total_fg) || 0;
    }
  };

  const popupScopeData = useMemo(() => {
    if (!expandedCard) return null;

    const isDistrictMode = isDistrictScope;
    let entities = isDistrictMode
      ? getDistrictComparisonRows(selectedStateName, selectedCategory, selectedStateDistrictNames)
      : (getDashboardData(selectedCategory)?.states || []);

    const labels = entities.map((item) => item?.district_name || item?.name || 'Unknown');
    const values = entities.map((item) => metricValueByTitle(item, expandedCard.title));

    return {
      scopeTitle: isDistrictMode
        ? `All Districts · ${selectedStateName}`
        : 'All States',
      labels,
      values,
      isDistrictMode
    };
  }, [expandedCard, isDistrictScope, selectedCategory, selectedDistrictName, selectedStateDistrictNames, selectedStateName]);

  const popupSortedPairs = useMemo(() => {
    if (!popupScopeData) return [];

    return sortLabelValuePairsDesc(popupScopeData.labels, popupScopeData.values);
  }, [popupScopeData]);

  const popupChart = useMemo(() => {
    if (!expandedCard || !popupScopeData) return null;

    const title = `${expandedCard.title} · ${popupScopeData.scopeTitle}`;
    const labels = popupSortedPairs.map((item) => item.label);
    const values = popupSortedPairs.map((item) => item.value);
    const isPie = expandedCard.type === 'pie';
    const percentMode = isPercentTitle(expandedCard.title);

    if (isPie) {
      return (
        <Doughnut
          data={{
            labels,
            datasets: [
              {
                data: values,
                backgroundColor: [
                  '#1976d2', '#e53935', '#ffa726', '#66bb6a', '#ab47bc', '#26c6da', '#5c6bc0', '#8d6e63', '#78909c', '#ef5350'
                ]
              }
            ]
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              title: titleOpt(title),
              legend: {
                display: true,
                position: 'bottom',
                labels: { boxWidth: 12, font: { size: 12 }, color: '#1f2937' }
              },
              tooltip: {
                callbacks: {
                  label: (ctx) => `${ctx.label}: ${formatNumber(ctx.parsed || 0)}${percentMode ? '%' : ''}`
                }
              }
            }
          }}
        />
      );
    }

    return (
      <Bar
        data={{
          labels,
          datasets: [
            {
              label: expandedCard.title,
              data: values,
              backgroundColor: '#42a5f5',
              borderRadius: 6
            }
          ]
        }}
        options={{
          ...chartDefaults,
          indexAxis: 'x',
          layout: { padding: { top: 12, right: 24 } },
          plugins: {
            ...chartDefaults.plugins,
            title: titleOpt(title),
            barValueLabel: { enabled: false },
            tooltip: {
              callbacks: {
                label: (ctx) => `${ctx.label}: ${formatNumber(ctx.parsed.y ?? ctx.parsed ?? 0)}${percentMode ? '%' : ''}`
              }
            }
          },
          scales: {
            x: {
              grid: { color: '#edf2f7' },
              ticks: {
                color: '#1f2937',
                font: { size: 12 },
                autoSkip: false,
                maxRotation: 45,
                minRotation: 30
              },
              beginAtZero: true
            },
            y: {
              grid: { display: false },
              ticks: {
                color: '#1f2937',
                font: { size: 12 },
                autoSkip: false,
                callback: (value) => percentMode ? `${formatNumber(value)}%` : formatNumber(value)
              }
            }
          }
        }}
      />
    );
  }, [expandedCard, popupScopeData, popupSortedPairs]);

  if (selectedDistrictName && selectedCategory !== 'cluster') {
    return null;
  }

  if (hasNoSelectionData) {
    return (
      <section className="comparisons-panel">
        <div className="comparisons-no-data" role="status" aria-live="polite">
          <div className="comparisons-no-data-heading-row">
            <span className="comparisons-no-data-icon" aria-hidden="true">ⓘ</span>
            <span className="comparisons-no-data-heading">Data Not Available</span>
          </div>
          <span className="comparisons-no-data-text">
            No records found for selected state {selectedStateName}.
          </span>
        </div>
      </section>
    );
  }

  return (
    <section className="comparisons-panel">
      <div className="comparisons-title-row">
        <span className="comparisons-title-icon" aria-hidden="true">📊</span>
        <h3 className="map-tab-title-highlight">
          {isDistrictScope ? 'District-Level Comparisons' : 'State-Level Comparisons'}
          <span className="map-tab-title-separator">·</span>
          <span className="scope-chip-row" key={`${selectedStateName || 'all'}-${selectedDistrictName || 'all'}`}>
            {!selectedStateName && !selectedDistrictName && (
              <span className="scope-chip scope-chip-neutral">India</span>
            )}
            {selectedStateName && (
              <span className="scope-chip scope-chip-state">{selectedStateName}</span>
            )}
            {selectedDistrictName && (
              <span className="scope-chip scope-chip-district">{selectedDistrictName}</span>
            )}
          </span>
        </h3>
      </div>

      <div className="comparisons-grid">
        {isDbScanNonNh && dbScanRankingCards.map((card) => (
          <article key={card.title} className="comparison-card comparison-ranking-card">
            <h4>{card.title}</h4>
            <div className="comparison-ranking-list">
              {card.rows.map((row, index) => (
                <div key={`${row.name}-${index}`} className="comparison-ranking-item">
                  <span className={`comparison-ranking-badge comparison-ranking-badge-${index + 1}`}>{index + 1}</span>
                  <span className="comparison-ranking-name">{row.name}</span>
                  <span className="comparison-ranking-value">{formatNumber(row.value)}</span>
                </div>
              ))}
            </div>
          </article>
        ))}

        {chartData.line && (
          <LineCard
            title={chartData.line.title}
            months={chartData.months}
            lineSeries={chartData.line.series}
            onExpand={() => setExpandedCard({ type: 'line', title: chartData.line.title })}
          />
        )}

        {visibleBarCardsForDisplay.map((card) => (
          <BarCard
            key={card.title}
            values={card.values}
            series={chartData.series}
            title={card.title}
            showValueLabels={true}
            onExpand={() => setExpandedCard({ type: 'bar', title: card.title })}
          />
        ))}

        {visiblePieCards.map((card) => (
          <PieCard
            key={card.title}
            {...card}
            series={chartData.series}
            onExpand={() => setExpandedCard({ type: 'pie', title: card.title })}
          />
        ))}
      </div>

      {expandedCard && popupScopeData && (
        <div className="comparison-modal-overlay" role="dialog" aria-modal="true" aria-label={`${expandedCard.title} popup`}>
          <div className="comparison-modal-card">
            <div className="comparison-modal-header">
              <h4>{expandedCard.title}</h4>
              <button
                type="button"
                className="comparison-modal-close"
                onClick={() => setExpandedCard(null)}
                aria-label="Close popup"
              >
                ✕
              </button>
            </div>
            <p className="comparison-modal-subtitle">
              {popupScopeData.isDistrictMode
                ? `District Mode: showing all districts for ${selectedStateName}`
                : 'State Mode: showing all states'}
            </p>
            <div className="comparison-modal-chart-wrap">
              {popupChart}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default ComparisonsPanel;
