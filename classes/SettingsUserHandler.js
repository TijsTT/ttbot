const mongoose = require('mongoose');
const bugsnagClient = require('../bugsnagClient');

const settingsUser = require('../models/settingsUser');

const SlackHandler = require('./SlackHandlers');
const Helpers = require('./Helpers');

module.exports = class SettingsUserHandler {

    // Checks if de settingsUser collections exists
    // If it exists, it will update the collection
    // If not, it will create a settingsUser collection
    static async init(data) {

        settingsUser.find()
        .then((result) => {
            result ? this.updateSettingsUsers(data, result) : this.createSettingsUsers(data);
        }).catch((err) => {
            bugsnagClient.notify(new Error(err));
        })

    }

    static createSettingsUsers(data) {

        let users = data.members;
        
        for(let i = 0; i < users.length; i++) {
    
            if(Helpers.checkIfUserIsBot(users[i])) continue;
    
            this.createNewSettingsUser(users[i].id, users[i].name);
    
        }
    
    }

    static createNewSettingsUser(userID, username) {

        let newSettingsUser = new settingsUser({
            _id: mongoose.Types.ObjectId(),
            emoticon: ":medal:",
            userID: userID,
            username: username
        });
    
        newSettingsUser.save()
        .then((result) => {
            console.log('New settingsUser was saved to the database.');
        }).catch((err) => {
            bugsnagClient.notify(new Error(err));
        })
    
    }

    static updateSettingsUsers(data, settingsUsers) {

        let users = data.members;
    
        for(let i = 0; i < users.length; i++) {
    
            if(Helpers.checkIfUserIsBot(users[i])) continue;
    
            let isNewUser = true;
    
            for(let j = 0; j < settingsUsers.length; j++) {
                if(users[i].id === settingsUsers[j].userID) {
                    isNewUser = false;
                }
            }
    
            if(isNewUser) this.createNewSettingsUser(users[i].id, users[i].name);
    
        }
    
    }

    static changeSettingsUserEmoticon(userID, emoticon) {

        settingsUser.findOne({ userID: userID })
        .then((result) => {
    
            if(!result) return SlackHandler.chatPostMessage(`For some reason you're not in our user list <@${userID}>. Who are you and what are you doing here!?`, process.env.BOT_CHANNEL);
    
            result.emoticon = emoticon;
    
            result.save()
            .then(() => {
                return SlackHandler.chatPostMessage(`Successfully changed ${result.username}'s emoticon to ${emoticon}`, process.env.BOT_CHANNEL);
            })
            .catch((err) => {
                bugsnagClient.notify(new Error(err));
            })
    
        }).catch((error) => {
            bugsnagClient.notify(new Error(error));
        })
    
    }

    static async getSettingsUserEmoticon(userID) {

        return new Promise((resolve, reject) => {
    
            settingsUser.findOne({ userID: userID })
            .then((result) => {
    
                if(!result) {
                    if(userID !== process.env.BOT_ID) console.log(`For some reason you're not in our user list <@${userID}>. Who are you and what are you doing here!?`);
                    return resolve(':nooneisevergonnausethisasemoticon:');
                }
                
                return resolve(result.emoticon);
    
            }).catch((err) => {
                bugsnagClient.notify(new Error(err));
                return reject();
            });
    
        })
    
    }

    static async postAllSettingsUserEmoticons() {

        return new Promise((resolve, reject) => {
    
            settingsUser.find()
            .then((result) => {
    
                // TO BE CONTINUED...
    
                return resolve();
    
            }).catch((err) => {
                bugsnagClient.notify(new Error(err));
                return reject();
            });
    
        })
    
    }

}