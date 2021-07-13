const AWS = require('aws-sdk');
let options = {};
if (process.env.IS_OFFLINE) {
  options= {
      region: 'localhost',
      endpoint: 'http://localhost:8000'
  }
} else options = {region: 'sa-east-1'}
const dynamoDb = new AWS.DynamoDB.DocumentClient(options);
const lambda = new AWS.Lambda(options);

const tableName = process.env.SESSION_NAME + "-TICKERS";

function getTickersFromDynamo() {

  const params = {
    TableName: tableName,
    ProjectionExpression: 'ticker'
  };

  var p = new Promise((resolve, reject) => {
    dynamoDb.scan(params, (error, res) => {
      if (error) {
        console.error('DynamoDB error: ' + error);
        reject(error);
      }

      tickers = [];

      res.Items.forEach(row => {
          tickers.push(row.ticker)
      });

      resolve(tickers);
    });
  })

  return p;

}

function getUserStockHistory(event) {

  var p = new Promise((resolve, reject) => {

    var username;
    if (!event.Records) username = event.queryStringParameters.username;
    else username = event.Records[0].dynamodb.Keys.username.S;

    console.log(username)
    
    const payload = {queryStringParameters: {username: username}};
    const invokeParams = {
        FunctionName: 'wallet-builder-dev-getStockHistory',
        InvocationType : 'RequestResponse',
        Payload: JSON.stringify(payload)
      }; 

    lambda.invoke(invokeParams, function(error, data) {
      if (error) {
        console.log(error);
        reject(error);
      }

      console.log('payload', data)

      const payload = JSON.parse(data.Payload);

      if (payload.errorMessage) {
        console.log(payload)
        reject({error: payload.errorMessage});
      }
    
      const body = JSON.parse(payload.body);
  
      var tickers = [];
  
      body.forEach(institution => {
        institution.stockHistory.forEach(operation => {
          var code = operation.code;

          if (code.charAt(code.length-1) === 'F') code = code.substring(0, code.length - 1)

          code = code + '.SA';

          if(tickers.indexOf(code) === -1) {
            tickers.push(code);
          };
        });
      });

      resolve(tickers);
  
    });

  });

  return p;

}

function putTicker(ticker) {

  const params = {
    TableName: tableName,
    Item: {
      ticker: ticker,
      lastUpdated: '1900-01-01'
    },
  };

  var p = new Promise((resolve, reject) => {
    dynamoDb.put(params, (error) => {
      if (error) {
        console.error(error);
        reject(error);
      }   
      resolve();
    }).promise();
  })

  return p;
}

module.exports.tickerTracker = (event, context, callback) => {

  if (event.Records) {
    if (event.Records[0].eventName === 'REMOVE') return {
      statusCode: 200,
      body: JSON.stringify({message: "Remove action"}),
    }; ;
  }

  var promiseArray = [getTickersFromDynamo(), getUserStockHistory(event)];

  return Promise.all(promiseArray).then((results) => {

      const dynamoTickers = results[0];
      const userTickers = results [1];

      Array.prototype.diff = function(a) {
        return this.filter(function(i) {return a.indexOf(i) < 0;});
      };

      const difference = userTickers.diff(dynamoTickers);


      if (difference.length === 0) {

        const response = {
          message: "No changes have been made."
        }

        console.log(response);

        return callback(null, response);;

      } else {

        var tickerPromiseArray = [];

        difference.forEach(ticker => {
          tickerPromiseArray.push(putTicker(ticker));
        });

        return Promise.all(tickerPromiseArray)
        .then(() => {

          const response = {
            message: "Tickers added successfully!",
            tickers: difference
          }

          console.log(response);

          return callback(null, response);;
        })
        .catch(error => {

          const response = {
            message: "Error!",
            error: error
          }

          console.log(response);

          return callback(null, response);;
        });

      }

  }).catch(error => console.log("Promise.all error", error));

}