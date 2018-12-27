const settings = require('./settings');
const request = require('request');

module.exports.userMentioned = function(text) {

    if(text.includes("<@")) return true;
    return false;
    
}

module.exports.emoticonUsed = function(text) {

    if(text.includes(settings.emoticon)) return true;
    return false;

}

module.exports.getAmountOfPoints = function(text) {

    let regex = new RegExp(settings.emoticon, "g");
    let count = (text.match(regex) || []).length;

    return count

}

module.exports.getMentionedUserId = function(text) {

    let strippingID = false;
    let id = "";

    for(let i = 0; i < text.length; i++) {

        if(text[i-2] && text[i-2] === "<" && text[i-1] && text[i-1] === "@") {
            strippingID = true;
        } else if(text[i] === ">") {
            strippingID = false;
        }

        if(strippingID) id += text[i];

    }

    return id;

}

module.exports.getTextMessage = function(data) {

    let text = "";

    if(data.event.subtype && data.event.subtype === "message_changed") {
        text = data.event.message.text;
    } else {
        text = data.event.text;
    }

    return text;

}

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
        if(err) console.log("Something went wrong posting the message.\n", err);
    });

}

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
                console.log("Something went wrong while getting the users list.\n", err);
                return reject("no list");      
            }

            let body = JSON.parse(result.body);
            let usersList = [];

            for(let i = 0; i < body.members.length; i++) {

                if(body.members[i].id !== "USLACKBOT" && !body.members[i].is_bot) {
                    usersList.push({
                        userID: body.members[i].id,
                        username: body.members[i].name
                    });
                }
                    
            }

            return resolve(usersList);

        });

    })

}