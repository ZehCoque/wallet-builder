const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const tableName = process.env.SESSION_NAME + "-USER";

const tickerTracker = require('tickerTracker');
const timeTriggerController = require('timeTriggerController');

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

module.exports.reloadUsersWallets = () => {

    getUsersFromDynamo().then(users => {
        var promiseArray = [];
        users.forEach(user => {
            promiseArray.push(tickerTracker.tickerTracker(user));
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