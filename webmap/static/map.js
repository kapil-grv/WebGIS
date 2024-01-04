var map = L.map('map').setView([0, 0], 2);
var currentMarkers;
var originalMarkers; // Variable to store the original data
var drawnCircles = [];
var drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

// Use Mapbox tiles as the basemap
L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
    attribution: '© Mapbox',
    maxZoom: 18,
    id: 'streets-v12',
    accessToken: 'pk.eyJ1IjoibWlrZS11c2VyIiwiYSI6ImNsYjBkNWQ3OTFnOGYzeHFtNGs3MGcyZHYifQ.1Vqi8jnAO6iMTPi9EPXkWA'
}).addTo(map);

var drawControl = new L.Control.Draw({
    draw: {
        polyline: false,
        polygon: false,
        circle: true,
        marker: false,
        rectangle: false,
        circlemarker: false
    },
    edit: {
        featureGroup: drawnItems
    }
});

map.addControl(drawControl);

map.on('draw:created', function (e) {
    var type = e.layerType;
    var layer = e.layer;

    drawnItems.addLayer(layer);

    if (type === 'circle') {
        console.log("New circle created");
        handleCircle(layer);
    }
});

map.on('draw:edited', function (e) {
    var layers = e.layers;
    layers.eachLayer(function (layer) {
        if (layer instanceof L.Circle) {
            handleCircle(layer);
        }
    });
});

map.on('draw:deleted', function (e) {
    var deletedLayers = e.layers;
    deletedLayers.eachLayer(function (layer) {
        // Remove the deleted circle from drawnCircles array
        var index = drawnCircles.indexOf(layer);
        if (index !== -1) {
            drawnCircles.splice(index, 1);
        }
    });

    // Update currentMarkers after removing the deleted circles
    currentMarkers = filterMarkersByCircles(originalMarkers, drawnCircles);
});

function handleCircle(circle) {
    drawnCircles.push(circle);

    // Assuming you have a variable 'map' that refers to your Leaflet map
    var allCurrentMarkers = L.layerGroup();

    map.eachLayer(function (layer) {
        // Check if the layer is a marker
        console.log(layer);
        if (layer instanceof L.CircleMarker) {
            allCurrentMarkers.addLayer(layer);
        }
    });

    if (allCurrentMarkers.getLayers().length > 0) {
        console.log("Plotting currentMarkers inside the circle => " + allCurrentMarkers.getLayers().length);
        currentMarkers = filterMarkersByCircles(allCurrentMarkers, drawnCircles);
    } else {
        console.log("Plotting originalMarkers inside the circle");
        currentMarkers = filterMarkersByCircles(originalMarkers, drawnCircles);
    }
}

function filterMarkersByCircles(markers, circles) {
    if (!markers) {
        return null;
    }

    // Clear only marker layers from the map
    markers.eachLayer(function (marker) {
        map.removeLayer(marker);
    });

    var filteredMarkers = markers.getLayers().filter(function (marker) {
        return circles.every(function (circle) {
            var markerLatLng = marker.getLatLng();
            var distance = markerLatLng.distanceTo(circle.getLatLng());
            return distance <= circle.getRadius();
        });
    });

    var newMarkers = L.layerGroup(filteredMarkers);
    newMarkers.addTo(map);

    // Bring drawnItems to the back after adding a new layer
    drawnItems.eachLayer(function (drawnLayer) {
        drawnLayer.bringToBack();
    });

    return newMarkers;
}

var legend = L.control({position: 'bottomright'});

legend.onAdd = function (map) {
    var div = L.DomUtil.create('div', 'info legend'),
        conditions = ['Excellent', 'Good', 'Fair', 'Poor', 'Dead/Dying', 'Unknown'],
        labels = [];

    // Add a heading to the legend
    div.innerHTML = '<h4>Health Condition</h4>';

    for (var i = 0; i < conditions.length; i++) {
        div.innerHTML +=
            '<i style="background:' + getFillColor(conditions[i]) + '"></i> ' + conditions[i] + '<br>';
    }

    return div;
};

var speciesFilterDropdown = document.getElementById('speciesFilter');

speciesFilterDropdown.addEventListener('change', handleSpeciesFilter);

document.querySelector('input[type="file"]').addEventListener('change', handleFileSelect);

function handleFileSelect(event) {
    var fileInput = event.target;
    var file = fileInput.files[0];

    if (file) {
        if (currentMarkers) {
            map.removeLayer(currentMarkers);
        }

        var reader = new FileReader();
        reader.onload = function (e) {
            var csvData = e.target.result;
            plotMarkers(csvData);
            legend.addTo(map);
            speciesFilterDropdown.style.display = 'block';
        };

        reader.readAsText(file);
    }
}

function plotMarkers(csvData) {
    Papa.parse(csvData, {
        header: true,
        dynamicTyping: true,
        complete: function (results) {
            if (results.errors.length > 0) {
                console.error("CSV Parsing Errors:", results.errors);
                return;
            }

            var data = results.data;

            populateSpeciesFilterDropdown(data);

            var markers = L.layerGroup();

            data.forEach(function (row, index) {
                try {
                    var age = row['age'];
                    var commonName = row['common_name'];
                    var scientificName = row['scientific_name'];
                    var city = row['city'];
                    var state = row['state'];
                    var latitude = row['latitude_coordinate'];
                    var longitude = row['longitude_coordinate'];
                    var condition = row['condition'] || 'Unknown';
                    var noOfTreesPlanted = row['no_of_trees_planted'];

                    if (!latitude || !longitude) {
                        console.error("Row " + (index + 1) + " missing latitude or longitude:", row);
                        return;
                    }

                    latitude = parseFloat(latitude);
                    longitude = parseFloat(longitude);

                    if (isNaN(latitude) || isNaN(longitude)) {
                        console.error("Row " + (index + 1) + " has an invalid latitude or longitude:", row);
                        return;
                    }

                    var markerOptions = {
                        radius: 8,
                        fillColor: getFillColor(condition),
                        color: "#000",
                        weight: 1,
                        opacity: 1,
                        fillOpacity: 0.8
                    };

                    var marker = L.circleMarker([latitude, longitude], markerOptions)
                        .bindPopup("<b>Common Name:</b> " + commonName +
                            "<br><b>Scientific Name:</b> " + scientificName +
                            "<br><b>City:</b> " + city +
                            "<br><b>State:</b> " + state +
                            "<br><b>Condition:</b> " + condition +
                            "<br><b>No. of Trees Planted:</b> " + noOfTreesPlanted);

                    markers.addLayer(marker);
                } catch (error) {
                    console.error("Error processing Row " + (index + 1) + ":", error);
                }
            });

            markers.addTo(map);

            var bounds = calculateMarkerBounds(markers);
            if (bounds.isValid()) {
                map.fitBounds(bounds);
            }

            currentMarkers = markers;
            originalMarkers = markers; // Store the original markers
        }
    });
}

function calculateMarkerBounds(markers) {
    var bounds = L.latLngBounds();

    markers.eachLayer(function (marker) {
        bounds.extend(marker.getLatLng());
    });

    return bounds;
}

function getFillColor(condition) {
    switch (condition.toLowerCase()) {
        case 'dead/dying':
            return 'black';
        case 'excellent':
            return 'green';
        case 'fair':
            return 'yellow';
        case 'good':
            return 'lightgreen';
        case 'poor':
            return 'red';
        default:
            return 'gray';
    }
}

function populateSpeciesFilterDropdown(data) {
    var speciesSet = new Set();
    data.forEach(function (row) {
        var species = row['scientific_name'];
        if (species) {
            speciesSet.add(species);
        }
    });

    var speciesArray = Array.from(speciesSet);
    speciesArray.sort();

    var defaultOption = document.createElement('option');
    defaultOption.value = 'All Species';
    defaultOption.text = 'All Species';
    speciesFilterDropdown.appendChild(defaultOption);

    speciesArray.forEach(function (species) {
        var option = document.createElement('option');
        option.value = species;
        option.text = species;
        speciesFilterDropdown.appendChild(option);
    });
}

function handleSpeciesFilter() {
    var selectedSpecies = speciesFilterDropdown.value;
    var matchCount = 0;
    console.log("selectedSpecies => " + selectedSpecies);

    if (!originalMarkers) {
        console.log("No originalMarkers available");
        return;
    }

    // Filter markers based on selected species
    console.log("Number of originalMarkers: " + originalMarkers.getLayers().length);
    originalMarkers.eachLayer(function (marker) {
        var popupContent = marker.getPopup().getContent();
        var scientificNameMatch = popupContent.match(/<b>Scientific Name:<\/b>\s*([^<]+?)\s*(?:<br>|$)/i);
        if (scientificNameMatch) {
            var scientificName = scientificNameMatch[1].trim();
            console.log(scientificName+"|"+selectedSpecies);
            if (scientificName !== selectedSpecies) {
                if (selectedSpecies === 'All Species') {
                    originalMarkers.eachLayer(function (marker1) {
                        map.addLayer(marker1);
                        matchCount = matchCount+1;
                    });
                } else {
                    // If species is selected and marker doesn't match, hide it
                    // console.log("removing marker from map and currentMarkers because of filtration");
                    map.removeLayer(marker);
                }
            } else {
                // If species is selected and marker matches, add it to the map
                // console.log("adding markers because of filtration");
                map.addLayer(marker);
                matchCount = matchCount+1;
            }
        }
    });

    // Check if there are any circles drawn
    console.log("drawnCircles => " + drawnCircles);
    if (drawnCircles && drawnCircles.length > 0) {
        console.log("Circles drawn");
        // Filter markers based on circles

        // Assuming you have a variable 'map' that refers to your Leaflet map
        var allCurrentMarkers = L.layerGroup();

        map.eachLayer(function (layer) {
            // Check if the layer is a marker
            console.log(layer);
            if (layer instanceof L.CircleMarker) {
                allCurrentMarkers.addLayer(layer);
            }
        });

        allCurrentMarkers.eachLayer(function (marker) {
            if (!isMarkerInsideCircles(marker, drawnCircles)) {
                map.removeLayer(marker);
                matchCount = matchCount-1;
            }
        });
        
        console.log("matchCount => " + matchCount);
        if (!matchCount > 0) {
            alert("Selected tree plantation not found in this area: " + selectedSpecies);
        } else {
            alert("No. of tree plantations found in this area that belong to: " + selectedSpecies + " are - " + matchCount);
        }
    }
}

function isMarkerInsideCircles(marker, circles) {
    return circles.some(function (circle) {
        var markerLatLng = marker.getLatLng();
        var distance = markerLatLng.distanceTo(circle.getLatLng());
        return distance <= circle.getRadius();
    });
}