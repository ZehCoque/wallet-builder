const AWS = require('aws-sdk');
const lambda = new AWS.Lambda({
  region: 'sa-east-1'
});
const dynamoDb = new AWS.DynamoDB.DocumentClient();

const tableName = process.env.SESSION_NAME + "-TICKERS";

function getUserStockHistory(event) {

    var p = new Promise((resolve, reject) => {
  
      var username;
      if (!event.Records) username = event
      else username = event.Records[0].dynamodb.Keys.username.S;
      
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
    
        var operations = [];
        var tickers = [];
    
        body.forEach(institution => {
          institution.stockHistory.forEach(operation => {
            var code = operation.code;
  
            if (code.charAt(code.length-1) === 'F') code = code.substring(0, code.length - 1)
  
            code = code + '.SA';

            if(tickers.indexOf(code) === -1) {
                tickers.push(code);
              };
  
            operations.push({
                date: operation.date,
                ticker: code,
                quantity: operation.operation === "C" ? operation.quantity : -1 * operation.quantity,
                price: operation.price,
                totalValue: operation.totalValue
            });

          });
        });
  
        resolve(tickers, operations);
    
      });
  
    });
  
    return p;
  
}
  
function getTimeseriesFromDB(ticker) {

    const params = {
      TableName: tableName,
      KeyConditionExpression: 'ticker = :ticker',
      ProjectionExpression: 'ticker, timestamp, close',
      ExpressionAttributeValues: {
        ':ticker': ticker,
      },
      ScanIndexForward: false
    };
  
    var p = new Promise((resolve, reject) => {
      dynamoDb.query(params, (error, res) => {
        if (error) {
          console.error('DynamoDB error: ' + error);
          reject(error);
        }
  
        resolve(res.Items);
      });
    })
  
    return p;
  
  }

module.exports.chartMaker = (event, context, callback)  => {

    getUserStockHistory(event).then(res => {

        const tickerList = res[0];
        const operationList = res[1];

        var promiseArray = [];

        operationList.forEach(operation => {
            promiseArray.push(getTimeseriesFromDB(operation.ticker));
        });



    })

} 