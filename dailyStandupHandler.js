// Here every function that's connected to the DailyStandupUser collection is located.

const mongoose = require('mongoose');
const EmployeeOfTheMonth = require('./models/dailyStandupUser.js');

const helpers = require('./helpers');
const slackHandlers = require('./slackHandlers');

module.exports.possiblyInit = async function(data) {
    console.log('Initializing daily standup');

    if(helpers.isWorkDay() && helpers.isTimeToStop()) {
        console.log('issa daily standup time');
    } else {
        console.log('issa not daily standup time');
        // return;
    }

}

module.exports.addDailyStandupUser = async function(userID) {

    return new Promise((resolve, reject) => {

        let dailyStandupUser = {
            _id: mongoose.Types.ObjectId(),
            userID: userID,
            standups: [],
        }

        dailyStandupUser.save()
        .then(result => {
            resolve('ok');
        })
        .catch(err => {
            console.log('Something went wrong', err);
            reject();
        })

    })

    

}
