const AWS = require('aws-sdk');
const lambda = new AWS.Lambda({
  region: 'sa-east-1'
});
let options = {};
if (process.env.IS_OFFLINE) {
  options= {
      region: 'localhost',
      endpoint: 'http://localhost:8000'
  }
}
const dynamoDb = new AWS.DynamoDB.DocumentClient(options);
const moment = require('moment');
const momentBusinessDays = require('./util/momentBusinessDays');

const tableName = process.env.SESSION_NAME + '-TIMESERIES';

function getOperations(event) {

    var p = new Promise(async (resolve, reject) => {

      const params = event.queryStringParameters;
      const username = params.username;
      
      const payload = {queryStringParameters: {username: username}};
      const invokeParams = {
          FunctionName: 'wallet-builder-dev-getStockHistory',
          InvocationType : 'RequestResponse',
          Payload: JSON.stringify(payload)
        }; 
  
      await lambda.invoke(invokeParams, function(error, data) {
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
                date: moment(operation.date).utc().format('YYYY-MM-DD'),
                ticker: code,
                quantity: operation.operation === 'C' ? operation.quantity : -1 * operation.quantity,
                price: operation.price,
                totalValue: operation.totalValue
            });

          });
        });

        resolve([tickers, operations]);
    
      }).promise();
  
    });
  
    return p;
  
}
  
function getTimeseriesFromDB(ticker) {

    const params = {
      TableName: tableName,
      KeyConditionExpression: 'ticker = :ticker',
      ProjectionExpression: '#c, #tmstmp',
      ExpressionAttributeValues: {
        ':ticker': ticker,
      },
      ExpressionAttributeNames: {
        '#tmstmp': 'timestamp',
        '#c' : 'close'
      },
      ScanIndexForward: false
    };
  
    var p = new Promise(async (resolve, reject) => {
      await dynamoDb.query(params, (error, res) => {
        if (error) {
          console.error('DynamoDB error: ' + error);
          reject(error);
        }
        
        if (!res || !res.Items) resolve('Ticker not found in DynamoDB')

        var data = {
          name: ticker,
          close: [],
          timestamp: []
        }

        res.Items.forEach(row => {
          data.close.push(row.close);
          data.timestamp.push(row.timestamp);
        })
        
        resolve(data);
      }).promise();
    });
  
    return p;
  
}

function getQtyArray(operationList) {

  var p = new Promise((resolve, reject) => {
    var date = operationList[0].date;

    var categories = [];
    var series = [];
    
    while (momentBusinessDays.calculateBusinessDays(date,moment()) > 0) {

      const withOperations = operationList.filter(f => f.date === date);

      series.forEach(s => {
        if (!withOperations.find(op => op.ticker === s.name))
        s.data.push(s.data[s.data.length - 1]);
      });

      var tickers = [];

      withOperations.forEach(op => {

        const s = series.find(s => s.name === op.ticker);
    
        if (!s) series.push({
          name: op.ticker,
          data: [op.quantity]
        })
        else if (tickers.indexOf(op.ticker) != -1) s.data[s.data.length - 1] = s.data[s.data.length - 1] + op.quantity;
        else s.data.push(op.quantity + s.data[s.data.length - 1])
        
        if(tickers.indexOf(op.ticker) === -1) tickers.push(op.ticker);
      })
      
      categories.push(date);
      date = momentBusinessDays.addBusinessDays(date,1);
  
    }

    resolve([categories, series]);
  })

  return p;

}


module.exports.chartMaker = (event, context, callback)  => {

  getOperations(event).then(async res => {
    const tickerList = res[0];
    const operationList = res[1];

    var promiseArray = [getQtyArray(operationList)];

    tickerList.forEach(ticker => {
        promiseArray.push(getTimeseriesFromDB(ticker));
    });

    try {
      const promiseRes = await Promise.all(promiseArray);
      // console.log(promiseRes);

      const response = {
        statusCode: 200,
        body: JSON.stringify(promiseRes),
      };
      return callback(null, response);
    } catch (error) {
      const error_response = {
        statusCode: 500,
        body: JSON.stringify({ promiseAllError: error }),
      };
      return callback(null, error_response);
    }


  }).catch(error => {

  const error_response = {
    statusCode: 500,
    body: JSON.stringify({getOperationsError: error}),
  };

  return callback(null, error_response);
  });

} 