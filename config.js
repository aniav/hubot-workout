var extend = require('extend');

// Default Config
var defaultConfig = {
  officeHours: {
    begin: 9,
    end: 17
   },

  callouts: {
    timeBetween: {
      minTime: 17,
      maxTime: 23,
      units: "minutes"
    },
    numUsers: 3
  },

  exercises: [
    {
      slug: "pushup",
      name: "pushups",
      minReps: 15,
      maxReps: 20
    },
    {
      slug: "plank",
      name: "plank",
      minReps: 40,
      maxReps: 60,
      units: "seconds"
    },
    {
      slug: "wall-sit",
      name: "wall sit",
      minReps: 40,
      maxReps: 50,
      units: "seconds"
    },
    {
      slug: "chair-dip",
      name: "chair dips",
      minReps: 15,
      maxReps: 30
    },
    {
      slug: "calf-rise",
      name: "calf raises",
      minReps: 20,
      maxReps: 30
    }
  ]
};


// Overwrite defaults with Local Config
var localConfig = extend({}, defaultConfig);
try {
  extend(true, localConfig, require('./config.local.js'));
} catch (e) {
  console.log('Error while loading local config');
}

// Exports
module.exports = localConfig;

