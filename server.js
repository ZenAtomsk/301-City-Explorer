'use strict';

// dotenv pulls in any environment variables (process.env) that live in a .env file
// as part of this project


// requires "pulling in" from 3rd party dependencies we want to use
// npm === 3rd party
const express = require('express');
const pg = require('pg'); //connector and set of tools between our server and DB
const cors = require('cors');
const dotenv = require('dotenv');
const superagent = require('superagent');
// const { response } = require('express');



dotenv.config();

//setup constants (for server file)
const app = express();
const PORT = process.env.PORT || 3000;
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
const GEOCODE_API_KEY = process.env.GEOCODE_API_KEY;
// const HIKINGPROJECT_API_KEY = process.env.HIKINGPROJECT_API_KEY;

const client = new pg.Client(process.env.DATABASE_URL);

//open  our API for public access
app.use(cors());

app.get('/', (req, res) => {
  res.send('Homepage, welcome to it!');
});


///////location

app.get('/location', handleLocation);

function GeoCity(city, geoData) {
  this.search_query = city;
  this.formatted_query = geoData.display_name;
  this.latitude = geoData.lat;
  this.longitude = geoData.lon;
}

function handleLocation(req, res) {

  let city = req.query.city;
  let url = `https://us1.locationiq.com/v1/search.php?key=${GEOCODE_API_KEY}&q=${city}&format=json&limit=1`;
  const SQL = `SELECT * FROM locations WHERE search_query='${city}';`;

  client.query(SQL)
    .then (data => {
      // console.log(data);
      //check if rows have been returned
      if(data.rowCount) {
        console.log('rowCount:', data.rowCount);
        res.json(data.rows[0]);
      } else {
        try {
          superagent.get(url)
            .then(data2 => {
              const geoData = data2.body[0];
              const locationInfo = new GeoCity(city, geoData);

              //cache it up
              const SQL2 = 'INSERT INTO locations (search_query, formatted_query, latitude, longitude) VALUES ($1, $2, $3, $4) RETURNING *;';
              const geoDataArray = [locationInfo.search_query, locationInfo.formatted_query, locationInfo.latitude, locationInfo.longitude];

              client.query(SQL2, geoDataArray)
                .then(() => {
                  console.log('hopefully rows', locationInfo);
                  res.send(locationInfo);
                })
                .catch(err => {
                  res.status(500).send(err);
                });
            });
        } catch(error){
          res.status(500).send(new ErrorMsg(500));
        }
      }
    });
}


//////////////weather

app.get('/weather', handleWeather);

function Weather(weatherData) {
  this.forecast = weatherData.weather.description;
  this.time = weatherData.valid_date;
}

function handleWeather(req, res) {
  try{
    let city = req.query.search_query;
    let url = `https://api.weatherbit.io/v2.0/forecast/daily?city=${city}&days=8&key=${WEATHER_API_KEY}`;

    superagent.get(url)
      .then(data => {
        console.log('this is data:', data);
        let results = data.body;
        let weatherData = results.data.map(date => new Weather(date));
        res.send(weatherData);
      });
  } catch(error) {
    res.status(500).send(new ErrorMsg(500));
  }
}

/////////////trails

app.get('/trails', handleTrails);

function Trails(trailData) {
  this.name = trailData.name;
  this.location = trailData.location;
  this.length = trailData.length;
  this.stars = trailData.stars;
  this.star_votes = trailData.star_votes;
  this.summary = trailData.summary
  this.trail_url = trailData.trail_url;
  this.conditions = trailData.conditions;
  this.condition_date = trailData.condition_date;
  this.condition_time = trailData.condition_time;
}

function handleTrails(req, res){
  try{
    let city = req.query.search_query;
    let lat = req.query.latitude;
    let lon = req.query.longitude;
    let url = `https://www.hikingproject.com/data/get-trails?lat=${lat}&lon=${lon}&key`;
    
    superagent.get(url)
      .then(data => {
        let trailData = data.body.trails.map(data2 => new Trail(data2)); 
      })
      res.send(trailData);
  })
  
}


//////////catch all

app.get('*', (req, res) => {
  // res.status(404).send('Sorry, not found!');
  res.status(500).send(new ErrorMsg(500));
  // res.send(new ErrorMsg());
});

function ErrorMsg(status){
  this.status = status;
  this.responseText = 'Sorry, something went wrong';
}

client.connect()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`server up: ${PORT}`);
    });
  })
  .catch(err => {
    console.error(err);
  });
