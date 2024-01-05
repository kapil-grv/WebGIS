mapboxgl.accessToken = 'pk.eyJ1IjoibWlrZS11c2VyIiwiYSI6ImNsYjBkNWQ3OTFnOGYzeHFtNGs3MGcyZHYifQ.1Vqi8jnAO6iMTPi9EPXkWA';
let activeLayers = [];
let firstPointLayerId;

const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v11',
    center: [78, 22], // Set the center coordinates
    zoom: 3 // Set the zoom level
});

// Initialize legend when the map is loaded
map.on('load', () => {
    // Add zoom control
    const zoomControl = new mapboxgl.NavigationControl();
    map.addControl(zoomControl, 'top-right');
    
    // Create a custom control for the legend
    const legendControl = new mapboxgl.NavigationControl();
    legendControl.onAdd = function () {
        const legendDiv = document.getElementById('legend');
        return legendDiv;
    };

    // Add the legend control to the map
    map.addControl(legendControl);
});

// Function to get the initial state of dataset checkboxes
function getInitialState() {
    return Array.from(document.querySelectorAll('input[name="dataset"]')).map(checkbox => checkbox.checked);
}

// Initialize previousState
let previousState = getInitialState();

// Function to update map based on selected datasets
function updateMap(selectedDatasets) {
    selectedDatasets.forEach(dataset => {
        if (map.getSource(`${dataset}`)) {
            // Dataset is already loaded, do nothing
            console.log(`Dataset "${dataset}" is already loaded.`);
        } else {
            // Fetch and load geospatial data for the selected dataset
            console.log(`Loading dataset: ${dataset}`);
            loadDatasets([dataset]);
        }
    });
}

// Function to handle checkbox changes
function handleCheckboxChange(checkboxes) {
    // Get the current state of checkboxes
    const currentState = Array.from(checkboxes).map(checkbox => checkbox.checked);

    // Find the unselected dataset (if any)
    const unselectedDatasetIndex = currentState.findIndex((checked, i) => previousState[i] && !checked);
    const unselectedDataset = unselectedDatasetIndex !== -1 ? checkboxes[unselectedDatasetIndex].value : null;

    console.log(`Unselected dataset: ${unselectedDataset}`);
    if (unselectedDataset) {
        // Unload the unselected dataset from the map
        map.removeLayer(`layer-${unselectedDataset}`);
        map.removeSource(`${unselectedDataset}`);

        // Remove inactive layers
        console.log(`removing layer from activeLayers => ${unselectedDataset}`);
        const index = activeLayers.findIndex(layer => Object.keys(layer)[0] === unselectedDataset);
        console.log(`index => ${index}`);

        if (index !== -1) {
            // Layer is active, remove it
            console.log(`activeLayers before removal => ${JSON.stringify(activeLayers)}`);
            activeLayers.splice(index, 1);
            console.log(`activeLayers after removal => ${JSON.stringify(activeLayers)}`);
        }

        updateLegend();
    }

    // Update previous state
    previousState = currentState;

    // Get selected datasets
    const selectedDatasets = currentState
        .map((checked, i) => (checked ? checkboxes[i].value : null))
        .filter(dataset => dataset !== null);

    console.log(`Selected datasets: ${selectedDatasets}`);
    console.log(`Triggering load / unload for => ${selectedDatasets}`);
    
    // Update the map based on the selected datasets
    updateMap(selectedDatasets);
}

// Get all dataset checkboxes
const datasetCheckboxes = document.querySelectorAll('.dataset-option input');

// Add event listener to each checkbox
datasetCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', () => {
        // Handle checkbox change
        handleCheckboxChange(datasetCheckboxes);
    });
});

function toggleSidePanel() {
    const sidePanel = document.getElementById('sidePanel');
    const map = document.getElementById('map');
    const openBtn = document.getElementById('openBtn');

    if (sidePanel.style.width === '20%') {
        // Close side panel
        sidePanel.style.width = '0';
        map.style.marginLeft = '0';
        openBtn.innerHTML = '☰';
    } else {
        // Open side panel
        sidePanel.style.width = '20%';
        map.style.marginLeft = '20%';
        openBtn.innerHTML = '☰';
    }
}

// Function to update the legend based on the active layers
function updateLegend() {
    document.getElementById('legend').style.display = "block";

    // Create a Map to store layer names and their corresponding colors
    const legendMap = new Map();

    // Build the legend map
    activeLayers.forEach(layer => {
        const layerName = Object.keys(layer)[0];
        const layerColor = layer[layerName];
        legendMap.set(layerName, layerColor);
    });

    // Build the legend content based on the legend map
    const legendContent = Array.from(legendMap.entries())
        .map(([layerName, layerColor]) => {
            return `<div class="legend-item" style="background-color: ${layerColor};"></div><span class="legend-text">${toTitleCase(layerName)}</span>`;
        })
        .join('<br><br>');

    document.getElementById('legend-content').innerHTML = legendContent;
}

// Function to toggle layers on and off
function toggleLayer(layerName, layerColor) {

    console.log(`Toggle layer init for => ${layerName} : ${layerColor}`);

    const index = activeLayers.findIndex(layer => Object.keys(layer)[0] === layer[layerName]);

    if (index !== -1) {
        // Layer is active, remove it
        activeLayers.splice(index, 1);
    } else {
        // Layer is inactive, add it with the provided color
        const newLayer = { [layerName]: layerColor };
        activeLayers.push(newLayer);
    }

    // Update the legend based on the current active layers
    updateLegend();
}

function loadDatasets(datasets) {
    datasets.forEach(dataset => {
        if (map.getSource(`${dataset}`)) {
            // Dataset is already loaded, remove the layer and source
            map.removeLayer(`layer-${dataset}`);
            map.removeSource(`${dataset}`);
        } else {

            let randomColor = getRandomColor();
            toggleLayer(dataset, randomColor);

            // Fetch geospatial data from the server based on the selected dataset
            fetch(`/fetch/${dataset}`)
                .then(response => response.json())
                .then(data => {

                    // Add event listener for filter dialog
                    document.getElementById(`filterDialog${dataset}`).addEventListener('click', function () {
                        // Extract field names from the 'properties' object of the first feature
                        const properties = data.features[0].properties;
                        const fields = Object.keys(properties);

                        // Build and display the filter modal with dropdowns
                        buildFilterModal(dataset, fields);
                    });

                    // Add a GeoJSON source with the fetched data
                    map.addSource(`${dataset}`, {
                        type: 'geojson',
                        data: data
                    });

                    // Determine the geometry type (Point or Polygon)
                    const geometryType = data.features[0].geometry.type;

                    // Add a layer to the map based on the geometry type
                    if (geometryType === 'Point') {
                        // For Point geometries
                        map.addLayer({
                            id: `layer-${dataset}`,
                            type: 'circle',
                            source: `${dataset}`,
                            paint: {
                                'circle-radius': 8,
                                'circle-color': randomColor,
                                "circle-stroke-width": 2, // Adjust the thickness of the circle border
                                "circle-stroke-color": "#ffffff" // Replace with your desired border color
                            }
                        });

                        if(!firstPointLayerId) {
                            firstPointLayerId = `layer-${dataset}`;
                            console.log(`firstPointLayerId => ${firstPointLayerId}`);
                        }
                    } else if (geometryType === 'Polygon') {
                        // For Polygon geometries

                        map.addLayer({
                            id: `layer-${dataset}`,
                            type: 'fill',
                            source: `${dataset}`,
                            paint: {
                                'fill-color': randomColor,
                                'fill-opacity': 0.7,
                                'fill-outline-color': '#ffffff'
                            }
                        });

                        if (firstPointLayerId !== undefined) {
                            console.log(`firstPointLayerId => ${firstPointLayerId} | layer-${dataset}`);
                            map.moveLayer(`layer-${dataset}`, firstPointLayerId);
                        }
                    }

                    // Get the bounds of the loaded data
                    const bounds = new mapboxgl.LngLatBounds();
                    data.features.forEach(feature => {
                        const geometry = feature.geometry;
                        if (geometry.type === 'Point') {
                            bounds.extend(geometry.coordinates);
                        } else if (geometry.type === 'Polygon') {
                            geometry.coordinates.forEach(polygon => {
                                polygon.forEach(coordinate => {
                                    bounds.extend(coordinate);
                                });
                            });
                        }
                    });

                    // Fit the map to the bounds with some padding
                    // Check if there are features before calling fitBounds
                    fitMapToBounds(map, bounds);
                })
                .catch(error => console.error('Error fetching geospatial data:', error));
        }
    });

    // Add click event listener to open popups
    map.on('click', (e) => {
        const features = map.queryRenderedFeatures(e.point);

        if (features.length > 0) {
            const feature = features[0];
            console.log(`feature => ${JSON.stringify(feature)}`);
            const geometryType = feature.geometry.type;
            let coordinates;

            if (geometryType === 'Point') {
                coordinates = feature.geometry.coordinates.slice();
            } else if (geometryType === 'Polygon' || geometryType === 'MultiPolygon') {
                // Calculate the centroid of the polygon
                const polygonCoordinates = feature.geometry.coordinates[0]; // Assuming the first set of coordinates is the exterior ring
                const centroid = calculatePolygonCentroid(polygonCoordinates);
                coordinates = centroid;
            }

            // Remove unwanted properties from feature.properties
            delete feature.properties['WKT'];  // Remove 'wkt' property
            delete feature.properties['latitude'];  // Remove 'latitude' property
            delete feature.properties['longitude'];  // Remove 'longitude' property
            const popupContent = generatePopupContent(feature.properties, geometryType);

            // Create a popup at the clicked location
            console.log(`coordinates => ${coordinates}`);
            if (!isNaN(coordinates[0]) && !isNaN(coordinates[1])) {
                new mapboxgl.Popup({ closeButton: false })
                    .setLngLat(coordinates)
                    .setHTML(popupContent)
                    .addTo(map);
            }
        }
    });

    // Function to calculate the centroid of a polygon
    function calculatePolygonCentroid(polygonCoordinates) {
        const totalPoints = polygonCoordinates.length;
        let x = 0;
        let y = 0;

        polygonCoordinates.forEach(coord => {
            x += coord[0];
            y += coord[1];
        });

        return [x / totalPoints, y / totalPoints];
    }

}

function getRandomColor() {
    const availableColors = [
        '#1f78b4', '#33a02c', '#e31a1c', '#ff7f00', '#6a3d9a',
        '#a6cee3', '#b2df8a', '#fb9a99', '#fdbf6f', '#cab2d6',
        '#01665e', '#d73027', '#4575b4', '#91bfdb', '#313695',
        '#fee08b', '#d73027', '#4575b4', '#91bfdb', '#313695'
    ];

    if (availableColors.length === 0) {
        console.warn('No available colors remaining. Returning fallback color.');
        return '#999999'; // Fallback color when all colors are used
    }

    // Randomly select and remove a color from the list
    const randomIndex = Math.floor(Math.random() * availableColors.length);
    const color = availableColors.splice(randomIndex, 1)[0];

    return color;
}

// Function to generate HTML content for popup based on feature properties
function generatePopupContent(properties) {
    let popupContent = '<div>';

    for (const key in properties) {
        if (properties.hasOwnProperty(key) && key !== 'geom' && key !== 'geojson') {
            popupContent += `<strong>${key}:</strong> ${properties[key]}<br>`;
        }
    }

    popupContent += '</div>';
    return popupContent;
}

document.querySelector('.close').addEventListener('click', function() {
    $('#myModal').modal('hide');
});


window.addEventListener('click', function(event) {
    if (event.target === document.getElementById('myModal')) {
        $('#myModal').modal('hide');
    }
});

function buildFilterModal(dataset, fields) {
    console.log(`building filteration div`);

    const modal = document.getElementById('myModal');
    modal.innerHTML = ''; // Clear existing content in the modal
    let selectedField;

    // Create a card-like feature
    const card = document.createElement('div');
    card.className = 'card';
    card.style.top = 'inherit';
    card.style.margin = '10%';
    card.style.left = '20%';
    card.style.width = '40%';

    // Add a heading to the card
    const cardHeader = document.createElement('div');
    cardHeader.className = 'card-header';
    // cardHeader.textContent = 'Filter';
    cardHeader.innerHTML = 'Filter<span class="close" onclick="closeFilterModal()">&times;</span>';
    card.appendChild(cardHeader);

    // Function to close the modal
    window.closeFilterModal = function () {
        $('#myModal').modal('hide');
    };

    // Remove specific values from the fields array
    const valuesToRemove = ['geom', 'latitude', 'longitude', 'geojson', 'WKT']; // Add the values you want to remove
    fields = fields.filter(field => !valuesToRemove.includes(field));

    // Update the fields array with a default "Select" option
    fields.unshift('Select Field');

    // Create and append the first dropdown for field names
    const fieldDropdown = createDropdown('fieldDropdown', fields);
    card.appendChild(fieldDropdown);

    // Create and append the second dropdown for values
    const valueDropdown = createDropdown('valueDropdown');
    card.appendChild(valueDropdown);

    // Append the card to the modal body
    modal.appendChild(card);

    // Show the modal using Bootstrap JavaScript
    $('#myModal').modal('show');

    // Add an event listener to the fieldDropdown to populate the valueDropdown
    fieldDropdown.addEventListener('change', function () {
        selectedField = fieldDropdown.value;
        // Fetch dataset values for the selected field from the server
        fetch(`/aggregation/${dataset}/${selectedField}`)
            .then(response => response.json())
            .then(values => {
                populateValueDropdown(values);
            })
            .catch(error => console.error('Error fetching dataset values:', error));
    });

    // Add an event listener to the valueDropdown to close the modal on selection
    valueDropdown.addEventListener('change', function () {
        const selectedValue = valueDropdown.value;

        let randomColor = getRandomColor();
        toggleLayer(dataset, randomColor);

        // Fetch data based on the selected value from the server
        fetch(`/filter/${dataset}/${selectedField}/${selectedValue}`)
            .then(response => response.json())
            .then(data => {
                // Remove the existing layer with markers
                map.removeLayer(`layer-${dataset}`);
                map.removeSource(`${dataset}`);

                // Add a new GeoJSON source with the fetched data
                map.addSource(`${dataset}`, {
                    type: 'geojson',
                    data: data
                });

                // Determine the geometry type (Point or Polygon)
                const geometryType = data.features[0].geometry.type;

                // Add a new layer to the map based on the geometry type
                if (geometryType === 'Point') {
                    // For Point geometries
                    map.addLayer({
                        id: `layer-${dataset}`,
                        type: 'circle',
                        source: `${dataset}`,
                        paint: {
                            'circle-radius': 8,
                            'circle-color': randomColor,
                            "circle-stroke-width": 2, // Adjust the thickness of the circle border
                            "circle-stroke-color": "#ffffff" // Replace with your desired border color
                        }
                    });

                    if(!firstPointLayerId) {
                        firstPointLayerId = `layer-${dataset}`;
                        console.log(`firstPointLayerId => ${firstPointLayerId}`);
                    }
                } else if (geometryType === 'Polygon') {
                    // For Polygon geometries
                    map.addLayer({
                        id: `layer-${dataset}`,
                        type: 'fill',
                        source: `${dataset}`,
                        paint: {
                            'fill-color': randomColor,
                            'fill-opacity': 0.7,
                            'fill-outline-color': '#ffffff'
                        }
                    });

                    if (firstPointLayerId !== undefined) {
                        console.log(`firstPointLayerId => ${firstPointLayerId} | layer-${dataset}`);
                        map.moveLayer(`layer-${dataset}`, firstPointLayerId);
                    }
                }

                // Get the bounds of the loaded data
                const bounds = new mapboxgl.LngLatBounds();
                data.features.forEach(feature => {
                    const geometry = feature.geometry;
                    if (geometry.type === 'Point') {
                        bounds.extend(geometry.coordinates);
                    } else if (geometry.type === 'Polygon') {
                        geometry.coordinates.forEach(polygon => {
                            polygon.forEach(coordinate => {
                                bounds.extend(coordinate);
                            });
                        });
                    }
                });

                // Fit the map to the bounds with some padding
                // Check if there are features before calling fitBounds
                fitMapToBounds(map, bounds);

                // Close the modal upon selecting a value
                $('#myModal').modal('hide');
                toggleSidePanel();
            })
            .catch(error => console.error('Error fetching geospatial data:', error));
    });

    // Function to create a dropdown
    function createDropdown(id, options = []) {
        const dropdown = document.createElement('select');
        dropdown.id = id;
        dropdown.className = 'form-control'; // Bootstrap class for styling

        options.forEach(optionText => {
            const option = document.createElement('option');
            option.value = optionText;
            option.text = optionText;
            dropdown.appendChild(option);
        });

        return dropdown;
    }
}


// Function to populate the valueDropdown with a default "Select" option
function populateValueDropdown(values) {
    const valueDropdown = document.getElementById('valueDropdown');
    
    // Clear existing options
    valueDropdown.innerHTML = '';

    // Create and append a default "Select" option
    const defaultOption = document.createElement('option');
    defaultOption.value = ''; // Set an empty value for the default option
    defaultOption.text = 'Select';
    valueDropdown.appendChild(defaultOption);
    
    // Create and append options for each value
    values.forEach(value => {
        const option = document.createElement('option');
        option.value = value;
        option.text = value;
        valueDropdown.appendChild(option);
    });
}

function fitMapToBounds(map, bounds) {
    // Check if the bounds are valid
    if (
        isFinite(bounds.getSouthWest().lng) &&
        isFinite(bounds.getSouthWest().lat) &&
        isFinite(bounds.getNorthEast().lng) &&
        isFinite(bounds.getNorthEast().lat)
    ) {
        // Fit the map to the bounds with some padding
        map.fitBounds(bounds, { padding: 100 });
    } else {
        // Handle the case where bounds are not valid (e.g., no features)
        console.error('Invalid bounds');
    }
}

function toTitleCase(str) {
    return str.replace(/\w\S*/g, function (txt) {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
}