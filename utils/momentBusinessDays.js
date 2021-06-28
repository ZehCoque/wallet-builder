var moment = require('moment');

module.exports.calculateBusinessDays = (firstDate, secondDate) => {
  var day1 = moment(firstDate);
  var day2 = moment(secondDate);
  var adjust = 0;
  
  if((day1.dayOfYear() === day2.dayOfYear()) && (day1.year() === day2.year())){
    return 0;
  }
  
  if(day2.isBefore(day1)){
    day2 = moment(firstDate);
    day1 = moment(secondDate);
  }

  //Check if first date starts on weekends
  if(day1.day() === 6) { //Saturday
    day1.day(8);
  } else if(day1.day() === 0) { //Sunday
    day1.day(1);
  }

  if(day2.day() === 6) { //Saturday
    day2.day(5);
  } else if(day2.day() === 0) { //Sunday
    day2.day(-2);
  }

  var day1Week = day1.week();
  var day2Week = day2.week();

  if(day1Week !== day2Week){
    if (day2Week < day1Week){
      day2Week += day1Week;
    }
    adjust = -2 * (day2Week - day1Week);
  }

  return day2.diff(day1, 'days') + adjust;
}

module.exports.addBusinessDays = (originalDate, numDaysToAdd) => {
  const Sunday = 0;
  const Saturday = 6;

  let newDate = originalDate;

  newDate = moment(newDate).add(numDaysToAdd, 'days');

  while (moment(newDate).day() === Sunday || moment(newDate).day() === Saturday) {
    newDate = moment(newDate).add(1, 'days');
  }

  return moment(newDate).startOf('day').format("YYYY-MM-DD");
}