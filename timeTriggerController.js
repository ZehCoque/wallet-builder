var AWS = require("aws-sdk");
AWS.config.update({ region: "sa-east-1" });
var cwevents = new AWS.CloudWatchEvents();

module.exports.timeTriggerController = (action) => {

    var params = {
        Name: "Stock-API-Rule",
        ScheduleExpression: "rate(1 minute)",
        State: action, //ENABLED or DISABLED,
        Description: "Rule to run the Alpha Vantage API with 5 tickers every minute until its disabled"
      };

    return cwevents.putRule(params, function(err, data) {
    if (err) {
        console.log("Error", err);
        return err;
    } else {
        var targetParams = {
            Rule: "Stock-API-Rule", //name of the CloudWatch rule
            Targets: [
              {
                Arn: "arn:aws:lambda:sa-east-1:610426475485:function:wallet-builder-dev-dataseries",
                Id: "wallet-builder-dev-dataseries",
              }
            ]
          };
          
          return cwevents.putTargets(targetParams, function(err, data) {
            if (err) {
              console.log("Error", err);
            } else {
              console.log('Stock-API-Rule ' + action + ' successfully!');
              return data
            }
          });
    }
    });

}