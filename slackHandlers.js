// This is the place for all requests to the Slack API
var bugsnag = require('@bugsnag/js');
const bugsnagClient = bugsnag('c69a52cb2a5e0676d817d567ff3d34ed');
const request = require('request');
const settingsUserHandler = require('./settingsUserHandler');

// Posts the given message in the given channel on Slack
module.exports.chatPostMessage = function(message, channel, attachments=undefined){

    let body;
    if(attachments) {
        body = {
            "text": message,
            "channel": channel,
            "attachments": attachments
        }
    } else {
        body = {
            "text": message,
            "channel": channel
        }
    }

    let clientServerOptions = {
        uri: 'https://slack.com/api/chat.postMessage',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.BOT_USER_OAUTH_ACCESS_TOKEN}`
        },
        body: JSON.stringify(body)
    }

    request(clientServerOptions, (err) => {
        if(err) bugsnagClient.notify(new Error(err));
    });

}

// Gets Slacks user list
module.exports.getSlackUsersList = async function() {

    return new Promise((resolve, reject) => {

        let clientServerOptions = {
            uri: 'https://slack.com/api/users.list',
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.BOT_USER_OAUTH_ACCESS_TOKEN}`
            }
        }
    
        request(clientServerOptions, (err, result) => {

            if(err) {
                bugsnagClient.notify(new Error(err));
                return reject("no user list");      
            }

            let body = JSON.parse(result.body);
            let usersList = [];
            console.log(body);

            // UPDATES THE USERS IN THE DATABASE
            settingsUserHandler.init(body);

            for(let i = 0; i < body.members.length; i++) {

                if(body.members[i].id !== "USLACKBOT" && !body.members[i].is_bot) {
                    usersList.push({
                        userID: body.members[i].id,
                        username: body.members[i].name
                    });
                }
                    
            }
            console.log(usersList);

            return resolve(usersList);

        });

    })

}

module.exports.getSlackUsernameById = async function(userID) {
    
    return new Promise((resolve, reject) => {

        let clientServerOptions = {
            uri: 'https://slack.com/api/users.list',
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.BOT_USER_OAUTH_ACCESS_TOKEN}`
            }
        }
    
        request(clientServerOptions, (err, result) => {

            if(err) {
                bugsnagClient.notify(new Error(err));
                return reject("No user list...");      
            }

            let body = JSON.parse(result.body);

            for(let i = 0; i < body.members.length; i++) {

                if(body.members[i].id == userID) {
                    return resolve(body.members[i].name);
                }
                    
            }

            return reject("No user with this id in user list..."); 

        });

    })
    
}