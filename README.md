# Geospatial Web Applications

This repository contains multiple web applications for visualizing and managing geospatial data, including tree plantation data, geospatial queries, and GeoJSON editing. The applications leverage various technologies such as Express, DuckDB, Mapbox, React, Deck.gl, and nebula.gl for an interactive and responsive user experience.

## Applications in This Repository

### 1. **Web Map - Load and Filter**
This application enables users to visualize tree plantation data on a map and apply filters based on species type. It supports uploading CSV files with information about tree locations, species, and conditions.

- **Features:**
  - Upload CSV files containing tree data.
  - Filter tree data based on species.
  - Draw circles on the map for specific areas.
  
- **Technologies:**
  - HTML, CSS, JavaScript (for front-end)
  - Mapbox (for map rendering)
  - Python and Flask (for back-end)

### 2. **Geospatial Web Application with Express, DuckDB, and Mapbox**
This web application allows users to visualize and interact with geospatial data, storing information in a DuckDB database and utilizing Mapbox for mapping.

- **Features:**
  - Visualize geospatial datasets on an interactive map.
  - Query and filter data stored in DuckDB.
  - View different layers of geospatial data.
  
- **Technologies:**
  - Express.js (for server-side API)
  - DuckDB (for database management)
  - Mapbox (for mapping and visualization)

### 3. **GeoJSON Editor**
The **GeoJSON Editor** is a React-based web application for viewing and editing GeoJSON files interactively. The app integrates `Deck.gl` for rendering layers and `nebula.gl` for GeoJSON editing capabilities, with `react-map-gl` and Mapbox for mapping functionality.

- **Features:**
  - Upload and edit GeoJSON files.
  - Interact with layers on the map using Deck.gl.
  - Edit GeoJSON features using nebula.gl's interactive tools.
  
- **Technologies:**
  - React (for front-end)
  - Deck.gl (for rendering layers)
  - nebula.gl (for GeoJSON editing)
  - Mapbox (for map visualization)

---