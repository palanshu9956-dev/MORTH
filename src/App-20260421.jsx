import React, { useState, useEffect, useMemo } from 'react';
import Header from './components/Header';
import MapComponent from './components/MapComponent';
import AnalyticsPanel from './components/AnalyticsPanel';
import ComparisonsPanel from './components/ComparisonsPanel';
import { DEFAULT_CATEGORY } from './data/morthData';
import { districtMatchesState, getDistrictName } from './utils/helpers';
import './App.css';
import BottomDashboard from './components/BottomDashboard';

function App() {
  const TAB_GLOBAL_SUMMARIES = 'globalSummaries';
  const TAB_COMPARISONS = 'comparisons';

  const [viewLevel, setViewLevel] = useState('country');
  const [selectedCategory, setSelectedCategory] = useState(DEFAULT_CATEGORY);
  const [selectedStateName, setSelectedStateName] = useState(null);
  const [selectedDistrictName, setSelectedDistrictName] = useState(null);
  const [statesData, setStatesData] = useState(null);
  const [districtsData, setDistrictsData] = useState(null);
  const [pincodesData, setPincodesData] = useState(null);
  const [activeBottomTab, setActiveBottomTab] = useState(TAB_GLOBAL_SUMMARIES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

const isSchoolZone = selectedCategory === 'schools-zone';

  const hasStateSelection = Boolean(selectedStateName);
  const hasDistrictSelection = Boolean(selectedDistrictName);
  const currentSelectionText = useMemo(() => {
    if (hasDistrictSelection && hasStateSelection) {
      return `${selectedDistrictName}, ${selectedStateName}`;
    }

    if (hasStateSelection) {
      return selectedStateName;
    }

    return 'India';
  }, [hasDistrictSelection, hasStateSelection, selectedDistrictName, selectedStateName]);

  const selectedStateDistrictNames = useMemo(() => {
    if (!selectedStateName || !districtsData?.features?.length) return [];

    const names = districtsData.features
      .filter((feature) => districtMatchesState(feature?.properties, selectedStateName))
      .map((feature) => getDistrictName(feature?.properties || {}))
      .filter((name) => Boolean(name) && String(name).toLowerCase() !== 'district');

    return Array.from(new Set(names));
  }, [districtsData, selectedStateName]);

  useEffect(() => {
    if (isSchoolZone && activeBottomTab === TAB_COMPARISONS) {
      setActiveBottomTab(TAB_GLOBAL_SUMMARIES);
    }
  }, [isSchoolZone, activeBottomTab]);

  // Load GeoJSON data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load states
        const statesRes = await fetch('/morth-dashboard/data/INDIA_STATES.geojson');
        if (!statesRes.ok) throw new Error('Failed to load states');
        const statesJson = await statesRes.json();
        setStatesData(statesJson);

        // Load districts
        const districtsRes = await fetch('/morth-dashboard/data/INDIA_DISTRICTS.geojson');
        if (!districtsRes.ok) throw new Error('Failed to load districts');
        const districtsJson = await districtsRes.json();
        setDistrictsData(districtsJson);

        // Load pincodes (lazy loaded later if needed)
        const pincodesRes = await fetch('/morth-dashboard/data/INDIAN_PINCODE_BOUNDARY.geojson');
        if (!pincodesRes.ok) throw new Error('Failed to load pincodes');
        const pincodesJson = await pincodesRes.json();
        setPincodesData(pincodesJson);

        setLoading(false);
      } catch (err) {
        console.error('Error loading data:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleStateSelect = (stateName) => {
    setSelectedStateName(stateName);
    setSelectedDistrictName(null);
    setViewLevel('state');
  };

  const handleDistrictSelect = (districtName) => {
    setSelectedDistrictName(districtName);
    setViewLevel('district');
  };

  const handleResetCountry = () => {
    setViewLevel('country');
    setSelectedStateName(null);
    setSelectedDistrictName(null);
  };

  return (
    <div className="app">
      <Header 
        viewLevel={viewLevel}
        selectedStateName={selectedStateName}
        selectedDistrictName={selectedDistrictName}
        onResetCountry={handleResetCountry}
        onStateSelect={handleStateSelect}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
      />

      <div className="app-container">
        <div className="main-content">
          {/* <div className="stats-header">
            <AnalyticsPanel
              onStateSelect={handleStateSelect}
              isHeaderView={true}
              selectedCategory={selectedCategory}
            />
          </div> */}

          <div className="content-row">
            <div className="left-content">
              <div className="map-section">
                {error && (
                  <div className="error-message">
                    <p>Error loading data: {error}</p>
                  </div>
                )}
                {loading && (
                  <div className="loading-spinner">
                    <p>Loading map data...</p>
                  </div>
                )}
                {!loading && (
                  <MapComponent 
                    statesData={statesData}
                    districtsData={districtsData}
                    pincodesData={pincodesData}
                    onStateSelect={handleStateSelect}
                    onDistrictSelect={handleDistrictSelect}
                    viewLevel={viewLevel}
                    selectedStateName={selectedStateName}
                    selectedCategory={selectedCategory}
                  />
                )}
              </div>
            </div>

            <div className="tabs-panel">
              <div className="map-tabs-section">
                <div className="tab-selection-heading" aria-live="polite">
                  {/* <span className="tab-selection-heading-label">Current Selection:</span> */}
                  <span className="tab-selection-heading-value">{currentSelectionText}</span>
                </div>

                <div className="stats-header">
                  <AnalyticsPanel
                    onStateSelect={handleStateSelect}
                    isHeaderView={true}
                    selectedCategory={selectedCategory}
                    selectedStateName={selectedStateName}
                    selectedDistrictName={selectedDistrictName}
                  />
                </div>
                
                <div className="map-tabs-header" role="tablist" aria-label="Map insights tabs">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeBottomTab === TAB_GLOBAL_SUMMARIES}
                    className={`map-tab-btn ${activeBottomTab === TAB_GLOBAL_SUMMARIES ? 'active' : ''}`}
                    onClick={() => setActiveBottomTab(TAB_GLOBAL_SUMMARIES)}
                  >
                    Global Summaries
                  </button>
                  {!isSchoolZone && (
                    <button
                      type="button"
                      role="tab"
                      aria-selected={activeBottomTab === TAB_COMPARISONS}
                      className={`map-tab-btn ${activeBottomTab === TAB_COMPARISONS ? 'active' : ''}`}
                      onClick={() => setActiveBottomTab(TAB_COMPARISONS)}
                    >
                      Comparisons
                    </button>
                  )}
                </div>

                <div className="map-tabs-content" role="tabpanel">
                  {activeBottomTab === TAB_GLOBAL_SUMMARIES && (
                    <div className="map-tab-panel">
                      <h3 className="map-tab-title-highlight">
                        <span>{isSchoolZone ? 'School Zone Global Summaries' : 'Global Summaries'}</span>
                        <span className="map-tab-title-separator">·</span>
                        <span className="scope-chip-row" key={`${selectedStateName || 'all'}-${selectedDistrictName || 'all'}`}>
                          {!hasStateSelection && !hasDistrictSelection && (
                            <span className="scope-chip scope-chip-neutral">India</span>
                          )}
                          {hasStateSelection && (
                            <span className="scope-chip scope-chip-state">{selectedStateName}</span>
                          )}
                          {hasDistrictSelection && (
                            <span className="scope-chip scope-chip-district">{selectedDistrictName}</span>
                          )}
                        </span>
                      </h3>
                      <BottomDashboard
                        selectedCategory={selectedCategory}
                        selectedStateName={selectedStateName}
                        selectedDistrictName={selectedDistrictName}
                      />
                    </div>
                  )}

                  {!isSchoolZone && activeBottomTab === TAB_COMPARISONS && (
                    <ComparisonsPanel
                      selectedStateName={selectedStateName}
                      selectedDistrictName={selectedDistrictName}
                      selectedCategory={selectedCategory}
                      selectedStateDistrictNames={selectedStateDistrictNames}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
