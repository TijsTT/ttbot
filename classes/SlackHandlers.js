const axios = require('axios');
const bugsnagClient = require('../bugsnagClient');
console.log(bugsnagClient);

const SettingsUserHandler = require('./SettingsUserHandler');

module.exports = class SlackHandlers {

    // Returns the necessary headers for the axios requests
    static getHeaders() {
        return { 
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.BOT_USER_OAUTH_ACCESS_TOKEN}`
            } 
        }
    }

    // Posts the given message in the given channel on Slack
    static chatPostMessage(message, channel, attachments=undefined) {

        let body = {
            "text": message,
            "channel": channel
        }

        if(attachments) body.attachments = attachments;
    
        axios.post('https://slack.com/api/chat.postMessage', body, this.getHeaders())
        .catch((err) => {
            bugsnagClient.notify(new Error(err));
        });

    }

    // Posts the given message in the given channel on Slack as hidden message
    static chatPostEphemeralMessage(message, channel, userID, attachments=undefined){

        let body = {
            "text": message,
            "channel": channel,
            "user": userID
        }

        if(attachments) body.attachments = attachments;

        axios.post('https://slack.com/api/chat.postEphemeral', body, this.getHeaders())
        .catch((err) => {
            bugsnagClient.notify(new Error(err));
        })

    }

    // Gets Slacks user list
    static async getSlackUsersList() {

        return new Promise((resolve, reject) => {

            axios.get('https://slack.com/api/users.list', this.getHeaders())
            .then(result => {

                let data = result.data,
                    usersList = [];

                // UPDATES THE USERS IN THE DATABASE
                SettingsUserHandler.init(data);

                for(let i = 0; i < data.members.length; i++) {

                    if(!Helpers.checkIfUserIsBot(data.members[i])) {
                        usersList.push({
                            userID: data.members[i].id,
                            username: data.members[i].name
                        });
                    }
                        
                }

                return resolve(usersList);

            }).catch(err => {
                bugsnagClient.notify(new Error(err));
                return reject("no user list"); 
            });

        });

    }

    static async getSlackUsernameById(userID) {
    
        return new Promise((resolve, reject) => {
    
            axios.get('https://slack.com/api/users.list', this.getHeaders())
            .then(result => {
    
                let data = result.data;
    
                if(data.ok) {
    
                    for(let i = 0; i < data.members.length; i++) {
    
                        if(data.members[i].id == userID) {
                            return resolve(data.members[i].name);
                        }
                            
                    }
    
                } else {
    
                    console.log(`data.ok error: ${data.error}`);
                    return resolve('someone');
    
                }
    
                return reject("No user with this id in user list...");
    
            }).catch(err => {
                bugsnagClient.notify(new Error(err));
                return reject("no user list"); 
            });
    
        })
        
    }

}
