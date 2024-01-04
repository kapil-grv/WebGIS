# Tree Plantation Map

## Overview

Tree Plantation Map is a web application for visualizing and managing geospatial data related to tree plantations. It allows users to upload CSV files containing information about tree locations, species, and conditions. The map provides features for filtering data based on species type and drawing circles.

## Installation

To run the project locally, you'll need to install the following Python packages:

```bash
pip install Flask Flask-WTF pandas
```

## Usage
Before launching the service, set the following environment variables:

```bash
export FLASK_APP=app.py
export FLASK_ENV=development
```

Now, you can run the program using the following command:

```bash
flask run
```

This will start the development server, and you can access the application in your web browser at http://localhost:5000.

## Features
* Upload CSV:
The application supports uploading CSV files containing tree data in the format below. Sample file available inside the static folder named `trees.csv`:

```csv
age,common_name,scientific_name,city,state,longitude_coordinate,latitude_coordinate,condition,no_of_trees_planted
73,Lombardy poplar grove,Populus nigra,Seattle,Washington,-122.3132833,47.64175942,good,8
33,Snowdrift crabapple,Malus Mill.,Seattle,Washington,-122.2967577,47.59327234,fair,9
```

* Species Filtering:
Users can filter tree markers based on species using a dropdown menu.

* Map Interaction:
The map allows users to draw circles to filter markers within a specified radius.

* Legend:
A legend is provided to interpret the colors representing different conditions of the trees.

# Scribe documentation

Link - `https://scribehow.com/shared/Upload_visualize_and_filter_by_species__circle_in_a_Map__b9gGCEdLTsusF_L13j1knQ`