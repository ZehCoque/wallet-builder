const aws = require('aws-sdk');
const lambda = new aws.Lambda({
  region: 'sa-east-1'
});

const tableName = process.env.DYNAMODB_TABLE + "-TICKER";

async function getTickersFromDynamo() {

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
      resolve(res.Items);
    });
  })

  return p;

}

module.exports.tickerTracker = (event, context, callback) => {
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
          return error;
        }
        console.log(data)
        const body = JSON.parse(data);

        console.log(body);

      // body.forEach(institution => {
      //   institution.stockHistory.forEach(operation => {
      //       console.log(operation.code)
      //   });
      // });

    });

    const dynamoTickers = await getTickersFromDynamo();

    console.log(dynamoTickers);
}