const AWS = require('aws-sdk');
const CryptoHelper = require('../utils/crypto');
let options = {};
if (process.env.IS_OFFLINE) {
  options= {
      region: 'localhost',
      endpoint: 'http://localhost:8000'
  }
}
const dynamoDb = new AWS.DynamoDB.DocumentClient(options);

const tableName = process.env.SESSION_NAME + "-USER";

module.exports.register = async (event, context, callback) => {
    try {

      const body = JSON.parse(event.body);

      const username = body.username;
      const password = CryptoHelper.encrypt(body.password);

      const params = {
        TableName: tableName,
        Item: {
          username: username,
          password: password,
        },
      };

      return dynamoDb.put(params, (error) => {
        if (error) {
          console.error(error);

          const response = {
            statusCode: 201,
            body: JSON.stringify({error: 'Couldn\'t add users.'}),
          };

          return callback(null, response);

        }
        
        const response = {
          statusCode: 201,
          body: JSON.stringify({message: "User registered successfully!"}),
        };
        return callback(null, response);
      }).promise();
      

    } catch (error) {
      console.log("Error:", error);
      const response = {
        statusCode: 500,
        body: JSON.stringify({error: error}),
      };
      return callback(null, response);
    }
}