require('dotenv').config();
const express = require('express');
const request = require('request');
const mongoose = require('mongoose');
var app = express();

// Bodyparser middleware
var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Database models
const EmployeeOfTheMonth = require('./models/employeeOfTheMonth.js');

// Database connection
mongoose.connect(`mongodb://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}/${process.env.DB_NAME}`, { 
	useNewUrlParser: true,
}).then(result => console.log("Connected to the database."))
.catch(err => console.log("Something went wrong when connecting to the database."));

// TTBOT points emoticon
const emoticon = ":medal:"

function userMentioned(text) {

    if(text.includes("<@")) return true;
    return false;
    
}

function emoticonUsed(text) {

    if(text.includes(emoticon)) return true;
    return false;

}

function getAmountOfPoints(text) {

    let regex = new RegExp(emoticon, "g");
    let count = (text.match(regex) || []).length;

    return count

}

function getMentionedUserId(text) {

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

app.post("/", function(req, res) {

    let data = req.body;

    if(data.challenge) {

        // FOR EVENT AUTHORIZATION (DOCS: https://api.slack.com/bot-users)
        res.type('text/plain'); 
        res.send(data.challenge);
        return;

    }

    console.log(`\n${data}`);

    if(data.event.type === "app_mention") {
        // console.log('app was mentioned');

        handleCommands(data);

    } else if(data.event.type === "message") {
        // console.log('message was sent');

        let text = getTextMessage(data);

        if(emoticonUsed(text) && userMentioned(text)) {
            // console.log('point was given');
 
            handlePoints(data);
     
        }

    }

    res.sendStatus(200);

});

function getTextMessage(data) {

    let text = "";

    if(data.event.subtype && data.event.subtype === "message_changed") {
        text = data.event.message.text;
    } else {
        text = data.event.text;
    }

    return text;

}

function getScoreBoard(data) {

    let date = new Date();
    let dateString = `${date.getMonth()}/${date.getFullYear()}`;

    EmployeeOfTheMonth.findOne({ month: dateString })
    .then(async result => {

        if(result === null) { return chatPostMessage("This month there are no points given yet.", data.event.channel)}

        let output = "";
        let usersList = await getSlackUsersList();

        // Sorting employees by score
        result.employees.sort(function(a, b) { return b.points - a.points });

        for(let i = 0; i < result.employees.length; i++) {

            let username = "";
            for(let j = 0; j < usersList.length; j++) {
                if(result.employees[i].userID === usersList[j].userID) {
                    username = usersList[j].username;
                    break;
                }
            }

            output += `- ${username}: ${result.employees[i].points}\n`;

        }

        return chatPostMessage(output, data.event.channel);

    })
    .catch(err => {
        console.log(err);
        return chatPostMessage("Something went wrong searching the database", data.event.channel);
    })

}

function handlePoints(data) {

    let mentionedUserId = getMentionedUserId(getTextMessage(data));

    if(mentionedUserId === data.event.user) return chatPostMessage("You can't give points to yourself. Nice try.", data.event.channel);

    let amountOfPoints = getAmountOfPoints(getTextMessage(data));
    let date = new Date();
    let dateString = `${date.getMonth()}/${date.getFullYear()}`;

    EmployeeOfTheMonth.findOne({ month: dateString })
    .then(async result => {

        let month;

        if(result === null) {
            // console.log("Initializing new month...");

            month = await initNewMonth(dateString);

        } else {
            // console.log("Already an object for this month.");

            month = result;

        }

        await addPointsToUser(month, mentionedUserId, amountOfPoints);

    })
    .catch(err => {
        console.log(err);
    })

}

async function addPointsToUser(month, userID, amountOfPoints) {

    return new Promise((resolve, reject) => {

        for(let i = 0; i < month.employees.length; i++) {

            if(month.employees[i].userID === userID) {
    
                month.employees[i].points += amountOfPoints;
    
            }
    
        }
        
        month.save()
        .then(result => {
            // console.log('points added');
            return resolve();
        })
        .catch(err => {
            console.log(err);
            return reject();
        })

    })

}

async function getSlackUsersList() {

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

async function initNewMonth(date) {

    return new Promise(async (resolve, reject) => {

        let usersList = await getSlackUsersList();

        let employees = [];

        for(let i = 0; i < usersList.length; i++) {

            employees.push({
                _id: mongoose.Types.ObjectId(),
                userID: usersList[i].userID,
                points: 0
            })

        }

        let month = new EmployeeOfTheMonth({
            _id: mongoose.Types.ObjectId(),
            month: date,
            employees: employees
        });
    
        month.save()
        .then(result => {
            resolve(result);
        })
        .catch(err => {
            console.log(err);
            reject();
        })

    })

}

function chatPostMessage(message, channel){

    let clientServerOptions = {
        uri: 'https://slack.com/api/chat.postMessage',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.BOT_USER_OAUTH_ACCESS_TOKEN}`
        },
        body: JSON.stringify({
            "text": message,
            "channel": channel,
        })
    }

    request(clientServerOptions, (err) => {
        if(err) console.log("Something went wrong posting the message.\n", err);
    });

}

function handleCommands(data) {

    let message = data.event.text;

    let args = message.split(" ");
	let command = args[1].toLowerCase();

    switch(command) {

        case "score":
            getScoreBoard(data);
            break;

        default:
            break;

    }

}

var server = app.listen(process.env.PORT, function() {
    var port = server.address().port;
    console.log('Server started on port', port, '...');
});