//  Description:
//    Randomly pick an excercise to throw it to the users
//  Author:
//    aniav <anna.warzecha@gmail.com>

import config from '../config'

module.exports = function(robot) {

  robot.respond(/test/i, function (res) {
    res.send("I'm too fizzy..");
  });
};
