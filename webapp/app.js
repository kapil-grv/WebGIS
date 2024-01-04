const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const duckdb = require('duckdb');
const fs = require('fs');
const csvParser = require('csv-parser');

const app = express();
const port = 3000;

let con; // Declare the DuckDB connection variable
const db = new duckdb.Database('duckdb.db');
con = db.connect();

let ingestedFiles = [];

// Load the spatial extension
con.exec('INSTALL spatial;', (err, result) => {
    if (err) {
      console.error('Error installing spatial extension:', err);
    } else {
      console.log('Spatial extension installed successfully');
    }
});
  
con.exec('LOAD spatial;', (err, result) => {
    if (err) {
      console.error('Error loading spatial extension:', err);
    } else {
      console.log('Spatial extension loaded successfully');
    }
});

// Serve static files (HTML, JS, CSS, etc.) from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));
// Serve static files from the "static" directory
app.use('/static', express.static(path.join(__dirname, 'static')));
app.use(bodyParser.json());

// Function to create table based on CSV headers
function createTable(headers, tableName) {
    // Check if 'latitude' and 'longitude' are present in headers
    let hasCoordinates = false;

    // Create columns array with 'latitude' and 'longitude'
    const columns = headers.map(header => {
        if (header.toLowerCase().includes('latitude') || header.toLowerCase().includes('longitude')) {
            // If header contains latitude and longitude, make it a DOUBLE column
            hasCoordinates = true;
            return `${header} DOUBLE`;
        } else if (header.toLowerCase().includes('wkt')) {
            hasCoordinates = true;
            return `${header} VARCHAR(255)`;
        } else {
            // Default to VARCHAR(255) for other columns
            return `${header} VARCHAR(255)`;
        }
    });

    // If 'latitude' and 'longitude' are present, add 'geom' as a POINT column
    if (hasCoordinates) {
        console.log("latitude and longitude present");
        columns.push('geom GEOMETRY');
    }

    const createTableQuery = `CREATE TABLE IF NOT EXISTS ${tableName} (${columns.join(', ')})`;
    console.log(`createTableQuery => ${createTableQuery}`);
    
    con.run(createTableQuery, (err, result) => {
      if (err) {
        console.error('Error creating dynamic_table:', err);
      } else {
        console.log('dynamic_table created or already exists');
      }
    });
}

// Sample route to serve the Mapbox access token to the frontend
app.get('/mapbox-token', (req, res) => {
    const mapboxToken = 'pk.eyJ1IjoibWlrZS11c2VyIiwiYSI6ImNsYjBkNWQ3OTFnOGYzeHFtNGs3MGcyZHYifQ.1Vqi8jnAO6iMTPi9EPXkWA'; // Replace with your Mapbox access token
    res.json({ token: mapboxToken });
});

// Sample route to insert geospatial data
app.post('/insert/:filename', (req, res) => {
    
    const filename = req.params.filename;

    if (!ingestedFiles.includes(filename)) {
        let csvFilePath = `static/${filename}.csv`;
        let result = true;
        let latitudeColumn;
        let longitudeColumn;
        let wktColumn;
        const csvData = [];

        fs.createReadStream(csvFilePath)
            .pipe(csvParser())
            .on('headers', (headers) => {
                // 'headers' event is emitted once with the array of header names
                console.log(`headers => ${headers}`);
                createTable(headers, filename);

                // Add 'geom' field to the headers array
                latitudeColumn = headers.find(header => header.toLowerCase().includes('latitude')) || 'latitude';
                longitudeColumn = headers.find(header => header.toLowerCase().includes('longitude')) || 'longitude';
                wktColumn = headers.find(header => header.toLowerCase().includes('wkt')) || null; // Added line for WKT column
            })
            .on('data', (row) => {
                // 'row' contains the data for each row in the CSV
                csvData.push(row);
            })
            .on('end', () => {
                // 'csvData' now contains an array of objects representing each row in the CSV

                // Insert each row into the dynamic_table
                for (const row of csvData) {
                    const columns = Object.keys(row);
                
                    let geomValue;

                    if (wktColumn && row[wktColumn]) {
                        // If WKT column exists and has a value, use ST_GeomFromText to create 'geom' field
                        geomValue = `ST_GeomFromText('${row[wktColumn]}')`;
                    } else {
                        // If no WKT column or value, create 'geom' field containing (longitude, latitude)
                        geomValue = `ST_Point(${parseFloat(row[longitudeColumn])}, ${parseFloat(row[latitudeColumn])})`;
                    }

                    console.log(`constructed geom => ${geomValue}`);
                    
                    // Add 'geom' field to the columns
                    columns.push('geom');
                
                    const values = columns.map(column => {
                        if (column === 'latitude' || column === 'longitude') {
                            return parseFloat(row[column]);
                        } else if (!isNaN(row[column]) && typeof row[column] === 'string') {
                            // If the value is a numeric string, parse it as a number
                            return parseFloat(row[column]);
                        } else {
                            // If the value is a string, enclose it in single quotes
                            return typeof row[column] === 'string' ? `'${row[column]}'` : row[column];
                        }
                    });

                    // Replace the corresponding positions with the 'geom' value
                    const geomIndex = columns.indexOf('geom');
                    values[geomIndex] = geomValue;
                
                    console.log(`filename => ${filename}`);
                    console.log(`values => ${values}`);
                    console.log(`insert command => {INSERT INTO ${filename} VALUES (${values.join(', ')})}`)
                
                    con.run(
                        `INSERT INTO ${filename} (${columns.join(', ')}) VALUES (${values.join(', ')})`,
                        (err, result) => {
                            if (err) {
                                console.error('Error inserting data:', err);
                            } else {
                                console.log('Data inserted successfully');
                            }
                        }
                    );
                }            
            });
        res.status(200).json({"Data inserted": result});
        ingestedFiles.push(filename);
    } else {
        res.status(405 ).json({"message": "Not allowed to load duplicate layers. Please rename the file or load different data."});
    }
});

// Sample route to fetch geospatial data based on a specific filename
app.get('/fetch/:filename', (req, res) => {
    const requestedFilename = req.params.filename;

    // Fetch all geospatial data from the DuckDB table
    con.all(`SELECT *, ST_AsGeoJSON(geom) AS geojson FROM ${requestedFilename}`, (err, results) => {
        if (err) {
            console.error('Error fetching data:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }

        // Transform result to GeoJSON format
        const geojson = {
            type: 'FeatureCollection',
            features: results.map(row => ({
                type: 'Feature',
                geometry: JSON.parse(row.geojson),
                properties: { ...row }
            }))
        };

        res.status(200).json(geojson);
    });
});

// Define the route to filter data based on field value
app.get('/filter/:tableName/:field/:fieldValue', (req, res) => {
    const { tableName, field, fieldValue } = req.params;

    // Perform the filter query
    const query = `SELECT *, ST_AsGeoJSON(geom) AS geojson FROM ${tableName} WHERE ${field} = '${fieldValue}'`;

    con.all(query, (err, results) => {
        if (err) {
            console.error('Error executing query:', err);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
        }

        // Transform result to GeoJSON format
        const geojson = {
            type: 'FeatureCollection',
            features: results.map(row => ({
                type: 'Feature',
                geometry: JSON.parse(row.geojson),
                properties: { ...row }
            }))
        };

        // Send the filtered results as JSON
        res.status(200).json(geojson);
    });
});

// Define the route to get all values (aggregation) of a specific field throughout the table
app.get('/aggregation/:tableName/:field', (req, res) => {
    const { tableName, field } = req.params;

    // Perform the aggregation query
    const query = `SELECT ${field}, COUNT(*) AS count FROM ${tableName} GROUP BY ${field}`;

    con.all(query, (err, result) => {
        if (err) {
            console.error('Error executing query:', err);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
        }

        // Transform result to GeoJSON format
        let response = result.map(row => row[`${field}`]);

        // Send the filtered results as JSON
        res.status(200).json(response);
    });
});


// Route to serve the HTML page with the Mapbox map
app.get('/map', (req, res) => {
    // Read the content of map.html
    const mapHtmlContent = fs.readFileSync(path.join(__dirname, 'public', 'map.html'), 'utf8');

    // Send the HTML content
    res.send(mapHtmlContent);
});

// Handle the request for favicon.ico
app.get('/favicon.ico', (req, res) => {
    res.status(204).end();
});

// Define a route to serve the image
app.get('/image/:imageName', (req, res) => {
    const imageName = req.params.imageName;
    const imagePath = path.join(__dirname, 'static', imageName);
  
    // Send the image in the response
    res.sendFile(imagePath);
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});