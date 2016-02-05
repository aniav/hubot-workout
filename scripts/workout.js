//  Description:
//    Randomly pick an excercise to throw it to the users
//  Author:
//    aniav <anna.warzecha@gmail.com>
/* @flow */

import config from '../config'

var Random = require("random-js");
var random = new Random(Random.engines.mt19937().autoSeed());
var slack = require('hubot-slack');

const TIMEOUT_KEY = "timeout";
const TIME_MULTIPLIERS = new Map([
  ["seconds", 1],
  ["minutes", 60],
  ["hours", 60 * 60],
  ["days", 60 * 60 * 24]
]);


module.exports = function(robot) {

  /**
  * Draws one exercise from the config file, randomizes the reps and adds units.
  *
  * @return {[Number, Number, string]} [exercise, reps, units]
  */
  robot._drawExercise = function() {
    let exercise = random.pick(config.exercises);
    const reps = random.integer(exercise.minReps, exercise.maxReps)
    const units = (exercise.units) ? ` ${exercise.units}` : '';
    return [exercise, reps, units];
  }

  /**
  * Selects the users to perform an exercise
  *
  * @param {string} room
  * @return {Array} selected users
  */
  robot._drawUsers = function(room) {
    // Get users present in the room if the adapter accepts that
    let client = robot.adapter.client;
    let memberIds = client.getChannelGroupOrDMByName(room).members;

    // Check if the user is active and therefore can be chosen
    let users = [];
    memberIds.forEach(id => {
      let user = client.getUserByID(id);
      if (!robot._isUserActive(user)) return

      users.push(user);
    });

    let limit = (config.callouts.numUsers <= users.length) ?
                  config.callouts.numUsers : users.length;
    return random.sample(users, limit);
  }

  /**
  * Checks if the given user is active and can participate in the exercise
  *
  * @param {Object} user
  * @return {boolean}
  */
  robot._isUserActive = function(user) {
    // slackbot doesn't identify as a bot
    if (user.id === 'USLACKBOT') return false;
    if (user.is_bot === true) return false;
    if (user.deleted === true) return false;
    if (user.is_restricted === true) return false;
    if (user.presence !== 'active') return false;

    return true;
  }

  /**
  * Prefills stats for a user with all of the exercises from config
  *
  * @param {Map} stats
  * @return {Map} stats modified
  */
  robot._prefillExerciseStats = function() {
    let stats = new Map();
    config.exercises.forEach(exercise => {
      if (stats.has(exercise.slug)) return;

      stats.set(exercise.slug, 0);
    });
    return stats;
  }

  /**
  * Runs the actual exercise, saves the stats and starts the counter for next
  *
  * @return null
  */
  robot._runExercise = function(room) {
    let [exercise, reps, units] = robot._drawExercise();

    let selectedUsers = robot._drawUsers(room);
    let userNames = []
    selectedUsers.forEach(user => {
      //userNames.push(`@${user.name}`);
      userNames.push(`${user.name}`);
    });

    robot.messageRoom(
      room,
      `${userNames.join(", ")} ${reps}${units} ${exercise.name} NOW!`
    );

    robot._saveRoomStats(room, selectedUsers, exercise, reps);
    robot._setExerciseTimeout(room);
  };

  /**
  * Saves the stats after users have been called to exercises.
  *
  * @param {Array} users
  * @param {Object} exercise
  * @param {Number} reps
  * @return null
  */
  robot._saveRoomStats = function(room, users, exercise, reps) {
    let roomStats = robot._getRoomStats(room);
    users.forEach(user => {
      if (!roomStats.has(user.id)) {
        roomStats.set(user.id, robot._prefillExerciseStats());
      }
      let userStats = roomStats.get(user.id);
      userStats.set(exercise.slug, userStats.get(exercise.slug) + reps);
    });
  };


  robot._getRoomStats = function(room) {
    if (!robot.brain.workoutRooms) robot.brain.workoutRooms = new Map();
    if (!robot.brain.workoutRooms.has(room)) {
      robot.brain.workoutRooms.set(room, new Map());
    }
    return robot.brain.workoutRooms.get(room);
  }

  robot._setRoomTimeout = function(room, timeout) {
    let roomStats = robot._getRoomStats(room);
    roomStats.set(TIMEOUT_KEY, timeout);
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
  robot._setExerciseTimeout = function(room) {
    let timeConfig = config.callouts.timeBetween;

    let time = random.integer(timeConfig.minTime, timeConfig.maxTime);
    let multiplier = (TIME_MULTIPLIERS.has(timeConfig.units)) ?
                        TIME_MULTIPLIERS.get(timeConfig.units) : 60;

    let timeout = setTimeout(function() {
      robot._runExercise(room);
    }, time * multiplier * 1000);
    robot._setRoomTimeout(room, timeout);
    robot.messageRoom(room, `Next workout starting in ${time} ${timeConfig.units}!`);
  };

  robot.respond('/start/i', function(res) {
    robot.messageRoom(res.envelope.room, 'Starting the Workout counters! 🏋');
    robot._setExerciseTimeout(res.envelope.room);
  });

  robot.respond('/stop/i', function(res) {
    let roomStats = robot._getRoomStats(res.envelope.room);
    if (roomStats.has(TIMEOUT_KEY)) clearTimeout(roomStats.get(TIMEOUT_KEY));
    robot.messageRoom(res.envelope.room, 'Stopping the Workout counters! 🛀');
  });

  robot.respond('/stats/i', function(res) {
    robot.messageRoom(res.envelope.room, robot.brain.stats);
  });
};
