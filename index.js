require('dotenv').config({ path: 'variables.env' });

const moment = require('moment');
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

const processMessage = (request, response) => {
    const agent = new WebhookClient({ request, response });

    function weather(agent) {
        return requestWeatherForecast()
            .then(composedWeatherReport => {
                let simplifiedString = composedWeatherReport.replace(/\s+/g, ' ').trim();
                console.info("Here's what I fetched: ", simplifiedString);
                return agent.add(simplifiedString);
            })
            .catch();
    }

    function requestWeatherForecast() {
        let city = request.body.queryResult.parameters['geo-city']; // a required parameter
        let date = request.body.queryResult.parameters['date'];
        function weatherRequestOptions() {
            return {
                method: 'get',
                params: {
                    format: 'json',
                    num_of_days: 1,
                    q: encodeURIComponent(city),
                    key: wwoApiKey || "key's missing",
                    date: moment(date).format('YYYY-MM-DD')
                },
                timeout: 4500, //5s is Dialogflow's restriction
                responseType: 'json'
            };
        }
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
            `Conditions in ${location} at ${time}
        are ${temp_C} degrees, wind speed is ${wind} kmph,
        while cloud coverage is ${cloud_cover},
        overall ${description}
        `;

        return new Promise((resolve, reject) => {
            axios.get(weatherAPIEndpoint, weatherRequestOptions())
                .then(res => res.data.data)
                .then(data => {
                    // generate final weather report
                    return resolve(
                        weatherReport(
                            forecast(
                                data.request[0].query, //location
                                data.current_condition[0].observation_time, //time
                                data.current_condition[0].cloudcover, //cloud coverage
                                data.current_condition[0].temp_C, // measured temperature
                                data.current_condition[0].windspeedKmph, //wind
                                data.current_condition[0].weatherDesc[0].value //description
                    )));
                })
                .catch(rej => resolve(rej));
        });
    }

    let intentMap = new Map();
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
        '<iframe width="100%" height="800px" src="https://bot.dialogflow.com/e6d3e274-3ca2-41a4-8154-950ed6c785a9"></iframe>' +
        '</body>\n' +
        '</html>\n'
    )
);

app.set('port', process.env.PORT || 8080);
// service endpoint
const server = app.listen(app.set('port'), () => {
    console.log(`Webhook is running → ${server.address()}:${server.address().port}`);
});

