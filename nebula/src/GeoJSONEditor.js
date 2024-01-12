// GeoJSONEditor.js
import React, { useState } from 'react';
import DeckGL from '@deck.gl/react';
import { EditableGeoJsonLayer, ModifyMode } from 'nebula.gl';
import { Map } from 'react-map-gl';

const myFeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [78, 12],
              [78.5, 12.5],
              [79, 12],
              [78.75, 11.75],
              [78, 12]
            ]
          ]
        },
        properties: {
          name: 'Sample Polygon',
          description: 'This is a sample polygon feature.'
        }
    }
  ]
};

const GeoJSONEditor = () => {

    const [featureCollection, setFetureCollection] = useState(myFeatureCollection)
    const [selectedFeIndex, setSelectedFeIndex] = useState(0)
    const selectedFeatureIndexes = [selectedFeIndex]

    const onFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const geojson = JSON.parse(e.target.result);
            setFetureCollection(geojson);
          };
          reader.readAsText(file);
        }
    };

    const layer = new EditableGeoJsonLayer({
        data: featureCollection,
        mode: ModifyMode,
        pickable: true,
        selectedFeatureIndexes: selectedFeatureIndexes,
        autoHighlight: true,
        onClick: (info, event) => {
            setSelectedFeIndex(info.index)
        },
        onEdit: ({ updatedData }) => {
            console.log('onEdit: ', updatedData)
            setFetureCollection(updatedData)
        }
    })

    console.log('layer: ', layer)

    return (
        <div style={{ position: 'relative' }}>
          <input type="file" onChange={onFileChange} style={{ position: 'absolute', zIndex: 1 }} />
          <DeckGL
            initialViewState={{
              latitude: 12,
              longitude: 78,
              zoom: 3,
            }}
            controller={true}
            width="100vw"
            height="100vh"
            layers={[layer]}
          >
            <Map
              mapboxAccessToken='pk.eyJ1IjoibWlrZS11c2VyIiwiYSI6ImNsYjBkNWQ3OTFnOGYzeHFtNGs3MGcyZHYifQ.1Vqi8jnAO6iMTPi9EPXkWA'
              mapStyle='mapbox://styles/mapbox/streets-v11'
            />
          </DeckGL>
        </div>
    );
}

export default GeoJSONEditor;