// frontend/src/components/EarthquakeMap.jsx
import React, { useEffect, useRef } from 'react';
import Map from '@arcgis/core/Map';
import MapView from '@arcgis/core/views/MapView';
import GeoJSONLayer from '@arcgis/core/layers/GeoJSONLayer';
import '@arcgis/core/assets/esri/themes/light/main.css';

const EarthquakeMap = () => {
  const mapRef = useRef(null);

  useEffect(() => {
    console.log("Map container ref:", mapRef.current);

    const map = new Map({
      basemap: 'topo-vector',
    });

    const view = new MapView({
      container: mapRef.current,
      map: map,
      center: [78, 22], // Center on India
      zoom: 4,
    });
      


    const geojsonLayer = new GeoJSONLayer({
      url: 'http://localhost:3001/api/sites', // Connect to Express API
      popupTemplate: {
        title: 'Magnitude {mag} Earthquake',
        content: `
          <b>Place:</b> {place} <br/>
          <b>Time:</b> {time} <br/>
          <b>Magnitude:</b> {mag}<br>
          <b>Types:</b>{types}
        `,
      },
      renderer: {
        type: 'simple',
        symbol: {
          type: 'simple-marker',
          style: 'triangle',
          color: 'orange',
          size: 8,
        },
      },
      
    });

    map.add(geojsonLayer);

    return () => {
      if (view) view.destroy();
    };
  }, []);

  return (
    <div ref={mapRef} style={{ height: '100vh', width: '100%' }}></div>
  );
};

export default EarthquakeMap;