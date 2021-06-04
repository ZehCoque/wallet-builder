const AWS = require('aws-sdk');
const lambda = new AWS.Lambda({
  region: 'sa-east-1'
});
const dynamoDb = new AWS.DynamoDB.DocumentClient();

const tableName = process.env.DYNAMODB_TABLE + "-TICKER";

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

    const username = event.Records[0].dynamodb.Keys.username.S;
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

    if (event.Records[0].eventName === 'REMOVE') return {
      statusCode: 200,
      body: JSON.stringify({message: "Remove action"}),
    }; ;

  	var promiseArray = [getTickersFromDynamo(), getUserStockHistory(event)];

    return Promise.all(promiseArray).then((results) => {

        const dynamoTickers = results[0];
        const userTickers = results [1];

        const difference = dynamoTickers
        .filter(x => !userTickers.includes(x))
        .concat(userTickers.filter(x => !dynamoTickers.includes(x)));


        if (difference.length === 0) {

          const response = {
            message: "No changes have been made."
          }

          console.log(response);

          return response;

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

            return response;
          })
          .catch(error => {

            const response = {
              message: "Error!",
              error: error
            }

            console.log(response);

            return response;
          });

        }
  
    }).catch(error => console.log("Promise.all error", error));

}