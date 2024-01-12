// GeoJSONEditor.js
import React, { useState } from 'react';
import DeckGL from '@deck.gl/react';
import { EditableGeoJsonLayer, ModifyMode, ViewMode } from 'nebula.gl';
import { Map } from 'react-map-gl';

const GeoJSONEditor = () => {
  const [editableFeatureCollection, setEditableFeatureCollection] = useState(null);
  const [readOnlyFeatureCollections, setReadOnlyFeatureCollections] = useState([]);
  const [selectedFeatureIndex, setSelectedFeatureIndex] = useState(0);

  const onFileChange = (event, mode) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const geojson = JSON.parse(e.target.result);
        if (mode === 'editable') {
          setEditableFeatureCollection(geojson);
          setSelectedFeatureIndex(0);
        } else {
          setReadOnlyFeatureCollections((prevCollections) => [...prevCollections, geojson]);
        }
      };
      reader.readAsText(file);
    }
  };

  const editableLayer = editableFeatureCollection && new EditableGeoJsonLayer({
    data: editableFeatureCollection,
    mode: ModifyMode,
    pickable: true,
    selectedFeatureIndexes: [selectedFeatureIndex],
    autoHighlight: true,
    onClick: (info) => {
      setSelectedFeatureIndex(info.index);
    },
    onEdit: ({ updatedData }) => {
      setEditableFeatureCollection(updatedData);
    }
  });

  const readOnlyLayers = readOnlyFeatureCollections.map((collection, index) => (
    new EditableGeoJsonLayer({
      id: `readonly-layer-${index}`,
      data: collection,
      mode: ViewMode,
      pickable: true,
      autoHighlight: true,
    })
  ));

  const layers = [editableLayer, ...readOnlyLayers].filter(Boolean);

  return (
    <div>
      <DeckGL
        initialViewState={{
          latitude: 12,
          longitude: 78,
          zoom: 3
        }}
        controller={true}
        width="100vw"
        height="100vh"
        layers={layers}
      >
        <Map
          mapboxAccessToken='pk.eyJ1IjoibWlrZS11c2VyIiwiYSI6ImNsYjBkNWQ3OTFnOGYzeHFtNGs3MGcyZHYifQ.1Vqi8jnAO6iMTPi9EPXkWA'
          mapStyle='mapbox://styles/mapbox/streets-v11'
        />
      </DeckGL>
      <div style={{ position: 'relative', backgroundColor: '#f0f0f0', padding: '20px' }}>
        <label className="file-upload-btn-wrapper" style={{ zIndex: 100 }}>
          <span className="btn">Upload Editable File</span>
          <input type="file" onChange={(e) => onFileChange(e, 'editable')} />
        </label>
        <label className="file-upload-btn-wrapper" style={{ zIndex: 100, marginLeft: '20px' }}>
          <span className="btn">Upload Read-Only File</span>
          <input type="file" onChange={(e) => onFileChange(e, 'readonly')} />
        </label>
      </div>
    </div>
  );
};

export default GeoJSONEditor;
