const axios = require('axios');
const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const calculateBusinessDays = require('./util/calculateBusinessDays');
var moment = require('moment');

const tableName = process.env.DYNAMODB_TABLE + "-TICKER";
const API_URI = process.env.STOCKS_API;
const API_KEY = process.env.API_KEY;

function getChartData(ticker, outputSize){

  const URI = API_URI;
  const params = {
    "function": "TIME_SERIES_DAILY_ADJUSTED",
    "symbol": ticker,
    "outputsize": outputSize,
    "apikey": API_KEY
  }

  let promise = new Promise((resolve, reject) => {
    axios.get(URI,{params: params})
    .then(response => {
  
      //response.data["Time Series (Daily)"] format
      //"date:{
      // "1. open": string,
      // "2. high": string,
      // "3. low": string,
      // "4. close": string,
      // "5. volume": string
      // }

      putDataInDynamo(response.data)
      .then(() => resolve())
      .catch(error => reject(error));
  
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

function putDataInDynamo(data) {

  const params = {
    TableName: tableName,
    Item: {
      ticker: data['Meta Data']['2. Symbol'],
      lastUpdated: moment().toISOString(),
      metadata: data['Meta Data'],
      timeseries: data['Time Series (Daily)']
    },
  };
  
  var p = new Promise((resolve, reject) => {
    dynamoDb.put(params, (error) => {
      if (error) {
        console.error(error);
        reject(error);
      }   
      console.log(params.ticker)
      resolve();
    }).promise();
  })

  return p;
}

module.exports.dataseries = (event, context, callback) => {

  getDataFromDynamo().then(data => {

    let promiseArray = [];

    data.forEach(row => {
      if (promiseArray.length < 5) {
        if (!row.lastUpdated) {
          promiseArray.push(getChartData(row.ticker, "full"));
        } else if (calculateBusinessDays.calculateBusinessDays(row.lastUpdated, moment()) > 0) {
          promiseArray.push(getChartData(row.ticker, "compact"));
        }
      }

    });

    return Promise.all(promiseArray)
    .then((results) => {

      const response = {
        statusCode: 200,
        body: results,
      };

      return response;
    });

  })
  .catch(error =>{
    const response = {
      statusCode: 500,
      body: JSON.stringify(error),
    };

    console.log(error);

    return response;
  })
  

};
