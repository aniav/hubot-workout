/* @flow */
//  Description:
//    Randomly pick an excercise to throw it to the users
//  Author:
//    aniav <anna.warzecha@gmail.com>

import config from '../config'

var getRandomIntInclusive = function(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

var drawUsers = function(users, limit=3) {
  // Draw only active users
  let activeUsers = [];
  Object.keys(users).forEach(id => {
    let user = users[id];
    if (user.id === 'USLACKBOT') return // slackbot doesn't identify as a bot
    if (user.slack.is_bot === true) return
    if (user.slack.deleted === true) return
    if (user.slack.is_restricted === true) return
    if (user.slack.presence !== 'active') return

    activeUsers.push(user)
  });

  let selectedUsers = [];
  for (var i = 1; i <= limit; i++) {
    if (activeUsers.length < 1) break;

    let selectedUserIndex = Math.floor(Math.random() * activeUsers.length);
    selectedUsers.push(...activeUsers.splice(selectedUserIndex, 1));
  }

  return selectedUsers;
}

module.exports = function(robot) {

  /**
  * Prepares the user stats Map for the scripts to use.
  * @param {Array} users
  * @return null
  *
  * The state of the stats is preserved after bot shutdown.
  */
  robot._prepareStats = function() {
    if (!robot.brain.stats) robot.brain.stats = new Map();
    Object.keys(robot.brain.users()).forEach(userId => {
      if (!robot.brain.stats.has(userId)) {
        robot.brain.stats.set(userId, new Map());
      }
      let userStats = robot.brain.stats.get(userId);
      config.exercises.forEach(exercise => {
        if (userStats.has(exercise.slug)) return;

        userStats.set(exercise.slug, 0);
      });
    });
  }

  /**
  * Sets the Exercise timeout based on the config file.
  * @return null
  *
  * The config should define a collouts Object with a structure similar to
  * callouts: {
  *  timeBetween: {
  *    minTime: 17,
  *    maxTime: 23,
  *    units: "minutes"
  *  },
  *  numUsers: 3
  * }
  *
  * The above one is the default for this bot.
  */
  robot._setExerciseTimeout = function() {
    let timeConfig = config.callouts.timeBetween;
    let multipliers = new Map([
      ["seconds", 1],
      ["minutes", 60],
      ["hours", 60 * 60],
      ["days", 60 * 60 * 24]
    ]);
    let time = getRandomIntInclusive(timeConfig.minTime, timeConfig.maxTime)
    let multiplier = (multipliers.has(timeConfig.units)) ?
                        multipliers.get(timeConfig.units) :
                        multipliers.get('minutes');

    robot.brain.timeoutId = setTimeout(function() {
      robot._runExercise();
    }, time * multiplier * 1000);
  };

  /**
  * Saves the stats after users have been called to exercises.
  *
  * @param {Array} users
  * @param {Object} exercise
  * @param {Number} reps
  * @return null
  */
  robot._saveStats = function(users, exercise, reps) {
    users.forEach(user => {
      let userActivity = robot.brain.stats.get(user.id);

      if (!userActivity.has(exercise.slug)) {
        userActivity.set(exercise.slug, reps)
      } else {
        userActivity[exercise.slug] += reps;
      }

      robot.brain.stats.set(user.id, userActivity);
    });
  };

  /**
  * Runs the actual exercise, saves the stats and starts the counter for next
  *
  * @return null
  */
  robot._runExercise = function() {
    // Get exercises
    let exercise = config.exercises[Math.floor(Math.random() * config.exercises.length)];
    let reps = getRandomIntInclusive(exercise.minReps, exercise.maxReps);
    let units = (exercise.units) ? ` ${exercise.units}` : '';

    // Get users
    let selectedUsers = drawUsers(robot.brain.users(), config.callouts.numUsers);
    let userNames = []
    selectedUsers.forEach(user => {
      //userNames.push(`@${user.name}`);
      userNames.push(`${user.name}`);
    });

    robot.messageRoom(
      config.room,
      `${userNames.join(", ")} ${reps}${units} ${exercise.name} NOW!`
    );

    robot._saveStats(selectedUsers, exercise, reps);
    robot._setExerciseTimeout();
  };

  robot.respond('/start/i', function(res) {
    robot._prepareStats(robot.brain.users());
    robot._setExerciseTimeout();
    robot.messageRoom(config.room,
                      'Starting the Workout counters! 🏋');
  });

  robot.respond('/stop/i', function(res) {
    clearTimeout(robot.brain.timeoutId);
    robot.messageRoom(config.room,
                      'Stopping the Workout counters! 🛀');
  });

  robot.respond('/stats/i', function(res) {
    res.send(robot.brain.stats);
  });
};
