const CryptoHelper = require('./util/crypto');
const CeiCrawler = require('cei-crawler');
const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

const tableName = process.env.DYNAMODB_TABLE + "-TOKEN";

async function getUsernameAndPassword(token) {

  const params = {
    TableName: tableName,
    Key: {
      token: token,
    },
  };

  var p = new Promise((resolve, reject) => {
    dynamoDb.get(params, (error, res) => {
      if (error) {
        console.error(error);
        reject(error);
      }   
      if (!res.Item) reject('Invalid token.')
      resolve(res.Item);
    });
  })

  return p;
}

module.exports.getWallet = async (event, context, callback) => {
  
const params = event.queryStringParameters;
const token = params.token;
const dbEntry = await getUsernameAndPassword(token);
const username = dbEntry.username;
const password = CryptoHelper.decrypt(dbEntry.password);

let ceiCrawler = new CeiCrawler(username, password);

return ceiCrawler.getWallet().then(wallet => {
  const response = {
    statusCode: 200,
    body: JSON.stringify(wallet),
  };
  return callback(null, response);
});

}

module.exports.getStockHistory = async (event, context, callback) => {
  
  const params = event.queryStringParameters;
  const token = params.token;
  const dbEntry = await getUsernameAndPassword(token);
  const username = dbEntry.username;
  const password = CryptoHelper.decrypt(dbEntry.password);
  
  let ceiCrawler = new CeiCrawler(username, password);
  
  return ceiCrawler.getStockHistory().then(wallet => {
    const response = {
      statusCode: 200,
      body: JSON.stringify(wallet),
    };
    return callback(null, response);
  });
  
}

module.exports.getDividends = async (event, context, callback) => {

  const params = event.queryStringParameters;
  const token = params.token;
  const dbEntry = await getUsernameAndPassword(token);
  const username = dbEntry.username;
  const password = CryptoHelper.decrypt(dbEntry.password);
  
  let ceiCrawler = new CeiCrawler(username, password);
  
  return ceiCrawler.getDividends().then(wallet => {
    const response = {
      statusCode: 200,
      body: JSON.stringify(wallet),
    };
    return callback(null, response);
  });
  
}

module.exports.getTreasures = async (event, context, callback) => {

  const params = event.queryStringParameters;
  const token = params.token;
  const dbEntry = await getUsernameAndPassword(token);
  const username = dbEntry.username;
  const password = CryptoHelper.decrypt(dbEntry.password);
  
  let ceiCrawler = new CeiCrawler(username, password);
  
  return ceiCrawler.getTreasures().then(wallet => {
    const response = {
      statusCode: 200,
      body: JSON.stringify(wallet),
    };
    return callback(null, response);
  });
  
}