import React, { useState, useEffect, useRef, useCallback } from 'react';
import DeckGL from '@deck.gl/react';
import { EditableGeoJsonLayer, ModifyMode, ViewMode } from 'nebula.gl';
import { Map } from 'react-map-gl';
import bbox from '@turf/bbox';
import './GeoJSONEditor.css';

const GeoJSONEditor = () => {
  const [editableFeatureCollection, setEditableFeatureCollection] = useState(null);
  const [readOnlyFeatureCollections, setReadOnlyFeatureCollections] = useState([]);
  const [selectedFeatureIndex, setSelectedFeatureIndex] = useState(0);
  const [viewState, setViewState] = useState({
    latitude: 12,
    longitude: 78,
    zoom: 3,
    bearing: 0,
    pitch: 0
  });

  const mapRef = useRef(null);
  const prevViewStateRef = useRef(viewState);  // New ref to track the previous state

  const zoomToBounds = useCallback((geojson) => {
    if (!geojson || !geojson.features || geojson.features.length === 0) {
      console.warn('Invalid or empty GeoJSON');
      return;
    }

    try {
      const bounds = bbox(geojson);
      const [minLng, minLat, maxLng, maxLat] = bounds;

      if (minLng === maxLng || minLat === maxLat) {
        console.warn('Invalid bounds - single point or line');
        return;
      }

      // Calculate appropriate zoom level based on bounds
      const longitudeDelta = Math.abs(maxLng - minLng);
      const latitudeDelta = Math.abs(maxLat - minLat);
      const zoom = Math.min(
        Math.floor(8 - Math.log2(longitudeDelta)),
        Math.floor(8 - Math.log2(latitudeDelta))
      );

      const newViewState = {
        longitude: (minLng + maxLng) / 2,
        latitude: (minLat + maxLat) / 2,
        zoom: Math.min(Math.max(zoom, 1), 20), // Clamp zoom between 1 and 20
        transitionDuration: 1000
      };

      // Only update the state if the viewState has actually changed
      if (
        newViewState.latitude !== prevViewStateRef.current.latitude ||
        newViewState.longitude !== prevViewStateRef.current.longitude ||
        newViewState.zoom !== prevViewStateRef.current.zoom
      ) {
        setViewState(newViewState);
        prevViewStateRef.current = newViewState;  // Update the ref with the new state
      }

    } catch (error) {
      console.error('Error calculating bounds:', error);
    }
  }, []);

  const onFileChange = useCallback((event, mode) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const geojson = JSON.parse(e.target.result);

        // Validate GeoJSON structure
        if (!geojson.type || !geojson.features) {
          throw new Error('Invalid GeoJSON format');
        }

        if (mode === 'editable') {
          setEditableFeatureCollection(geojson);
          setReadOnlyFeatureCollections([]);
          setSelectedFeatureIndex(0);
        } else {
          setReadOnlyFeatureCollections(prev => [...prev, geojson]);
        }

        // Zoom to the newly added features
        zoomToBounds(geojson);
      } catch (error) {
        console.error('Error parsing GeoJSON:', error);
        alert('Invalid GeoJSON file. Please check the file format.');
      }
    };
    reader.onerror = () => {
      console.error('Error reading file');
      alert('Error reading file. Please try again.');
    };
    reader.readAsText(file);
  }, [zoomToBounds]);

  useEffect(() => {
    if (editableFeatureCollection || readOnlyFeatureCollections.length > 0) {
      // Zoom to all features when collections change
      const allFeatures = {
        type: 'FeatureCollection',
        features: [
          ...(editableFeatureCollection?.features || []),
          ...(readOnlyFeatureCollections?.features || []),
        ]
      };
      if (allFeatures.features.length > 0) {
        zoomToBounds(allFeatures);
      }
    }
  }, [editableFeatureCollection, readOnlyFeatureCollections, zoomToBounds]);

  const saveFile = useCallback(() => {
    if (!editableFeatureCollection) return;

    try {
      const blob = new Blob([JSON.stringify(editableFeatureCollection, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'edited-geojson.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error saving file:', error);
      alert('Error saving file. Please try again.');
    }
  }, [editableFeatureCollection]);

  const layers = [
    editableFeatureCollection && new EditableGeoJsonLayer({
      id: 'editable-layer',
      data: editableFeatureCollection,
      mode: ModifyMode,
      pickable: true,
      selectedFeatureIndexes: [selectedFeatureIndex],
      autoHighlight: true,
      onClick: (info) => {
        if (info.index !== undefined) {
          setSelectedFeatureIndex(info.index);
        }
      },
      onEdit: ({ updatedData }) => {
        setEditableFeatureCollection(updatedData);
      }
    }),
    ...readOnlyFeatureCollections.map((collection, index) =>
      new EditableGeoJsonLayer({
        id: `readonly-layer-${index}`,
        data: collection,
        mode: ViewMode,
        pickable: true,
        autoHighlight: true,
        getFillColor: [0, 200, 0, 100],
        getLineColor: [0, 200, 0, 200],
      })
    )
  ].filter(Boolean);

  return (
    <div className="relative w-full h-screen">
      <DeckGL
        viewState={viewState}
        onViewStateChange={({ viewState }) => setViewState(viewState)}
        controller={true}
        layers={layers}
      >
        <Map
          ref={mapRef}
          mapboxAccessToken={process.env.REACT_APP_MAPBOX_TOKEN}
          mapStyle="mapbox://styles/mapbox/streets-v11"
          reuseMaps
        />
      </DeckGL>
      <div
        style={{
          position: 'relative',
          backgroundColor: '#ffffff',
          padding: '20px',
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
          borderRadius: '8px',
          maxWidth: '400px',
          margin: '20px auto',
          zIndex: 100
        }}
      >
        <label
          className="file-upload-btn-wrapper"
          style={{ display: 'block', marginBottom: '10px' }}
        >
          <span
            className="btn"
            style={{
              display: 'block',
              textAlign: 'center',
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: '#ffffff',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Upload Editable File
          </span>
          <input
            type="file"
            style={{ display: 'none' }}
            accept=".json,.geojson"
            onChange={(e) => onFileChange(e, 'editable')}
          />
        </label>
        <label
          className="file-upload-btn-wrapper"
          style={{ display: 'block', marginBottom: '10px' }}
        >
          <span
            className="btn"
            style={{
              display: 'block',
              textAlign: 'center',
              padding: '10px 20px',
              backgroundColor: '#28a745',
              color: '#ffffff',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Upload Read-Only File
          </span>
          <input
            type="file"
            style={{ display: 'none' }}
            accept=".json,.geojson"
            onChange={(e) => onFileChange(e, 'readonly')}
          />
        </label>
        {editableFeatureCollection && (
          <button
            onClick={saveFile}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'center',
              padding: '10px 20px',
              backgroundColor: '#ffc107',
              color: '#ffffff',
              borderRadius: '5px',
              cursor: 'pointer',
              border: 'none',
              marginTop: '10px'
            }}
          >
            Save Edited File
          </button>
        )}
      </div>
    </div>
  );
};

export default GeoJSONEditor;
