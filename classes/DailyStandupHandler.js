const mongoose = require('mongoose');
const dailyStandupUser = require('../models/dailyStandupUser.js');

const helpers = require('./Helpers');

module.exports.possiblyInit = async function(data) {
    console.log('Initializing daily standup');

    if(helpers.isWorkDay() && helpers.isTimeToStop()) {
        console.log('issa daily standup time');
    } else {
        console.log('issa not daily standup time');
        return;
    }

}

module.exports.addDailyStandupUser = async function(userID) {

    return new Promise((resolve, reject) => {

        let standupUser = new dailyStandupUser({
            _id: mongoose.Types.ObjectId(),
            userID: userID,
            standups: [],
        });

        standupUser.save()
        .then(result => {
            resolve('ok');
        })
        .catch(err => {
            console.log('Something went wrong adding a new daily standup user', err);
            reject();
        })

    })

    

}
