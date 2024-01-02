// Fetch Mapbox access token from the server
fetch('/mapbox-token')
  .then(response => response.json())
  .then(data => {
    // Initialize Mapbox GL map with the retrieved access token
    mapboxgl.accessToken = data.token;

    const map = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/mapbox/streets-v11', // Replace with your desired Mapbox style
      center: [-74.5, 40], // Initial map center (longitude, latitude)
      zoom: 9 // Initial zoom level
    });

    // Add markers or other geospatial data to the map as needed
    // You can use Mapbox GL JS API for various map manipulations

    // Sample data insertion
    fetch('/insert', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        latitude: 40.7128,
        longitude: -74.0060,
        data: 'Sample Data',
      }),
    })
    .then(response => response.json())
    .then(data => console.log(data))
    .catch(error => console.error('Error inserting data:', error));

    // Sample data retrieval
    fetch('/fetch')
      .then(response => response.json())
      .then(data => console.log('Fetched Data:', data))
      .catch(error => console.error('Error fetching data:', error));
  })
  .catch(error => console.error('Error fetching Mapbox access token:', error));
