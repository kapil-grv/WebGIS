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
      <DeckGL
      initialViewState={{
          latitude: 12,    // Default latitude
          longitude: 78,   // Default longitude
          zoom: 8,         // Default zoom level
        }}
        controller={true}
        width="100vw"  // Set a default width
        height="100vh" // Set a default height
        layers={[layer]}
      >
        <Map
          mapboxAccessToken='pk.eyJ1IjoibWlrZS11c2VyIiwiYSI6ImNsYjBkNWQ3OTFnOGYzeHFtNGs3MGcyZHYifQ.1Vqi8jnAO6iMTPi9EPXkWA'
          mapStyle='mapbox://styles/mapbox/streets-v11'
        />
      </DeckGL>
    );
}

export default GeoJSONEditor;