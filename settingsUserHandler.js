const mongoose = require('mongoose');
const settingsUser = require('./models/settingsUser');
const slackHandler = require('./slackHandlers');

module.exports.init = function(data) {

    settingsUser.find()
    .then((result) => {
        result ? updateSettingsUsers(data, result) : createSettingsUsers(data);
    })
    .catch((err) => {
        console.log(err);
    })

}

function createSettingsUsers(data) {

    let users = data.members;
    
    for(let i = 0; i < users.length; i++) {

        if(users[i].is_bot || users[i].id === "USLACKBOT") continue;

        createNewSettingsUser(users[i].id, users[i].name);

    }

}

function updateSettingsUsers(data, settingsUsers) {

    let users = data.members;

    for(let i = 0; i < users.length; i++) {

        if(users[i].is_bot || users[i].id === "USLACKBOT") continue;

        let isNewUser = true;

        for(let j = 0; j < settingsUsers.length; j++) {
            if(users[i].id === settingsUsers[j].userID) {
                isNewUser = false;
            }
        }

        if(isNewUser) createNewSettingsUser(users[i].id, users[i].name);

    }

}

function createNewSettingsUser(userID, username) {

    let newSettingsUser = new settingsUser({
        _id: mongoose.Types.ObjectId(),
        emoticon: ":medal:",
        userID: userID,
        username: username
    });

    newSettingsUser.save()
    .then((result) => {
        console.log('New settingsUser was saved to the database.');
    })
    .catch((err) => {
        console.log('Something went wrong saving a new settingsUser...', err);
    })

}

module.exports.changeSettingsUserEmoticon = function(userID, emoticon) {

    settingsUser.findOne({ userID: userID })
    .then((result) => {

        if(!result) return slackHandler.chatPostMessage(`For some reason you're not in our user list <@${userID}>. Who are you and what are you doing here!?`, process.env.BOT_CHANNEL);

        result.emoticon = emoticon;

        result.save()
        .then(() => {
            return slackHandler.chatPostMessage(`Successfully changed ${result.username}'s emoticon to ${emoticon}`, process.env.BOT_CHANNEL);
        })
        .catch((err) => {
            console.log('Something went wrong when changing this settingsUser\'s emoticon...', err);
        })

    })
    .catch((error) => {
        console.log('Something went wrong when searching for this user...', error);
    })

}

module.exports.getSettingsUserEmoticon = async function(userID) {

    return new Promise((resolve, reject) => {

        settingsUser.findOne({ userID: userID })
        .then((result) => {

            if(!result) {
                if(userID !== process.env.BOT_ID) console.log(`For some reason you're not in our user list <@${userID}>. Who are you and what are you doing here!?`);
                return resolve(':nooneisevergonnausethisasemoticon:');
            }

            return resolve(result.emoticon);

        })
        .catch((error) => {
            console.log('Something went wrong when searching for this user...', error);
            return reject();
        });

    })

}