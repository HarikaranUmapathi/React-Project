import React, { useEffect, useRef, useState } from 'react';
import Map from '@arcgis/core/Map';
import MapView from '@arcgis/core/views/MapView';
import GeoJSONLayer from '@arcgis/core/layers/GeoJSONLayer';
import Graphic from '@arcgis/core/Graphic';
import Sketch from '@arcgis/core/widgets/Sketch';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import * as geometryEngine from '@arcgis/core/geometry/geometryEngine';
import '@arcgis/core/assets/esri/themes/light/main.css';

const HOME_KEY = 'homeLocation';

const EarthquakeMap = () => {
  const mapRef = useRef(null);
  const viewRef = useRef(null);
  const sketchLayerRef = useRef(null);
  const geojsonLayerRef = useRef(null);

  const [location, setLocation] = useState('');
  const [latInput, setLatInput] = useState('');
  const [lonInput, setLonInput] = useState('');
  const [coords, setCoords] = useState(null);
  const [selectedPlaces, setSelectedPlaces] = useState([]);

  const [bookmarks, setBookmarks] = useState(() => {
    const stored = localStorage.getItem('mapBookmarks');
    return stored ? JSON.parse(stored) : [];
  });

  const [bookmarkGraphics, setBookmarkGraphics] = useState([]);

  useEffect(() => {
    localStorage.setItem('mapBookmarks', JSON.stringify(bookmarks));
  }, [bookmarks]);

  const pointA = useRef(null);
  const pointB = useRef(null);

  const getHomeLocation = () => {
    const stored = localStorage.getItem(HOME_KEY);
    return stored ? JSON.parse(stored) : null;
  };

  useEffect(() => {
    const map = new Map({ basemap: 'streets-vector' });

    const view = new MapView({
      container: mapRef.current,
      map,
      center: getHomeLocation() || [78, 22],
      zoom: 4,
    });

    viewRef.current = view;

    const geojsonLayer = new GeoJSONLayer({
      url: 'http://localhost:3001/api/geojson',
      popupTemplate: {
        title: 'Site ID: {SITEID}',
        content: (feature) => {
          const coords = feature.graphic.geometry;
          return `<b>Latitude:</b> ${coords.y?.toFixed(6)}<br/><b>Longitude:</b> ${coords.x?.toFixed(6)}`;
        },
      },
      renderer: {
        type: 'simple',
        symbol: {
          type: 'simple-marker',
          style: 'circle',
          color: 'blue',
          size: 8,
        },
      },
    });

    geojsonLayerRef.current = geojsonLayer;
    map.add(geojsonLayer);

    const sketchLayer = new GraphicsLayer();
    sketchLayerRef.current = sketchLayer;
    map.add(sketchLayer);

    const sketch = new Sketch({
      layer: sketchLayer,
      view,
      creationMode: 'update',
      availableCreateTools: ['rectangle', 'polyline'],
    });

    view.ui.add(sketch, 'top-left');

    sketch.on('create', async (event) => {
      if (event.state === 'complete') {
        const geom = event.graphic.geometry;

        if (geom.type === 'polygon') {
          const query = geojsonLayer.createQuery();
          query.geometry = geom;
          query.spatialRelationship = 'intersects';
          query.returnGeometry = true;
          query.outFields = ['SITEID'];

          const { features } = await geojsonLayer.queryFeatures(query);
          setSelectedPlaces(
            features.map((f) => ({
              siteId: f.attributes.SITEID,
              lat: f.geometry.y,
              lon: f.geometry.x,
            }))
          );
        }

        if (geom.type === 'polyline') {
          const geomWithSR = {
            ...geom,
            spatialReference: { wkid: 4326 },
          };

          const distance = geometryEngine.geodesicLength(geomWithSR, 'kilometers');

          const path = geom.paths[0];
          const [start, end] = [path[0], path[path.length - 1]];

          const midPoint = {
            type: 'point',
            longitude: (start[0] + end[0]) / 2,
            latitude: (start[1] + end[1]) / 2,
            spatialReference: { wkid: 4326 },
          };

          const lineGraphic = new Graphic({
            geometry: geom,
            symbol: {
              type: 'simple-line',
              color: 'green',
              width: 3,
            },
          });

          const textGraphic = new Graphic({
            geometry: midPoint,
            symbol: {
              type: 'text',
              color: 'black',
              haloColor: 'white',
              haloSize: 2,
              text: `${distance.toFixed(2)} km`,
              font: {
                size: 18,
                family: 'Arial',
                weight: 'bold',
              },
            },
          });

          sketchLayer.addMany([lineGraphic, textGraphic]);
        }
      }
    });

    view.on('click', (event) => {
      const clickedPoint = event.mapPoint;

      if (!pointA.current) {
        pointA.current = clickedPoint;
        addMarker(clickedPoint, 'A', 'blue');
      } else if (!pointB.current) {
        pointB.current = clickedPoint;
        addMarker(clickedPoint, 'B', 'red');

        const ptA = {
          type: 'point',
          longitude: pointA.current.longitude,
          latitude: pointA.current.latitude,
          spatialReference: { wkid: 4326 },
        };

        const ptB = {
          type: 'point',
          longitude: pointB.current.longitude,
          latitude: pointB.current.latitude,
          spatialReference: { wkid: 4326 },
        };

        const distance = geometryEngine.distance(ptA, ptB, 'kilometers');

        view.openPopup({
          location: pointB.current,
          title: '📏 Distance Measurement',
          content: `<b>Distance between Point A and Point B:</b><br>${distance.toFixed(2)} km`,
        });
      } else {
        view.graphics.removeAll();
        pointA.current = clickedPoint;
        pointB.current = null;
        addMarker(pointA.current, 'A', 'blue');
      }
    });

    return () => {
      if (view) {
        view.destroy();
        viewRef.current = null;
      }
    };
  }, []);

  const addMarker = (point, label, color) => {
    if (!viewRef.current) return;

    const marker = new Graphic({
      geometry: point,
      symbol: {
        type: 'simple-marker',
        color,
        size: 10,
        outline: { color: 'white', width: 1 },
      },
      attributes: { label },
      popupTemplate: {
        title: `📍 Point ${label}`,
        content: `Latitude: ${point.latitude.toFixed(6)}<br>Longitude: ${point.longitude.toFixed(6)}`,
      },
    });

    viewRef.current.graphics.add(marker);
  };

  const handleSearch = async () => {
    try {
      let point;

      if (latInput && lonInput) {
        point = {
          type: 'point',
          latitude: parseFloat(latInput),
          longitude: parseFloat(lonInput),
          spatialReference: { wkid: 4326 },
        };
      } else if (location) {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`
        );
        const data = await response.json();
        if (data.length === 0) return alert('Location not found');
        const { lat, lon } = data[0];
        point = {
          type: 'point',
          latitude: parseFloat(lat),
          longitude: parseFloat(lon),
          spatialReference: { wkid: 4326 },
        };
      } else {
        return alert('Enter location or coordinates');
      }

      viewRef.current.goTo({ center: [point.longitude, point.latitude], zoom: 10 });

      const marker = new Graphic({
        geometry: point,
        symbol: {
          type: 'simple-marker',
          color: 'red',
          size: 10,
        },
        attributes: { name: location || 'Coordinates' },
        popupTemplate: {
          title: 'Pinned Location',
          content: `Latitude: ${point.latitude.toFixed(6)}<br>Longitude: ${point.longitude.toFixed(6)}`,
        },
      });

      viewRef.current.graphics.add(marker);
      setCoords({ lat: point.latitude, lon: point.longitude });

      setLocation('');
      setLatInput('');
      setLonInput('');
    } catch (err) {
      console.error('Search error:', err);
      alert('Failed to search.');
    }
  };

  const handleRemovePin = () => {
    if (!viewRef.current || !sketchLayerRef.current) return;
    viewRef.current.graphics.removeAll();
    sketchLayerRef.current.removeAll();
    setCoords(null);
    pointA.current = null;
    pointB.current = null;
  };

  const setHomeLocation = () => {
    if (!viewRef.current) return;

    const center = viewRef.current.center;
    const homeCoords = [center.longitude, center.latitude];
    localStorage.setItem(HOME_KEY, JSON.stringify(homeCoords));
    alert('Home location saved!');

    const homeGraphic = new Graphic({
      geometry: {
        type: 'point',
        longitude: homeCoords[0],
        latitude: homeCoords[1],
        spatialReference: { wkid: 4326 },
      },
      symbol: {
        type: 'picture-marker',
        url: 'https://static.arcgis.com/images/Symbols/Basic/House.png',
        width: '24px',
        height: '24px',
      },
      attributes: { type: 'home' },
      popupTemplate: {
        title: '🏠 Home Location',
        content: `Latitude: ${homeCoords[1].toFixed(6)}<br>Longitude: ${homeCoords[0].toFixed(6)}`,
      },
    });

    viewRef.current.graphics.add(homeGraphic);
  };

  const goToHomeLocation = () => {
    const home = getHomeLocation();
    if (home) {
      viewRef.current.goTo({ center: home, zoom: 10 });
    } else {
      alert('No home location saved.');
    }
  };

  const addBookmark = () => {
    if (!viewRef.current) return;

    const name = prompt('Enter bookmark name:');
    if (!name) return;

    const center = viewRef.current.center;
    const zoom = viewRef.current.zoom;

    const newBookmark = {
      name,
      center: [center.longitude, center.latitude],
      zoom,
    };

    const graphic = new Graphic({
      geometry: {
        type: 'point',
        longitude: center.longitude,
        latitude: center.latitude,
        spatialReference: { wkid: 4326 },
      },
      symbol: {
        type: 'picture-marker',
        url: 'https://static.arcgis.com/images/Symbols/Basic/RedShinyPin.png',
        width: '24px',
        height: '24px',
      },
      attributes: {
        type: 'bookmark',
        name,
      },
      popupTemplate: {
        title: `📌 ${name}`,
        content: `Latitude: ${center.latitude.toFixed(6)}<br>Longitude: ${center.longitude.toFixed(6)}`,
      },
    });

    viewRef.current.graphics.add(graphic);
    setBookmarkGraphics((prev) => [...prev, graphic]);
    setBookmarks((prev) => [...prev, newBookmark]);
  };

  const removeBookmark = (index) => {
    const updated = [...bookmarks];
    updated.splice(index, 1);
    setBookmarks(updated);

    const graphic = bookmarkGraphics[index];
    if (graphic && viewRef.current) {
      viewRef.current.graphics.remove(graphic);
    }

    const updatedGraphics = [...bookmarkGraphics];
    updatedGraphics.splice(index, 1);
    setBookmarkGraphics(updatedGraphics);
  };

  const goToBookmark = (bookmark) => {
    viewRef.current.goTo({ center: bookmark.center, zoom: bookmark.zoom });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div style={{ display: 'flex', flex: 1 }}>
        <div ref={mapRef} style={{ flex: 1 }} />
        <div 
          style={{
            width: '260px',
            display: 'flex',
            flexDirection: 'column',
            padding: '10px',
            background: 'linear-gradient(135deg,orange, blue, violet)',
            border: '4px solid transparent',
            borderImage: 'linear-gradient(135deg, orange, blue, violet) 1',
            overflowY: 'auto',
            boxShadow:"0 8px 16px rgba(0, 0, 0, 0.3)",
            color: 'white',
            fontWeight: 'bold',
            overflowY: 'auto',
          }}
        >
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Search by name" />
          <input value={latInput} onChange={(e) => setLatInput(e.target.value)} placeholder="Latitude" />
          <input value={lonInput} onChange={(e) => setLonInput(e.target.value)} placeholder="Longitude" />
          <button onClick={handleSearch}>🔍 Search</button>
          <button onClick={handleRemovePin}>❌ Remove Pin</button>
          <button onClick={setHomeLocation}>🏠 Set Home</button>
          <button onClick={goToHomeLocation}>📍 Go to Home</button>
          <button onClick={addBookmark}>🔖 Add Bookmark</button>

          {coords && (
            <div>
              <h4>Selected Location:</h4>
              <p>Latitude: {coords.lat.toFixed(6)}</p>
              <p>Longitude: {coords.lon.toFixed(6)}</p>
            </div>
          )}

          {selectedPlaces.length > 0 && (
            <div>
              <h4>Selected Places:</h4>
              <ul>
                {selectedPlaces.map((place) => (
                  <li key={place.siteId}>
                    {place.siteId} (Lat: {place.lat.toFixed(6)}, Lon: {place.lon.toFixed(6)})
                  </li>
                ))}
              </ul>
            </div>
          )}

          {bookmarks.length > 0 && (
            <div>
              <h4>📌 Bookmarks:</h4>
              <ul>
                {bookmarks.map((bm, index) => (
                  <li key={index}>
                    <span
                      style={{ cursor: 'pointer', textDecoration: 'underline' }}
                      onClick={() => goToBookmark(bm)}
                    >
                      {bm.name}
                    </span>
                    <button
                      onClick={() => removeBookmark(index)}
                      style={{
                        marginLeft: '6px',
                        background: 'white',
                        color: 'red',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                      }}
                    >
                      ❌
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EarthquakeMap;
