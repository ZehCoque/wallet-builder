'use strict';

const axios = require('axios');

const headers = {
  "x-rapidapi-key": process.env.API_KEY,
	"x-rapidapi-host": process.env.API_HOST,
	"useQueryString": true
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

function line(timeseries) {

  // desired format
  // series: {
  //   x: timestamp,
  //   y: [open,high,low,close]
  // }

  let chartData = [];

  let promise = new Promise((resolve, reject) => {
    
      if (!timeseries) reject('No json object found!');   

      for (var key in timeseries){

        let close = timeseries[key]['4. close'];

        chartData = chartData.concat([{
          x: new Date(key),
          y: close
        }])
      }

      resolve(chartData);

  })

  return promise;

}

function aggregate(allChartData, quantities){

  let promise = new Promise((resolve, reject) => {

    if (!allChartData) reject('allChartData missing!');
    if (!quantities) reject('quantities missing!');

    let aggr = [];

    for (var i = 0; i < allChartData[0].length; i++){
      let y = 0;
  
      for (var key = 0; key < allChartData.length; key++){
  
          y += Number(allChartData[key][i].y) * quantities[key];
        }
  
        aggr = aggr.concat([{
              x: allChartData[0][i].x,
              y: y
            }])
    }
    
  
  resolve(aggr);

  });

  return promise;

}

// function getChartData(URI, params){

//   let promise = new Promise((resolve, reject) => {
//     axios.get(URI,{params: params, headers: headers})
//     .then(response => {
  
//       //response.data["Time Series (Daily)"] format
//       //"date:{
//       // "1. open": string,
//       // "2. high": string,
//       // "3. low": string,
//       // "4. close": string,
//       // "5. volume": string
//       // }
  
//       line(response.data["Time Series (Daily)"]).then((chartData) => {
   
//         resolve(chartData);
  
//       })
//       .catch(error => {
//         console.log('candlestick function failed\n', error);
//         reject(error);
//       })
  
//     })
//     .catch(error => {
//       console.log('API GET failed\n', error);
//       reject(error);
//     });
//   });

//   return promise;

// }

// module.exports.getDataseries = async (event) => {

//   let URI = process.env.STOCKS_API

//   let tickers = ['VALE3.SA', 'TSLA34.SA', 'WEGE3.SA', 'IRDM11.SA'];
//   let quantities = [100, 50, 134, 243];

//   let promiseArray = [];

//   await tickers.forEach(ticker => {

//     const params = {
//       "function": "TIME_SERIES_DAILY",
//       "symbol": ticker,
//       "outputsize": "compact",
//       "datatype": "json"
//     }

//     promiseArray.push(getChartData(URI, params));

//   }) 

//   return Promise.all(promiseArray).then((allChartData) => {

//     return aggregate(allChartData, quantities).then((results) => {
//       return {
//         statusCode: 200,
//         body: JSON.stringify(
//           {
//             results: results
//           },
//           null,
//           2
//         ),
//       };
//     })


//   })

  

// };
