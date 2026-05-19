import React from 'react';
import '../styles/header.css';

const CATEGORY_META = {
  mort: { label: 'MoRTH', theme: 'mort' },
  irc: { label: 'IRC', theme: 'irc' },
  'schools-zone': { label: 'School Zones', theme: 'schools-zone' },
  cluster: { label: 'Cluster', theme: 'cluster' }
};

const Header = ({
  viewLevel,
  selectedStateName,
  selectedDistrictName,
  onResetCountry,
  onStateSelect,
  selectedCategory,
  onCategoryChange
}) => {
  const activeCategory = CATEGORY_META[selectedCategory] ?? CATEGORY_META.mort;
  const isSchoolZone = selectedCategory === 'schools-zone';

  const headerTitle = isSchoolZone
    ? 'AI Analytics Dashboard'
    : 'AI Analytics Dashboard';

  const headerSubtitle = isSchoolZone
    ? 'School safety monitoring for accidents, vulnerable age groups, and pedestrian risk'
    : 'Ministry of Road Transport & Highways — Black Corridor & Accident Analysis';

  return (
    <>
      <header className={`header header-theme-${activeCategory.theme}`}>
        <div className="header-left">
          <span className="header-logo">{isSchoolZone ? '🏫' : '🛡️'}</span>
          <h1 className="header-title">{headerTitle}</h1>
        </div>
        <div className="header-right">
          <span className="header-subtitle">{headerSubtitle}</span>
        </div>
      </header>

      <div className={`breadcrumb-container breadcrumb-theme-${activeCategory.theme}`}>
        <div className="breadcrumb">
          <select
            className="header-dropdown breadcrumb-dropdown"
            aria-label="Category selector"
            value={selectedCategory}
            onChange={(event) => onCategoryChange?.(event.target.value)}
          >
            <option value="mort">MoRTH</option>
            <option value="irc">IRC</option>
            <option value="schools-zone">School Zones</option>
            <option value="cluster">DB Scan(Non-NH)</option>
          </select>
          {/* <span
            className={`breadcrumb-item breadcrumb-category breadcrumb-category-${activeCategory.theme}`}
          >
            {activeCategory.label}
          </span> */}
          <span 
            className="breadcrumb-item breadcrumb-india"
            onClick={onResetCountry}
            style={{ cursor: 'pointer' }}
          >
            India
          </span>
          {(viewLevel === 'state' || viewLevel === 'district') && selectedStateName && (
            <span 
              className="breadcrumb-item breadcrumb-state"
              onClick={() => onStateSelect(selectedStateName)}
              style={{ cursor: 'pointer' }}
            >
              › {selectedStateName}
            </span>
          )}
          {viewLevel === 'district' && selectedDistrictName && (
            <span className="breadcrumb-item breadcrumb-district">
              › {selectedDistrictName}
            </span>
          )}
        </div>
      </div>
    </>
  );
};

export default Header;
