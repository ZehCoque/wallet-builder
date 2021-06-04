const CryptoHelper = require('./util/crypto');
const CeiCrawler = require('cei-crawler');
const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

const tableName = process.env.SESSION_NAME + "-USER";

async function getUsernameAndPassword(username) {

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
      if (!res || !res.Item) reject('Invalid or unregistered username.')
      resolve(res.Item.password);
    });
  })

  return p;
}

module.exports.getWallet = async (event, context, callback) => {
  
const params = event.queryStringParameters;
const username = params.username;
const password = CryptoHelper.decrypt(await getUsernameAndPassword(username));

let ceiCrawler = new CeiCrawler(username, password);

return ceiCrawler.getWallet().then(wallet => {
  const response = {
    statusCode: 200,
    body: JSON.stringify(wallet),
  };
  return callback(null, response);
}).catch(error =>{
  const response = {
    statusCode: 500,
    body: JSON.stringify({error: error.type}),
  };
  return callback(null, response);
});

}

module.exports.getStockHistory = async (event, context, callback) => {
  
  const params = event.queryStringParameters;
  const username = params.username;
  const password = CryptoHelper.decrypt(await getUsernameAndPassword(username));
  
  let ceiCrawler = new CeiCrawler(username, password);
  
  return ceiCrawler.getStockHistory().then(history => {
    const response = {
      statusCode: 200,
      body: JSON.stringify(history),
    };
    return callback(null, response);
  }).catch(error =>{
    const response = {
      statusCode: 500,
      body: JSON.stringify({error: error.type}),
    };
    return callback(null, response);
  });
  
}

module.exports.getDividends = async (event, context, callback) => {
  
  const params = event.queryStringParameters;
  const username = params.username;
  const password = CryptoHelper.decrypt(await getUsernameAndPassword(username));
  
  let ceiCrawler = new CeiCrawler(username, password);
  
  return ceiCrawler.getDividends().then(dividends => {
    const response = {
      statusCode: 200,
      body: JSON.stringify(dividends),
    };
    return callback(null, response);
  }).catch(error =>{
    const response = {
      statusCode: 500,
      body: JSON.stringify({error: error.type}),
    };
    return callback(null, response);
  });
  
}

module.exports.getTreasures = async (event, context, callback) => {
  
  const params = event.queryStringParameters;
  const username = params.username;
  const password = CryptoHelper.decrypt(await getUsernameAndPassword(username));
  
  let ceiCrawler = new CeiCrawler(username, password);
  
  return ceiCrawler.getTreasures().then(treasures => {
    const response = {
      statusCode: 200,
      body: JSON.stringify(treasures),
    };
    return callback(null, response);
  }).catch(error =>{
    const response = {
      statusCode: 500,
      body: JSON.stringify({error: error.type}),
    };
    return callback(null, response);
  });
  
}