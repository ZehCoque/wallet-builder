const AWS = require('aws-sdk');
const uuid = require('uuid');
const CryptoHelper = require('../util/crypto');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

const tableName = process.env.DYNAMODB_TABLE + "-TOKENS";

async function getExistentToken(username, password) {
  const params = {
    TableName: tableName,
    Key: {
      username: username,
    },
  };

  var p = new Promise((resolve, reject) => {
    dynamoDb.get(params, (error, res) => {

      if (error) {
        console.error(error);
        reject(error);
      }

      if (!res.Item) resolve(false)
      resolve(res.Item);
      
    });
  })

  return p

}

module.exports.createToken = async (event, context, callback) => {
    try {

      const body = JSON.parse(event.body);

      let username = body.username;
      let password = body.password;

      const existentEntry = await getExistentToken(username,password);

      if (existentEntry.password) {
        if (CryptoHelper.decrypt(existentEntry.password) === password) {
          console.log("Existent token for user:", existentEntry.token);
  
          const response = {
            statusCode: 201,
            body: JSON.stringify({token: existentEntry.token}),
          };
          return callback(null, response);
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