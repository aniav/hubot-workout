var extend = require('extend')

// Default Config
var defaultConfig = {
  channelId: "general",

  officeHours: {
    "begin": 9,
    "end": 17
   },

  callouts: {
    timeBetween: {
      "minTime": 17,
      "maxTime": 23,
      "units": "minutes"
    },
    "numPeople": 3,
    "slidingWindowSize": 8,
    "groupCalloutChance": 0.05
  },

  exercises: [
    {
      "id": 0,
      "name": "pushups",
      "minReps": 15,
      "maxReps": 20,
      "units": "rep"
    },
    {
      "id": 1,
      "name": "planks",
      "minReps": 40,
      "maxReps": 60,
      "units": "second"
    },
    {
      "id": 2,
      "name": "wall sit",
      "minReps": 40,
      "maxReps": 50,
      "units": "second"
    },
    {
      "id": 3,
      "name": "chair dips",
      "minReps": 15,
      "maxReps": 30,
      "units": "rep"
    },
    {
      "id": 4,
      "name": "calf raises",
      "minReps": 20,
      "maxReps": 30,
      "units": "rep"
    }
  ]
}


// Overwrite defaults with Local Config
var localConfig = extend({}, defaultConfig)
try {
  extend(true, localConfig, require('./config.local.js'))
} catch (e) {}

// Exports
console.log('Loaded Config', localConfig)
module.exports = localConfig

