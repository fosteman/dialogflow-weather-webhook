require('dotenv').config({ path: 'variables.env' });

const wwoApiKey = process.env.WEATHER_API;
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const {WebhookClient, Card, Suggestion} = require('dialogflow-fulfillment');
const axios = require('axios');

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const processMessage = (request, respose) => {
    const agent = new WebhookClient({ request, respose });
    console.log('Dialogflow Request body: ' + JSON.stringify(agent));
    function welcome(agent) {
        agent.add(`Hey, welcome to Fosteman's Weather Teller !`);
        agent.add(new Suggestion(`Ask me what's the forecast for tomorrow !`));
    }

    async function weather(agent) {
        // Get the city
        let where = request.body.queryResult.parameters['geo-city']; // a required parameter
        // Get the date (if present)
        let when;
        if (request.body.queryResult.parameters['date'])
            when = request.body.queryResult.parameters['date'];
        let output = await requestWeatherForecast(where, when);
        console.log('Weather intent output:', output);
        agent.add(output);
    }

    let intentMap = new Map();
    intentMap.set('Default welcome intent', welcome);
    intentMap.set('weather', weather);
    agent.handleRequest(intentMap);
};

app.post('/', (req, res) => {
    console.log('chat post log', req.body);
    processMessage(req, res);
});

app.set('port', process.env.PORT || 8080);
// service endpoint
const server = app.listen(app.set('port'), () => {
    console.log(`Express running → PORT ${server.address().port}`);
});

async function requestWeatherForecast(city, date) {
    return new Promise((resolve, reject) => {
        //  query
        let query = 'http://api.worldweatheronline.com/premium/v1/weather.ashx?format=json&num_of_days=1' +
            '&q=' + encodeURIComponent(city) + '&key=' + wwoApiKey + '&date=' + date;
        // log this one-liner to check spelling
        console.log('API Request: ' + query);

        // perform http get request
        axios.get(query)
            .then((res, rej) => {
                //API responds by opening a stream for data
                let body = '';
                res.on('data', chunk => {
                    body += chunk;
                }); // store each response chunk
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
}
