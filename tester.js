const axios = require('axios');
require('dotenv').config({ path: 'variables.env' });

const wwoApiKey = process.env.WEATHER_API;
const date = '12-03-2000';
const city = 'Moscow';
/*console.log(require('qs').stringify({
    format: 'json',
        num_of_days: 1,
    q: encodeURIComponent('cit'),
    key: 'key',
    date: '10-01-0000'
}));*/
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

axios.get('http://api.worldweatheronline.com/premium/v1/weather.ashx/', weatherRequestOptions)
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
    })
    .catch(rej => rej);
