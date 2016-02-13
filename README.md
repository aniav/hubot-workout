Hubot workout
======

This is a workout bot designed to keep you moving a bit at work.
The main idea is to randomly pick people from your team and force them to do a
few push-ups or wall-sits (yes, I also didn't know what this is to begin with).

Functionality
------

Currently implemented
* starting/stoping the bot by writing to him on a channel
* drawing users from a channel he has been started on (choosing only from active, full members will)
* saving statistics of workouts for specific channels
* drawing exercises only in working days and working hours

Running
------

To run the bot you need to provide the slack token:
```
HUBOT_SLACK_TOKEN=your_slack_token bin/hubot --adapter slack
```

The workouts will not start automatically, you need to invite hubot to a
channel and tell him to start the counters. Stoping him is also done with a command.

![Hubot starting & stoping](https://cloud.githubusercontent.com/assets/182546/13026783/7fb914a6-d234-11e5-8bdf-44b09dc2141c.png)


History
-------
The project was initially inspired by the great idea behind [slackbot-workout](https://github.com/brandonshin/slackbot-workout) and some of the main concepts are still the same.
