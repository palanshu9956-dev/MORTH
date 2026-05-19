import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getStateName, getMorthStateData, getColorBySeverity, formatNumber, districtMatchesState, getDistrictName } from '../utils/helpers';
import { getDistrictData } from '../data/morthData';
import '../styles/map.css';

const MapComponent = ({ 
  statesData, 
  districtsData, 
  onStateSelect, 
  onDistrictSelect,
  viewLevel, 
  selectedStateName,
  pincodesData,
  selectedCategory
}) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const currentGeoLayer = useRef(null);
  const countMarkers = useRef([]);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Initialize map
    map.current = L.map(mapContainer.current, {
      center: [22.9734, 78.6569],
      zoom: 5,
      minZoom: 3,
      maxZoom: 18,
      zoomControl: false,
      attributionControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map.current);

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Clear count markers
  const clearCountMarkers = () => {
    countMarkers.current.forEach(m => {
      if (map.current && map.current.hasLayer(m)) {
        map.current.removeLayer(m);
      }
    });
    countMarkers.current = [];
  };

  // Add district name labels for district map view
  const addDistrictLabels = (features) => {
    clearCountMarkers();

    (features || []).forEach((feature) => {
      if (!map.current) return;

      const dName = getDistrictName(feature?.properties || {});
      if (!dName || dName === 'District') return;

      try {
        const center = L.geoJSON(feature).getBounds().getCenter();
        const icon = L.divIcon({
          className: 'map-district-label',
          html: `<span class="district-label-name">${dName}</span>`,
          iconSize: [120, 20],
          iconAnchor: [60, 10],
        });

        const marker = L.marker(center, {
          icon,
          interactive: false,
          keyboard: false,
        }).addTo(map.current);

        countMarkers.current.push(marker);
      } catch (e) {
        console.error('Error adding district label', e);
      }
    });
  };

  // Add count labels for MORTH states
  const addCountLabels = (geojsonData) => {
    clearCountMarkers();
    (geojsonData.features || []).forEach(feature => {
      const stateName = getStateName(feature);
  const mData = getMorthStateData(stateName, selectedCategory);
      if (!mData || !map.current) return;
      
      try {
        const bounds = L.geoJSON(feature).getBounds();
        const center = bounds.getCenter();
        const icon = L.divIcon({
          className: 'map-count-label',
          html: `<span class="label-name">${mData.name}</span><span class="label-count">${
            formatNumber(
              selectedCategory === 'schools-zone'
                ? (mData.school_zone_metrics?.total_accidents || mData.fg_covered)
                : mData.fg_covered
            )
          }</span>`,
          iconSize: [60, 28],
          iconAnchor: [30, 14],
        });
        const marker = L.marker(center, { icon: icon, interactive: false }).addTo(map.current);
        countMarkers.current.push(marker);
      } catch (e) {
        console.error('Error adding count label', e);
      }
    });
  };

  // Render GeoJSON
  const renderGeoJSON = (geojsonData, style, onEachFeature) => {
    if (currentGeoLayer.current && map.current) {
      map.current.removeLayer(currentGeoLayer.current);
      currentGeoLayer.current = null;
    }

    if (!map.current) return;

    currentGeoLayer.current = L.geoJSON(geojsonData, {
      style: style,
      onEachFeature: onEachFeature,
    }).addTo(map.current);

    return currentGeoLayer.current;
  };

  // Get feature style
  const getFeatureStyle = (feature) => {
    const stateName = getStateName(feature);
  const mData = getMorthStateData(stateName, selectedCategory);
    const fillColor = mData ? getColorBySeverity(mData.total_fg) : '#e0e0e0';
    return {
      color: '#455a64',
      weight: 1,
      fillColor: fillColor,
      fillOpacity: 0.85,
    };
  };

  // Build hover tooltip
  const buildHoverTooltip = (stateName, morthData) => {
    if (!morthData) {
      return `<div class="state-hover-card">
        <div class="state-card-title">${stateName}</div>
        <div class="state-card-row" style="color:#999">No MORTH data available</div>
      </div>`;
    }

    if (selectedCategory === 'schools-zone') {
      const schoolMetrics = morthData.school_zone_metrics || {};
      const ageMetric = schoolMetrics.accidents_age_6_18;
      const accidentsAge618 = Array.isArray(ageMetric)
        ? ageMetric.reduce((sum, row) => sum + (Number(row?.value) || 0), 0)
        : Number.isFinite(Number(ageMetric))
          ? Number(ageMetric)
          : 0;
      return `
        <div class="state-hover-card">
          <div class="state-card-title">${stateName}</div>
          <div class="state-card-row">Total School Zones: ${formatNumber(schoolMetrics.total_school_zones || morthData.blackspots)}</div>
          <div class="state-card-row">Total Accidents: ${formatNumber(schoolMetrics.total_accidents || morthData.fg_covered)}</div>
          <div class="state-card-row">Accidents (6-18 yrs): ${formatNumber(accidentsAge618)}</div>
          <div class="state-card-row">Pedestrian Accidents: ${formatNumber(schoolMetrics.pedestrian_accidents || morthData.total_grievous)}</div>
        </div>
      `;
    }

    return `
      <div class="state-hover-card">
        <div class="state-card-title">${stateName}</div>
        <div class="state-card-row">Accidents (Fatal + Grievous): ${formatNumber(morthData.fg_covered)}</div>
        <div class="state-card-row">Fatalities: ${formatNumber(morthData.total_fatalities)}</div>
        <div class="state-card-row">Grievous Injuries: ${formatNumber(morthData.total_grievous)}</div>
        <div class="state-card-row">Black Corridors: ${formatNumber(morthData.corridors)}</div>
        
      </div>
    `;
  };

  // Build district hover tooltip
  const buildDistrictHoverTooltip = (districtName, districtData) => {
    if (!districtData) {
      return `<div class="state-hover-card">
        <div class="state-card-title">${districtName}</div>
        <div class="state-card-row" style="color:#999">No district data available</div>
      </div>`;
    }

    if (selectedCategory === 'schools-zone') {
      const schoolMetrics = districtData.school_zone_metrics || {};
      const ageMetric = schoolMetrics.accidents_age_6_18;
      const accidentsAge618 = Array.isArray(ageMetric)
        ? ageMetric.reduce((sum, row) => sum + (Number(row?.value) || 0), 0)
        : Number.isFinite(Number(ageMetric))
          ? Number(ageMetric)
          : 0;
      return `
        <div class="state-hover-card">
          <div class="state-card-title">${districtName}</div>
          <div class="state-card-row">Total School Zones: ${formatNumber(schoolMetrics.total_school_zones || districtData.blackspots)}</div>
          <div class="state-card-row">Total Accidents: ${formatNumber(schoolMetrics.total_accidents || districtData.fg_covered)}</div>
          <div class="state-card-row">Accidents (6-18 yrs): ${formatNumber(accidentsAge618)}</div>
          <div class="state-card-row">Pedestrian Accidents: ${formatNumber(schoolMetrics.pedestrian_accidents || districtData.total_grievous)}</div>
        </div>
      `;
    }

    return `
      <div class="state-hover-card">
        <div class="state-card-title">${districtName}</div>
        <div class="state-card-row">Accidents (Fatal + Grievous): ${formatNumber(districtData.fg_covered)}</div>
        <div class="state-card-row">Fatalities: ${formatNumber(districtData.total_fatalities)}</div>
        <div class="state-card-row">Grievous Injuries: ${formatNumber(districtData.total_grievous)}</div>
        <div class="state-card-row">Black Corridors: ${formatNumber(districtData.corridors)}</div>
      </div>
    `;
  };

  // On each state feature
  const onEachStateFeature = (feature, layer) => {
    const stateName = getStateName(feature);
  const mData = getMorthStateData(stateName, selectedCategory);
    
    layer.on({
      mouseover: (e) => {
        layer.setStyle({ weight: 3, fillOpacity: 1 });
        const content = buildHoverTooltip(stateName, mData);
        layer.bindTooltip(content, { 
          sticky: true, 
          direction: 'top', 
          opacity: 1, 
          className: 'state-hover-tooltip' 
        }).openTooltip(e.latlng);
      },
      mouseout: () => {
        layer.setStyle(getFeatureStyle(feature));
        layer.closeTooltip();
      },
      click: () => {
        onStateSelect(stateName);
      }
    });
  };

  // Render states
  useEffect(() => {
    if (!statesData || !map.current) return;

    if (viewLevel === 'country') {
      clearCountMarkers();
      renderGeoJSON(statesData, getFeatureStyle, onEachStateFeature);
      addCountLabels(statesData);
      map.current.flyTo([22.9734, 78.6569], 5, { duration: 0.8, animate: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statesData, viewLevel, selectedCategory]);

  // Render districts
  useEffect(() => {
    if (viewLevel !== 'state' || !selectedStateName || !districtsData || !map.current) return;

    const filtered = (districtsData.features || []).filter(f => 
      districtMatchesState(f.properties, selectedStateName)
    );
    const fc = { type: 'FeatureCollection', features: filtered };

    clearCountMarkers();

    const colors = ['#bbdefb','#c8e6c9','#fff9c4','#f8bbd0','#d1c4e9','#b2ebf2','#ffe0b2','#dcedc8','#f0f4c3','#cfd8dc'];

    const style = (feature) => {
      const i = filtered.indexOf(feature);
      return { color: '#455a64', weight: 1.5, fillColor: colors[i % colors.length], fillOpacity: 0.7 };
    };

    const onEachFeature = (feature, layer) => {
      const dName = getDistrictName(feature?.properties || {});
      const districtData = getDistrictData(selectedStateName, dName, selectedCategory);
      const baseStyle = () => {
        const i = filtered.indexOf(feature);
        return { color: '#455a64', weight: 1.5, fillColor: colors[i % colors.length], fillOpacity: 0.7 };
      };

      layer.on({
        mouseover: (e) => {
          layer.setStyle({ weight: 3, fillOpacity: 1 });
          layer.bindTooltip(buildDistrictHoverTooltip(dName, districtData), { 
            sticky: true, 
            direction: 'top', 
            opacity: 1, 
            className: 'state-hover-tooltip' 
          }).openTooltip(e.latlng);
        },
        mouseout: () => { 
          layer.setStyle(baseStyle()); 
          layer.closeTooltip(); 
        },
        click: () => {
          if (onDistrictSelect) {
            onDistrictSelect(dName);
          }
        }
      });
    };

    renderGeoJSON(fc, style, onEachFeature);
    addDistrictLabels(filtered);

    if (filtered.length > 0) {
      const bounds = L.geoJSON(fc).getBounds();
      map.current.flyToBounds(bounds, { padding: [30, 30], maxZoom: 12, duration: 0.9, animate: true });
    }
  }, [viewLevel, selectedStateName, districtsData, selectedCategory]);

  return <div ref={mapContainer} className="map-container" />;
};

export default MapComponent;
