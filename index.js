'use strict';
const axios = require('axios');
const http = require('http');
const functions = require('firebase-functions');

const wwoApiKey = '<ENTER_WWO_API_KEY_HERE>';

exports.dialogflowFirebaseFulfillment = functions.https.onRequest((req, res) => {
    // Get the city
    let where = req.body.queryResult.parameters['geo-city']; // a required parameter
    // Get the date (if present)
    let when;
    if (req.body.queryResult.parameters['date'])
        when = req.body.queryResult.parameters['date'];

    // Invoke API
    requestWeatherForecast(where, when)
        .then(fulfillmentText =>
            res.json({ fulfillmentText }) // respond with the forecast text to Dialogflow
        )
        .catch(() =>
        res.json({ 'fulfillmentText': `Weather service is unavailable at the moment.` })
    );
});

const requestWeatherForecast = (city, date) => {
    return new Promise((resolve, reject) => {
        //  query
        let query = 'http://api.worldweatheronline.com/premium/v1/weather.ashx?format=json&num_of_days=1' +
            '&q=' + encodeURIComponent(city) + '&key=' + wwoApiKey + '&date=' + date;
        // log this one-liner to check spelling
        console.log('API Request: ' + host + path);

        // perform http get request
        axios.get(query)
            .then((res, rej) => {
            //API responds by opening a stream for data
            let body = '';
            res.on('data', chunk => { body += chunk; }); // store each response chunk
            res.on('end', () => {
                // categorize the data, following https://www.worldweatheronline.com/developer/api/docs/local-city-town-weather-api.aspx
                let response = JSON.parse(body);
                let forecast = response['data']['weather'][0];
                let location = response['data']['request'][0];
                let conditions = response['data']['current_condition'][0];
                let currentConditions = conditions['weatherDesc'][0]['value'];

                // compose human-readable response for dialogflow
                let output = `Current conditions in the ${location['type']} 
        ${location['query']} are ${currentConditions} with total sun hour  wind  of
        ${forecast['sunHour']} hours and a UV index of ${forecast['uvIndex']} on 
        ${forecast['date']}.`;

                console.log(output);
                resolve(output);
            });
            res.on('error', (error) => {
                console.log(`Error calling the weather API: ${error}`);
                reject();
            });
        });
    });
};
