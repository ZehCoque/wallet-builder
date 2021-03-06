const axios = require("axios");
const moment = require("moment");
const yahooFinance = require("yahoo-finance");
const AWS = require("aws-sdk");
let options = {};
if (process.env.IS_OFFLINE) {
  options = {
    region: "localhost",
    endpoint: "http://localhost:8000",
  };
}
const dynamoDb = new AWS.DynamoDB.DocumentClient(options);
const timeTriggerController = require("../utils/timeTriggerController");

const tickerTableName = process.env.SESSION_NAME + "-TICKERS";
const timeseriesTableName = process.env.SESSION_NAME + "-TIMESERIES";
const API_URI = process.env.STOCKS_API;
const API_KEY = process.env.API_KEY;

function getChartDataAlphaVantage(ticker, outputSize, lastUpdated) {
  const URI = API_URI;
  const params = {
    function: "TIME_SERIES_DAILY_ADJUSTED",
    symbol: ticker,
    outputsize: outputSize,
    apikey: API_KEY,
  };

  let promise = new Promise((resolve, reject) => {
    axios
      .get(URI, { params: params })
      .then((response) => {
        if (response["Error Message"])
          reject(
            "Invalid API call when calling" +
              ticker +
              "with outputSize " +
              outputSize
          );

        var Items = [];
        const timeseries = response.data["Time Series (Daily)"];

        if (outputSize === "full") {
          for (var datetime of Object.keys(timeseries)) {
            var Item = {
              ticker: ticker,
              timestamp: datetime,
              open: timeseries[datetime]["1. open"],
              high: timeseries[datetime]["2. high"],
              low: timeseries[datetime]["3. low"],
              close: timeseries[datetime]["4. close"],
              adj_close: timeseries[datetime]["5. adjusted close"],
              volume: timeseries[datetime]["6. volume"],
              div_amount: timeseries[datetime]["7. dividend amount"],
              split_coeff: timeseries[datetime]["8. split coefficient"],
            };
            Items.push(Item);
          }
        } else if (outputSize === "compact") {
          var count = 0;
          var datetime = Object.keys(timeseries)[count];

          while (datetime > lastUpdated) {
            var Item = {
              ticker: ticker,
              timestamp: datetime,
              open: timeseries[datetime]["1. open"],
              high: timeseries[datetime]["2. high"],
              low: timeseries[datetime]["3. low"],
              close: timeseries[datetime]["4. close"],
              adj_close: timeseries[datetime]["5. adjusted close"],
              volume: timeseries[datetime]["6. volume"],
              div_amount: timeseries[datetime]["7. dividend amount"],
              split_coeff: timeseries[datetime]["8. split coefficient"],
            };
            Items.push(Item);
            count++;
            datetime = Object.keys(timeseries)[count];
          }
        }
        multiWrite(Items)
          .then(() => {
            writeTickerData(response.data)
              .then(() => resolve([ticker, outputSize]))
              .catch((err) => reject(err));
          })
          .catch((err) => reject(err));
      })
      .catch((error) => {
        console.log("API GET failed\n", error);
        reject(error);
      });
  });

  return promise;
}

function getChartDataYahooFinance(tickers, lastUpdated, period) {
  const from = lastUpdated
    ? moment(lastUpdated).startOf("day").format("YYYY-MM-DD")
    : null;
  const to = lastUpdated ? moment().startOf("day").format("YYYY-MM-DD") : null;

  return new Promise((resolve, reject) => {
    yahooFinance.historical(
      {
        symbols: tickers,
        from: from,
        to: to,
        period: period ? period : "d", // 'd' (daily), 'w' (weekly), 'm' (monthly), 'v' (dividends only)
      },
      function (err, response) {
        if (err) {
          reject(err);
        }

        const Items = Object.values(response).map((quotes) => {
          return quotes.map((quote) => {
            return {
              ticker: quote.symbol,
              timestamp: moment(quote.date).format("YYYY-MM-DD"),
              open: quote.open,
              high: quote.high,
              low: quote.low,
              close: quote.close,
              adj_close: quote.adjClose,
              volume: quote.open,
            };
          });
        });

        var promiseArray = [];
        Items.forEach(Item => {
          promiseArray.push(multiWrite(Item));
        });

        Promise.all(promiseArray).then(() => {
          var promiseArray = [];
          tickers.forEach(ticker => promiseArray.push(writeTickerData({ticker: ticker})))
          Promise.all(promiseArray).then(() => {
            resolve([tickers, lastUpdated ? lastUpdated : 'full'])
          }).catch((err) => reject(err));
        })
        .catch((err) => reject(err));

      }
    );
  });
}

function getDataFromDynamo() {
  const params = {
    TableName: tickerTableName,
    ProjectionExpression: "ticker, lastUpdated",
    FilterExpression: "lastUpdated < :today",
    ExpressionAttributeValues: {
      ":today": moment().startOf("day").format("YYYY-MM-DD"),
    },
  };

  var p = new Promise(async (resolve, reject) => {
    let scanResults = [];
    let items;

    do {
      items = await dynamoDb
        .scan(params)
        .promise()
        .catch((error) => reject(error));
      if (!items) reject("No results found");
      items.Items.forEach((item) => scanResults.push(item));
      params.ExclusiveStartKey = items.LastEvaluatedKey;
    } while (typeof items.LastEvaluatedKey != "undefined");

    if (scanResults.length === 0) reject("No results found");

    resolve(scanResults);
  });

  return p;
}

function writeTickerData(data, source = 'YahooFinance') {
  var params;
  if (source === 'YahooFinance') {
    params = {
      TableName: tickerTableName,
      Item: {
        ticker: data.ticker,
        lastUpdated: moment().format("YYYY-MM-DD"),
        lastRefreshed: moment().format("YYYY-MM-DD"),
      },
    };
  }
  else {
    params = {
      TableName: tickerTableName,
      Item: {
        ticker: data["Meta Data"]["2. Symbol"],
        lastUpdated: moment().format("YYYY-MM-DD"),
        lastRefreshed: data["Meta Data"]["3. Last Refreshed"],
      },
    };
  }

  var p = new Promise((resolve, reject) => {
    dynamoDb
      .put(params, (error) => {
        if (error) {
          console.error(error);
          reject(error);
        }
        resolve();
      })
      .promise();
  });

  return p;
}

function multiWrite(data) {
  var p = new Promise(async (resolve, reject) => {
    // Build the batches
    var batches = [];
    var current_batch = [];
    var item_count = 0;
    for (var x in data) {
      // Add the item to the current batch
      item_count++;
      current_batch.push({
        PutRequest: {
          Item: data[x],
        },
      });
      // If we've added 25 items, add the current batch to the batches array
      // and reset it
      if (item_count % 25 == 0) {
        batches.push(current_batch);
        current_batch = [];
      }
    }
    // Add the last batch if it has records and is not equal to 25
    if (current_batch.length > 0 && current_batch.length != 25)
      batches.push(current_batch);

    // Handler for the database operations
    var completed_requests = 0;
    var errors = 0;
    function handler(request) {
      return function (err) {
        // Increment the completed requests
        completed_requests++;

        // Log the error if we got one
        if (err) {
          errors = 1;
          console.error(JSON.stringify(err, null, 2));
          console.error("Request that caused database error:");
          console.error(JSON.stringify(request, null, 2));
        }

        // Make the callback if we've completed all the requests
        if (completed_requests == batches.length) {
          return errors;
        }
      };
    }

    // Make the requests
    var params;
    var errors;
    for (x in batches) {
      // Items go in params.RequestItems.id array
      // Format for the items is {PutRequest: {Item: ITEM_OBJECT}}
      params = '{"RequestItems": {"' + timeseriesTableName + '": []}}';
      params = JSON.parse(params);
      params.RequestItems[timeseriesTableName] = batches[x];

      // Perform the batchWrite operation
      errors += await dynamoDb.batchWrite(params, handler(params)).promise();
    }
    if (errors > 0) reject("batchWrite erros: ", errors);
    resolve();
  });

  return p;
}

module.exports.timeseries = () => {
  getDataFromDynamo()
    .then(async (data) => {
      // let promiseArray = [];

      // data.forEach(row => {
      //   if (promiseArray.length < process.env.API_MAX_QUERIES_PER_SEC) {
      //       let outputsize = row.lastUpdated === '1900-01-01' ? 'full' : 'compact';
      //       promiseArray.push(getChartData(row.ticker, outputsize, row.lastUpdated));
      //   }

      // });

      // if (promiseArray.length < process.env.API_MAX_QUERIES_PER_SEC) timeTriggerController.timeTriggerController('DISABLED')

      // const results = await Promise.all(promiseArray);

      const tickers = data.map((row) => row.ticker);
      const full = data.filter(d => d.lastUpdated === "1900-01-01").map(r => r.ticker);

      const compactFilter = data.filter(d => d.lastUpdated != "1900-01-01")
      const compact = compactFilter.map(r => r.ticker);
      const lastUpdated = moment.min(compactFilter.map((row) => moment(row.lastUpdated))).format("YYYY-MM-DD");

      console.log(lastUpdated)
      if (tickers.length < process.env.API_MAX_QUERIES_PER_SEC) {
        timeTriggerController.timeTriggerController("DISABLED");
      }

      const promiseArray = [getChartDataYahooFinance(full), getChartDataYahooFinance(compact,lastUpdated)]
      const results = await Promise.all(promiseArray);

      const response = {
        statusCode: 200,
        body: results.flat(),
      };
      console.log(response)

      return response;
    })
    .catch((error) => {
      const response = {
        statusCode: 500,
        body: JSON.stringify(error),
      };

      console.log(error);

      return response;
    });
};
