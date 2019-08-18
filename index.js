require('dotenv').config({ path: 'variables.env' });

const weatherAPIEndpoint = 'http://api.worldweatheronline.com/premium/v1/weather.ashx/';
const wwoApiKey = process.env.WEATHER_API;
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const { WebhookClient, Card, Suggestion} = require('dialogflow-fulfillment');
const axios = require('axios');
const Qs = require('qs');
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const processMessage = (request, respose) => {
    const agent = new WebhookClient({ request, respose });
    console.log('Dialogflow Request Received!');

    function welcome(agent) {
        agent.add(`Hey, welcome to Fosteman's Weather Teller !`);
        agent.add(new Suggestion(`Ask me what's the forecast for tomorrow !`));
    }

    function weather(agent) {
        return new Promise((resolve, reject) => {
            // Get target city and date
            let city = request.body.queryResult.parameters['geo-city']; // a required parameter
            let date = request.body.queryResult.parameters['date'];
            console.log('Fetching weather forecast...');


        });
    }

    let intentMap = new Map();
    intentMap.set('Default welcome intent', welcome); //fix the label
    intentMap.set('weather', weather);
    agent.handleRequest(intentMap);
};

app.post('/', (req, res) => {
    processMessage(req, res);
});
//TODO serve static file
app.get('/',
    (req, res) => res.send(
        '' +
        '<!DOCTYPE html>\n' +
        '<html lang="en">\n' +
        '<head>\n' +
        '<meta charset="utf-8">\n' +
        '<title></title>\n' +
        '</head>\n' +
        '<body>\n' +
        '<iframe width="100%" height="340px" src="https://bot.dialogflow.com/e6d3e274-3ca2-41a4-8154-950ed6c785a9"></iframe>' +
        '</body>\n' +
        '</html>\n'
    )
);

app.set('port', process.env.PORT || 8080);
// service endpoint
const server = app.listen(app.set('port'), () => {
    console.log(`Webhook is running → ${server.address()}:${server.address().port}`);
});

function requestWeatherForecast(city, date) {
    const weatherRequestOptions = {
        method: 'get',
        params: {
            format: 'json',
            num_of_days: 1,
            q: encodeURIComponent(city),
            key: wwoApiKey,
            date
        },
        timeout: 4500, //5s is Dialogflow's restriction
        responseType: 'json'
    };
    const forecast = (location, time, cloud_cover, temp_C, wind, description) => {
        return {
            location,
            time,
            cloud_cover,
            temp_C,
            wind,
            description
        }
    };
    const weatherReport = ({
                               location,
                               time,
                               cloud_cover,
                               temp_C,
                               wind,
                               description
                           }) =>
        `Conditions in the ${location} at ${time}
        are ${temp_C} degrees, wind speed is ${wind} kmph,
        while cloud coverage is ${cloud_cover},
        overall ${description}
        `;

    let FinalWeatherReport = ''; //I wonder if I could return a string right from axios pipe..

    return new Promise((resolve, reject) => {
        axios.get(weatherAPIEndpoint, weatherRequestOptions)
            .then(res => res.data.data)
            .then(data => {
                // generate forecast
                let instance = forecast(
                    data.request[0].query, //location
                    data.current_condition[0].observation_time, //time
                    data.current_condition[0].cloudcover, //cloud coverage
                    data.current_condition[0].temp_C, // measured temperature
                    data.current_condition[0].windspeedKmph, //wind
                    data.current_condition[0].weatherDesc[0].value //description
                );
                FinalWeatherReport = weatherReport(instance);
                console.log('Final weather report: ', FinalWeatherReport);
                agent.add(FinalWeatherReport);
                return resolve();
            })
            .catch(rej => resolve(rej));
    });

}
