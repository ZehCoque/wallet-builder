const axios = require('axios');

const tableName = process.env.DYNAMODB_TABLE + "-TICKER";
const API_URI = process.env.STOCKS_API;
const API_KEY = process.env.API_KEY;

function getChartData(outputSize){

  const URI = API_URI;
  const params = {
    "function": "TIME_SERIES_DAILY_ADJUSTED",
    "symbol": ticker,
    "outputsize": outputSize,
    "apikey": API_KEY
  }

  let promise = new Promise((resolve, reject) => {
    axios.get(URI,{params: params, headers: headers})
    .then(response => {
  
      //response.data["Time Series (Daily)"] format
      //"date:{
      // "1. open": string,
      // "2. high": string,
      // "3. low": string,
      // "4. close": string,
      // "5. volume": string
      // }
  
  
    })
    .catch(error => {
      console.log('API GET failed\n', error);
      reject(error);
    });
  });

  return promise;

}

function getDataFromDynamo() {

  const params = {
    TableName: tableName,
  };

  var p = new Promise((resolve, reject) => {
    dynamoDb.scan(params, (error, res) => {
      if (error) {
        console.error('DynamoDB error: ' + error);
        reject(error);
      }

      if (!res || !res.Items) reject('No tickers retrieved from DB');

      resolve(res.Items);
    });
  })

  return p;

}

module.exports.dataseries = (event, context, callback) => {


  getDataFromDynamo().then(data => {
    console.log(data)
  })
  

};
