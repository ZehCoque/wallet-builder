const aws = require('aws-sdk');
const lambda = new aws.Lambda({
  region: 'sa-east-1'
});

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
        const result = JSON.parse(data);
        const body = result.body;


      });
}