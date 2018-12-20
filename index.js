require('dotenv').config();
const express = require('express');
const request = require('request');
const mongoose = require('mongoose');
var app = express();

// Bodyparser middleware
var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Database connection
const EmployeeOfTheMonth = require('./models/employeeOfTheMonth.js');
mongoose.connect(`mongodb://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}/${process.env.DB_NAME}`, { 
	useNewUrlParser: true,
}).then(result => console.log("Connected to the database."))
.catch(err => console.log("Something went wrong when connecting to the database."));

// FOR EVENT AUTHORIZATION (DOCS: https://api.slack.com/bot-users)
// app.post('/', function(req, res) {
//     console.log(req.body.challenge);
//     res.type('text/plain'); 
//     res.send(req.body.challenge);
// });

// Config
const prefix = "!";
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

    console.log(data);

    if(data.event.type === "app_mention") {
        console.log('app was mentioned');

    } else if(data.event.type === "message") {
        console.log('message was sent');

        if(emoticonUsed(data.event.text) && userMentioned(data.event.text)) {
            console.log('point was given');
 
            handlePoints(data);
     
        }

        handleCommands(data);

    }

    res.sendStatus(200);

});

function handlePoints(data) {

    let mentionedUserId = getMentionedUserId(data.event.text);
    let amountOfPoints = getAmountOfPoints(data.event.text);
    let date = new Date();
    let dateString = `${date.getMonth()}/${date.getFullYear()}`;

    EmployeeOfTheMonth.findOne({ month: dateString })
    .then(async result => {

        let month;

        if(result === null) {
            console.log("Initializing new month...");

            month = await initNewMonth(dateString);

        } else {
            console.log("Already an object for this month.");

            month = result;

        }

        let updatedMonth = await addPointsToUser(month, mentionedUserId, amountOfPoints);

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
    
                month.save()
                .then(result => {
                    console.log('points added');
                    resolve();
                })
                .catch(err => {
                    console.log(err);
                    reject();
                })
    
            }
    
        }

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
                    usersList.push(body.members[i].id);
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
                userID: usersList[i],
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
            console.log(result);
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

    if(message[0] !== prefix) return;

    let args = message.substr(1).split(" ");
	let command = args[0].toLowerCase();

    switch(command) {

        case "ping":
            chatPostMessage("Pong!", data.event.channel);
            break;

        default:
            break;

    }

}

var server = app.listen(process.env.PORT, function() {
    var port = server.address().port;
    console.log('Server started on port', port, '...');
});