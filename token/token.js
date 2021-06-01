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

  await dynamoDb.get(params, (error, data) => {

    if (error) {
      console.error(error);
      throw error;
    }

    const existent = data.filter(
      (item) => CryptoHelper.decrypt(item.password) === password
    );
    if (existent && existent[0]) return existent[0].token;

  });
}

module.exports.createToken = async (event, context, callback) => {
    try {

      const body = JSON.parse(event.body);

      let username = body.username;
      let password = body.password;

      const existentToken = await getExistentToken(
        username,
        password
      );

      if (existentToken) {
        console.log("Existent token for user:", existentToken);

        const response = {
          statusCode: 201,
          body: JSON.stringify({token: existentToken}),
        };
        callback(null, response);
      }

      const encryptedPass = CryptoHelper.encrypt(password);
      const token = uuid.v4();

      const data = {
        username: username,
        password: encryptedPass,
        token: token,
      };

      console.log("Inserting new credentials: ", data);

      const params = {
        TableName: tableName,
        Item: {
          token,
          username: username,
          password: encryptedPass,
        },
      };

      return dynamoDb.put(params, (error) => {
        console.log(params)
        if (error) {
          console.error(error);
          callback(null, JSON.stringify({
            statusCode: error.statusCode || 501,
            headers: { 'Content-Type': 'text/plain' },
            body: 'Couldn\'t create token.',
          }));
        }
        
        const response = {
          statusCode: 201,
          body: JSON.stringify({token: token}),
        };
        callback(null, response);
      }).promise();

    } catch (error) {
      console.log("Error:", error);
      res.status(500).json();
    }
}