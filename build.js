'use strict';

const axios = require('axios');

const headers = {
  "x-rapidapi-key": process.env.API_KEY,
	"x-rapidapi-host": process.env.API_HOST,
	"useQueryString": true
}

const params = {
  "function": "TIME_SERIES_DAILY",
	"symbol": "MSFT",
	"outputsize": "compact",
	"datatype": "json"
}

function candlestick(timeseries) {

  // desired format
  // series: {
  //   x: timestamp,
  //   y: [open,high,low,close]
  // }

  let chartData = [];

  let promise = new Promise((resolve, reject) => {
    
      if (!timeseries) reject('No json object found!');   

      for (var key in timeseries){

        let open = timeseries[key]['1. open'];
        let high = timeseries[key]['2. high'];
        let low = timeseries[key]['3. low'];
        let close = timeseries[key]['4. close'];

        chartData = chartData.concat([{
          x: new Date(key),
          y: [open,high,low,close]
        }])
      }

      resolve(chartData);

  })

  return promise;

}

module.exports.build = async (event) => {

  let URI = process.env.STOCKS_API

  return axios.get(URI,{params: params, headers: headers})
    .then(response => {

      //response.data["Time Series (Daily)"] format
      //"date:{
      // "1. open": string,
      // "2. high": string,
      // "3. low": string,
      // "4. close": string,
      // "5. volume": string
      // }

      return candlestick(response.data["Time Series (Daily)"]).then((chartData) => {

        return {
          statusCode: 200,
          body: JSON.stringify(
            {
              chartData: chartData
            },
            null,
            2
          ),
        };

      })

    })
    .catch(error => {
      console.log(error);
    });

};
