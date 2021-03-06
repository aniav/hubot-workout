//  Description:
//    Randomly pick an excercise to throw it to the users
//  Author:
//    aniav <anna.warzecha@gmail.com>
/* @flow */

import config from '../config'
import Random from 'random-js'
import moment from  'moment-business-time'

var random = new Random(Random.engines.mt19937().autoSeed());

const DATE_FORMAT = "dddd, MMMM Do YYYY, h:mm:ss a";
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
  * @return {Map} stats modified
  */
  robot._prefillExerciseStats = function() {
    let stats = {};
    config.exercises.forEach(exercise => {
      if (stats.hasOwnProperty(exercise.slug)) return;

      stats[exercise.slug] = 0;
    });
    return stats;
  }

  /**
  * Runs the actual exercise, saves the stats and starts the counter for next
  *
  * @param {string} room
  * @return null
  */
  robot._runExercise = function(room) {
    let [exercise, reps, units] = robot._drawExercise();

    let selectedUsers = robot._drawUsers(room);
    let userNames = []
    selectedUsers.forEach(user => {
      userNames.push(`@${user.name}`);
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
  * @param {string} room
  * @param {Array} users
  * @param {Object} exercise
  * @param {Number} reps
  * @return null
  */
  robot._saveRoomStats = function(room, users, exercise, reps) {
    let roomStats = robot._getRoomStats(room);
    users.forEach(user => {
      if (!roomStats.hasOwnProperty(user.id)) {
        roomStats[user.id] = robot._prefillExerciseStats();
      }
      let userStats = roomStats[user.id];
      userStats[exercise.slug] += reps;
    });
    // Tell brain to update itself
    robot.brain.save()
  };

  /**
  * Returns room statistice
  *
  * @param {string} room
  * @return {Object} room stats
  */
  robot._getRoomStats = function(room) {
    if (!robot.brain.get('workoutRooms')) robot.brain.set('workoutRooms', {});
    let workoutRooms = robot.brain.get('workoutRooms');
    if (!workoutRooms.hasOwnProperty(room)) {
      workoutRooms[room] = {};
    }
    return workoutRooms[room];
  }

  robot._setRoomTimeout = function(room, timeout) {
    let roomStats = robot._getRoomStats(room);
    roomStats[TIMEOUT_KEY] = timeout;
  }

  /**
  * Sets the Exercise timeout based on the config file.
  * @param {string} room
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
    let timeConfig = robot.brain.get('config').callouts.timeBetween;

    let offset = random.integer(timeConfig.minTime, timeConfig.maxTime);
    let multiplier = (TIME_MULTIPLIERS.has(timeConfig.units)) ?
                        TIME_MULTIPLIERS.get(timeConfig.units) : 60;

    let nextExerciseTime = moment().addWorkingTime(offset, timeConfig.units);
    let nextExerciseTimeout = nextExerciseTime.diff(moment(), 'milliseconds');
    let timeout = setTimeout(function() {
      robot._runExercise(room);
    }, nextExerciseTimeout);
    robot._setRoomTimeout(room, timeout);


    let message = `Next workout starting `;
    if (nextExerciseTime.diff(moment(), 'days') === 0) {
      message += `in ${time} ${timeConfig.units}!`;
    } else {
      message += `on ${nextExerciseTime.format(DATE_FORMAT)}`;
    }
    robot.messageRoom(room, message);
  };


  robot._configureBot = function() {
    if (!robot.brain.get('config')) {
      robot.brain.set('config', Object.assign({}, config));
    }
    let robot_config = robot.brain.get('config');
    if('locale' in robot_config) {
      moment.locale(robot.brain.config.locale);
    }
  }


  robot.respond('/start/i', function(res) {
    robot._configureBot();
    robot.messageRoom(res.envelope.room, 'Starting the Workout counters! 🏋');
    robot._setExerciseTimeout(res.envelope.room);
  });

  robot.respond('/stop/i', function(res) {
    let roomStats = robot._getRoomStats(res.envelope.room);
    if (roomStats.hasOwnProperty(TIMEOUT_KEY)) clearTimeout(roomStats[TIMEOUT_KEY]);
    robot.messageRoom(res.envelope.room, 'Stopping the Workout counters! 🛀');
  });

  robot.respond('/stats/i', function(res) {
    console.log(robot.brain.get('workoutRooms'));
    //robot.messageRoom(res.envelope.room, robot.brain.workoutRooms);
  });
};
