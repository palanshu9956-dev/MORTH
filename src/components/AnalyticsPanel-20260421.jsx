import React from 'react';
import { getDashboardDataForSelection, getDataByLevel } from '../data/morthData';
import { formatNumber } from '../utils/helpers';
import '../styles/analytics.css';

const AnalyticsPanel = ({
  onStateSelect,
  isHeaderView,
  selectedCategory,
  selectedStateName,
  selectedDistrictName
}) => {
  const dashboardData = getDashboardDataForSelection({
    category: selectedCategory,
    stateName: selectedStateName,
    districtName: selectedDistrictName
  });
  const selectionData = getDataByLevel({
    category: selectedCategory,
    stateName: selectedStateName,
    districtName: selectedDistrictName
  });
  const hasScopedSelection = Boolean(selectionData && (selectedStateName || selectedDistrictName));
  const isSchoolZone = selectedCategory === 'schools-zone';
  const isDbScanNonNh = selectedCategory === 'cluster';
  const sortRowsByValueDesc = (rows = []) =>
    [...rows].sort((a, b) => (Number(b?.value) || 0) - (Number(a?.value) || 0));
  const toNumeric = (value) => Number(String(value ?? '').replace(/,/g, '')) || 0;
  const firstDefinedNumeric = (...values) => {
    for (const value of values) {
      if (value !== undefined && value !== null && value !== '') {
        return toNumeric(value);
      }
    }
    return 0;
  };

  const totalCorridors = (dashboardData.states || []).reduce(
    (sum, state) => sum + (Number(state?.corridors) || 0),
    0
  );

  const stateTotals = (dashboardData.states || []).reduce(
    (totals, state) => ({
      fatalCovered: totals.fatalCovered + (Number(state?.total_fatalities) || 0),
      grievousCovered: totals.grievousCovered + (Number(state?.total_grievous) || 0)
    }),
    { fatalCovered: 0, grievousCovered: 0 }
  );

  const scopedFatalities = hasScopedSelection
    ? Number(selectionData?.total_fatal_accidents) ||
      Number(selectionData?.total_fatalities) ||
      0
    : Number(dashboardData.summary.total_fatal_accidents) || 0;

  const scopedGrievous = hasScopedSelection
    ? firstDefinedNumeric(
        selectionData?.total_grievous_accidents,
        selectionData?.total_grievous
      )
    : Number(dashboardData.summary.total_grievous_accidents) || 0;

  const scopedSchoolMetrics = selectionData?.school_zone_metrics || {};
  const scopedSchoolZones = hasScopedSelection
    ? Number(scopedSchoolMetrics.total_school_zones) || Number(selectionData?.blackspots) || 0
    : Number(dashboardData.summary.total_school_zones) || 0;
  const scopedSchoolAccidents = hasScopedSelection
    ? Number(scopedSchoolMetrics.total_accidents) || Number(selectionData?.fg_covered) || 0
    : Number(dashboardData.summary.total_accidents) || 0;
  const scopedAge618 = hasScopedSelection
    ? Number(scopedSchoolMetrics.accidents_age_6_18) || Number(selectionData?.total_fatalities) || 0
    : Number(dashboardData.summary.accidents_age_6_18) || 0;
  const scopedPedestrian = hasScopedSelection
    ? Number(scopedSchoolMetrics.pedestrian_accidents) || Number(selectionData?.total_grievous) || 0
    : Number(dashboardData.summary.pedestrian_accidents) || 0;

  const scopedFatalGrievous = hasScopedSelection
    ? Number(selectionData?.fg_covered) || Number(selectionData?.total_fg) || 0
    : Number(dashboardData.summary.fatal_grievous_covered) || 0;

  /*

  const scopedThreeYearTotal = hasScopedSelection
    ? Number(selectionData?.total_fg) || Number(selectionData?.fg_coverage) || 0
    : Number(dashboardData.summary.fg_coverage) || 0;

  const formatThreeYearPercent = (value) => {
    if (!scopedThreeYearTotal) return null;
    const percentage = (Number(value || 0) / scopedThreeYearTotal) * 100;
    return `${percentage.toFixed(1)}%`;
  };

  */

  const indiaSummary = hasScopedSelection
    ? selectionData?.india_summary || {}
    : dashboardData.india_summary || {};

  const fatalDenominator = Number(
    indiaSummary.total_fatal_accidents_india_three_years
  ) || 0;

  const grievousDenominator = Number(
    indiaSummary.total_grievous_accidents_india_three_years
  ) || 0;

  const totalDenominator = Number(
    indiaSummary.total_accidents_india_three_years
  ) || 0;

  const formatThreeYearPercent = (value, denominator) => {
    if (!denominator) return null;
    const percentage = (Number(value || 0) / denominator) * 100;
    return `${percentage.toFixed(1)}%`;
  };

  const scopedBlackspots = hasScopedSelection
    ? Number(selectionData?.blackspots) || 0
    : Number(dashboardData.summary.blackspots) || 0;

  const scopedCorridors = hasScopedSelection
    ? Number(selectionData?.corridors) || 0
    : totalCorridors;

  const statCards = isSchoolZone
    ? [
        { tone: 'blue', title: 'Total School Zones', value: formatNumber(scopedSchoolZones) },
        { tone: 'purple', title: 'Total Accidents', value: formatNumber(scopedSchoolAccidents) },
        { tone: 'orange', title: 'Accidents (6–18 yrs)', value: formatNumber(scopedAge618) },
        { tone: 'green', title: 'Pedestrian Accidents', value: formatNumber(scopedPedestrian) }
      ]
    : [
        
        {
          tone: 'purple',
          title: isHeaderView ? 'Total Black Corridors' : 'Blackspots',
          value: formatNumber(isHeaderView ? scopedCorridors : scopedBlackspots)
        },
        ...(!isDbScanNonNh
          ? [{ tone: 'orange', title: 'Road Length (km)', value: dashboardData.summary.total_length_processed }]
          : []),
        {
          tone: 'green',
          title: 'Fatal Accidents',
          value: formatNumber(scopedFatalities),
          threeYearPercentage: formatThreeYearPercent(scopedFatalities, fatalDenominator)
        },
        {
          tone: 'red',
          title: 'Grievous Accidents',
          value: formatNumber(scopedGrievous),
          threeYearPercentage: formatThreeYearPercent(scopedGrievous, grievousDenominator)
        },
        {
          tone: 'blue',
          title: 'Total Fatal+Grievous Accidents',
          value: formatNumber(scopedFatalGrievous),
          threeYearPercentage: formatThreeYearPercent(scopedFatalGrievous, totalDenominator)
        },
      ];

  const renderStatCards = (isHeader = false) => (
    <div className={`stat-cards ${isHeader ? 'stat-cards-header' : ''} ${isSchoolZone ? 'stat-cards-school-zone' : ''}`}>
      {statCards.map((card) => (
        <div key={card.title} className={`stat-card ${card.tone}`}>
          <div className="stat-card-content">
            <span className="stat-card-title">{card.title}</span>
            <span className="stat-card-count">{card.value}</span>
            {card.threeYearPercentage && (
              <span className="stat-card-three-year-percentage">
                {card.threeYearPercentage} of 3 years
              </span>
            )}
          </div>
          <div className="stat-card-accent"></div>
        </div>
      ))}
    </div>
  );

  if (isHeaderView) {
    return renderStatCards(true);
  }

  return (
    <div className="analytics-panel">
      {/* Stat Cards */}
      {renderStatCards(false)}

      {/* State Summary Table */}

      {/* Agency Table */}
      <div className="section">
        <h3>Agency Summary</h3>
        <table className="agency-table">
          <thead>
            <tr>
              <th>Agency</th>
              <th>Road Length (km)</th>
              <th>Corridors</th>
              <th>Accidents</th>
              <th>Fatalities</th>
            </tr>
          </thead>
          <tbody>
            {dashboardData.agencies.map(agency => (
              <tr key={agency.name}>
                <td>{agency.name}</td>
                <td>{agency.length}</td>
                <td>{agency.corridors}</td>
                <td>{agency.accidents}</td>
                <td className="red-text">{agency.fatalities}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Rankings */}
      <div className="section">
        <h3>Rankings</h3>
        <div className="rankings-grid">
          {dashboardData.rankings.map((ranking, idx) => (
            <div key={idx} className="ranking-section">
              <h4>{ranking.title}</h4>
              <div className="ranking-list">
                {ranking.rows.map((row, i) => (
                  <div key={i} className="ranking-item">
                    <span className={`ranking-badge medal-${i}`}>{i + 1}</span>
                    <span className="ranking-name">{row.name}</span>
                    <span className="ranking-value">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bar Charts */}
      <div className="section">
        <h3>Statistics</h3>
  {dashboardData.bars.map((bar, idx) => {
          const sortedRows = sortRowsByValueDesc(bar.rows || []);
          const maxVal = Math.max(...sortedRows.map(r => Number(r?.value) || 0), 0);
          return (
            <div key={idx} className="bar-chart-section">
              <h4>{bar.title}</h4>
              {sortedRows.map((row, i) => (
                <div key={i} className="bar-chart-row">
                  <span className="bar-label">{row.label}</span>
                  <div className="bar-track">
                    <div 
                      className="bar-fill"
                      style={{ 
                        width: `${maxVal > 0 ? ((Number(row?.value) || 0) / maxVal) * 100 : 0}%`,
                        background: idx === 0 ? '#2196f3' : '#e53935'
                      }}
                    ></div>
                  </div>
                  <span className="bar-value">{formatNumber(row.value)}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AnalyticsPanel;
