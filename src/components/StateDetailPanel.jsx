import React from 'react';
import { formatNumber } from '../utils/helpers';
import '../styles/detail-panel.css';

const StateDetailPanel = ({ stateData, selectedCategory }) => {
  if (!stateData) return null;

  const isSchoolZone = selectedCategory === 'schools-zone';
  const sortRowsByValueDesc = (rows = []) =>
    [...rows].sort((a, b) => (Number(b?.value) || 0) - (Number(a?.value) || 0));
  const sortItemsByCountDesc = (items = []) =>
    [...items].sort((a, b) => (Number(b?.count) || 0) - (Number(a?.count) || 0));

  const buildMiniBarSection = (title, rows, color) => {
    if (!rows || rows.length === 0) return null;
    const sortedRows = sortRowsByValueDesc(rows);
    const maxVal = Math.max(...sortedRows.map(r => Number(r?.value) || 0), 0);
    return (
      <div className="detail-section">
        <h4 className="detail-section-title">{title}</h4>
        {sortedRows.map((row, idx) => {
          const pct = maxVal > 0 ? ((Number(row?.value) || 0) / maxVal) * 100 : 0;
          return (
            <div key={idx} className="mini-bar-row">
              <span className="mini-bar-label">{row.label}</span>
              <div className="mini-bar-track">
                <div 
                  className="mini-bar-fill"
                  style={{ width: `${pct}%`, background: color }}
                ></div>
              </div>
              <span className="mini-bar-value">{formatNumber(row.value)}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const buildDataListSection = (title, items, accentColor) => {
    if (!items || items.length === 0) return null;
    const sortedItems = sortItemsByCountDesc(items);
    return (
      <div className="detail-section">
        <h4 className="detail-section-title">{title}</h4>
        {sortedItems.map((item, idx) => (
          <div key={idx} className="data-list-item">
            <div className="data-list-bar-track">
              <div 
                className="data-list-bar-fill"
                style={{
                  width: `${item.pct}%`,
                  background: `${accentColor}20`,
                  borderLeft: `3px solid ${accentColor}`
                }}
              ></div>
            </div>
            <div className="data-list-info">
              <span className="data-list-name">{item.name}</span>
              <span className="data-list-stats">
                {formatNumber(item.count)} <span className="data-list-pct">({item.pct}%)</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (isSchoolZone) {
    const metrics = stateData.school_zone_metrics || {};

    const metricCards = [
      {
        title: 'Total School Zones',
        value: metrics.total_school_zones ?? stateData.blackspots
      },
      {
        title: 'Total Accidents',
        value: metrics.total_accidents ?? stateData.fg_covered
      },
     {
        title: 'Accidents(6–18 yrs)',
        value:Number(stateData.accidents_age_6_18) || 0,
        emphasize: 'danger'
      },
      {
        title: 'Pedestrian Accidents',
        value: metrics.pedestrian_accidents ?? stateData.total_grievous,
        emphasize: 'success'
      }
    ];

    return (
      <div className="state-detail-panel schools-zone-detail-panel">
        <h3 className="state-detail-title">District Level - School Zones</h3>

        <div className="school-zone-summary-cards">
          {metricCards.map((card) => (
            <div key={card.title} className="school-zone-metric-card">
              <span className="school-zone-metric-title">{card.title}</span>
              <span className={`school-zone-metric-value ${card.emphasize || ''}`}>
                {formatNumber(card.value || 0)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="state-detail-panel">
      <h3 className="state-detail-title">{stateData.name}</h3>
      
      {/* Summary Metrics */}
      <div className="detail-summary">
        <div className="detail-metric">
          <span className="detail-metric-label">Fatalities</span>
          <span className="detail-metric-value red-text">{formatNumber(stateData.total_fatalities)}</span>
        </div>
        <div className="detail-metric">
          <span className="detail-metric-label">Grievous Injuries</span>
          <span className="detail-metric-value orange-text">{formatNumber(stateData.total_grievous)}</span>
        </div>
        <div className="detail-metric">
          <span className="detail-metric-label">Fatal + Grievous</span>
          <span className="detail-metric-value">{formatNumber(stateData.total_fg)}</span>
        </div>
        <div className="detail-metric">
          <span className="detail-metric-label">Blackspots</span>
          <span className="detail-metric-value">{formatNumber(stateData.blackspots)}</span>
        </div>
        <div className="detail-metric">
          <span className="detail-metric-label">Black Corridors</span>
          <span className="detail-metric-value">{formatNumber(stateData.corridors)}</span>
        </div>
        <div className="detail-metric">
          <span className="detail-metric-label">Fatal + Grievous Covered</span>
          <span className="detail-metric-value">{formatNumber(stateData.fg_covered)}</span>
        </div>
      </div>

      {/* Spot Distribution */}
      {buildMiniBarSection('Blackspot Distribution (Crashes)', stateData.spot_distribution, '#2196f3')}

      {/* Traffic Violations */}
      {buildDataListSection('Top Traffic Violations', stateData.violations, '#e53935')}

      {/* Crash Types */}
      {buildDataListSection('Top Crash Types', stateData.crash_types, '#ff9800')}

      {/* Crash Natures */}
      {buildDataListSection('Top Crash Natures', stateData.crash_natures, '#7b1fa2')}
    </div>
  );
};

export default StateDetailPanel;
