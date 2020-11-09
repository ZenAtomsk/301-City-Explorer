'use strict';

// dotenv pulls in any environment variables (process.env) that live in a .env file
// as part of this project
require('dotenv').config();

// requires "pulling in" from 3rd party dependencies we want to use
// npm === 3rd party
const express = require('express');
const cors = require('cors');

//setup constants (for server file)
const app = express();
const PORT = process.env.PORT || 3000;

//open  our API for public access
app.use(cors());

app.get('/', (req, res) => {
 res.send('Homepage')
})

app.get('/location', handleLocation);

//name route handler vs. unnamed (anonymous) callback functions
function handleLocation(req, res){
  try {

    let geoData = require('./data/location.json');
    //extra info in the form of a querystring (key/val pair)
    let city = req.query.city;

    //create an object that only contains location data we care about - this should
    //be an instance of the type of data we are looking for
    let locationData = new Location(city, geoData);
    res.send(locationData);
  } catch (error) {
    console.log(error);
  }
}

function Location(city, geoData) {
  this.search_query = city;
  this.formatted_query = geoData[0].display_name;
  this.latitude = geoData[0].let;
  this.longitude = geoData[0].lon;
}

app.listen(PORT, () => {
  console.log(`server up: ${PORT}`);
});
