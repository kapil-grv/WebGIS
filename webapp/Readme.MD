## Geospatial Web Application with Express, DuckDB, and Mapbox

This web application enables users to visualize and interact with geospatial data using Express for the server, DuckDB for database operations, and Mapbox for mapping functionality.

# Features

- Dynamic Table Creation: Automatically generates tables in DuckDB based on CSV file headers, adding a 'geom' field for spatial data.

- Data Insertion: Inserts geospatial data from CSV files into DuckDB tables.

- Data Fetching: Retrieves geospatial data from DuckDB tables and transforms it into GeoJSON format.

- Data Filtering: Filters data based on specific field values.

- Aggregation: Performs aggregation queries to obtain all values of a specific field throughout the table.

- Map Visualization: Utilizes Mapbox to visualize geospatial data on an interactive map.

# Prerequisites
- Node.js
- DuckDB
- Mapbox Access Token (replace `YOUR_MAPBOX_ACCESS_TOKEN` in `public/app.js` with your token)

# Setup
Clone Repository:

```
git clone https://github.com/kapil-grv/WebGIS.git

cd webapp
```

# Install Dependencies:

```
npm install
```

# Run the Application:

```
node app.js
```

# Access the Application:
Open your browser and go to http://localhost:3000/map

# Usage

Insert Data:

* Place your CSV files with geospatial data in the static directory.
* Use the `/insert/:filename` route to insert data from a specific CSV file. 

Example:
```
curl -X POST http://localhost:3000/insert/yourfilename
```

# View Map:

* Access the map at http://localhost:3000/map.

# Filter Data:

* Use the `/filter/:tableName/:field/:fieldValue` route to filter data based on a specific field value. 

Example:

```
curl http://localhost:3000/filter/yourtable/yourfield/yourvalue
```

# Aggregate Data:

Use the `/aggregation/:tableName/:field` route to perform aggregation queries. 

Example:
```
curl http://localhost:3000/aggregation/yourtable/yourfield
```

# Important Notes
* Ensure that the Mapbox access token is properly configured in public/app.js.
* Avoid loading duplicate layers with the same filename. Rename files or load different data.