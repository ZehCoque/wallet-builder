module.exports.tickerTracker = (event, context, callback) => {
    var token = event.Records;
    console.log(token);
    const response = {
        statusCode: 200,
        body: JSON.stringify(token),
      };
      return response;
}