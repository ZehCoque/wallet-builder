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
const tableName = process.env.SESSION_NAME + "-USER";

const timeTriggerController = require('../utils/timeTriggerController');

function getUsersFromDynamo() {

    const params = {
      TableName: tableName,
      ProjectionExpression: 'username'
    };
  
    var p = new Promise((resolve, reject) => {
      dynamoDb.scan(params, (error, res) => {
        if (error) {
          console.error('DynamoDB error: ' + error);
          reject(error);
        }
  
        users = [];
  
        res.Items.forEach(row => {
            users.push(row.username)
        });
  
        resolve(users);
      });
    })
  
    return p;
  
  }

function invokeTickerTracker(username) {

  var p = new Promise((resolve, reject) => {
    const payload = {queryStringParameters: {username: username}};
    const invokeParams = {
        FunctionName: 'wallet-builder-dev-tickerTracker',
        InvocationType : 'RequestResponse',
        Payload: JSON.stringify(payload)
      }; 

    lambda.invoke(invokeParams, function(error, data) {
      if (error) {
        console.log(error);
        reject(error);
      }

      if (!data) {
        console.log('Payload null')
        reject({error: 'Payload null'});
      }

      const payload = JSON.parse(data.Payload);  
      if (payload.errorMessage) {
        console.log(payload)
        reject({error: payload.errorMessage});
      }
      
      console.log(payload)

      resolve();
  
    });

  });

  return p;

}

module.exports.reloadUsersWallets = () => {

    getUsersFromDynamo().then(users => {
        var promiseArray = [];
        users.forEach(user => {
            promiseArray.push(invokeTickerTracker(user));
        });

        return Promise.all(promiseArray).then(() => {
            timeTriggerController.timeTriggerController('ENABLED');

            return 'All wallets have been reloaded successfully';
        }).catch(err => {
            console.log(err);
            return err;
        })

    })
}