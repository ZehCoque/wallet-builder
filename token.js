const AWS = require('aws-sdk');
const uuid = require('uuid');
const CryptoHelper = require('./util/crypto');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

const tableName = process.env.DYNAMODB_TABLE + "-TOKEN";

async function getExistentEntry(username) {
  const params = {
    TableName: tableName,
    FilterExpression: 'username = :username',
    ExpressionAttributeValues: {
      ":username": username
    }
  };

  var p = new Promise((resolve, reject) => {
    dynamoDb.scan(params, (error, res) => {

      if (error) {
        console.error(error);
        reject(error);
      }

      if (res.Count === 0) resolve(false)
      resolve(res.Items[0]);
      
    });
  })

  return p

}

module.exports.createToken = async (event, context, callback) => {
    try {

      const body = JSON.parse(event.body);

      const username = body.username;
      const password = body.password;

      const existentEntry = await getExistentEntry(username);

      if (existentEntry.password) {
        if (CryptoHelper.decrypt(existentEntry.password) === password) {
          console.log("Existent token:", existentEntry.token);
  
          const response = {
            statusCode: 201,
            body: JSON.stringify({token: existentEntry.token}),
          };
          return callback(null, response);
        } else {
          console.log("Password changed. Deleting current entry.");

          const params = {
            TableName: tableName,
            Key: {
              token: existentEntry.token,
            }
          };

          await dynamoDb.delete(params, (error) => {
            if (error) {
              console.error(error);
    
              const response = {
                statusCode: 201,
                body: JSON.stringify({error: 'Couldn\'t create token.'}),
              };
    
              return callback(null, response);
    
            }

          }).promise();
        }
      }

      const encryptedPass = CryptoHelper.encrypt(password);
      const token = uuid.v4();

      const params = {
        TableName: tableName,
        Item: {
          token,
          username: username,
          password: encryptedPass,
        },
      };

      return dynamoDb.put(params, (error) => {
        if (error) {
          console.error(error);

          const response = {
            statusCode: 201,
            body: JSON.stringify({error: 'Couldn\'t create token.'}),
          };

          return callback(null, response);

        }
        
        const response = {
          statusCode: 201,
          body: JSON.stringify({token: token}),
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