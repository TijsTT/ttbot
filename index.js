require('dotenv').config();
require('./cronTasks');

const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const bugsnagClient = require('./bugsnagClient');

const Helpers = require('./classes/Helpers');
const SlackHandlers = require('./classes/SlackHandlers');
const SettingsUsersHandler = require('./classes/SettingsUserHandler');
const EmployeeOfTheMonthHandlers = require('./classes/EmployeeOfTheMonthHandlers'); 

// Database connection
mongoose.connect(`mongodb://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}/${process.env.DB_NAME}`, { 
	useNewUrlParser: true,
}).then(result => console.log("Connected to the database."))
.catch(err => bugsnagClient.notify(new Error(err)));

// Starting app
var app = express();

// Bodyparser middleware
var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.post("/", async function(req, res) {

    let data = req.body;

    if(handleSlackAuthorization(data, res)) return;

    let userID = Helpers.getUserId(data);

    if(data.event.subtype && data.event.subtype === 'bot_message') return;
    if(userID === undefined) return;

    // log the incoming message
    console.log('\n', data);

    // if the message contained a mention
    if(data.event.type === "app_mention") {

        return handleCommands(data);

    // if the message is a standard message
    } else if(data.event.type === "message") {

        let text = Helpers.getTextMessage(data);

        // if a point was given
        if(await Helpers.emoticonUsed(text, userID) && Helpers.userMentioned(text)) {
            return EmployeeOfTheMonthHandlers.init(data);
        }

    }

});

// Handles all possible commands
async function handleCommands(data) {

    let message = Helpers.getTextMessage(data);
    let args = message.split(" ");

    if(!args[1]) return;

    switch(args[1].toLowerCase()) {

        case "help":
            postCommands(data.event.channel, Helpers.getUserId(data));
            break;

        case "score":
            let date = new Date();
            let currentMonth = `${date.getMonth()}/${date.getFullYear()}`;
            EmployeeOfTheMonthHandlers.getScoreBoard(data.event.channel, currentMonth);
            break;

        case "emoticon":
            if(args[2]) SettingsUsersHandler.changeSettingsUserEmoticon(Helpers.getUserId(data), args[2]);
            else {
                let userID = Helpers.getUserId(data);
                let userEmoticon = await SettingsUsersHandler.getSettingsUserEmoticon(userID);
                SlackHandlers.chatPostEphemeralMessage(`Your emoticon is ${userEmoticon}`, data.event.channel, userID);
            }
            break;

        case "emojilist":
            SettingsUsersHandler.postAllSettingsUserEmoticons();
            break;

        case "tell":
            if(args[2].toLowerCase() === "me" && args[3].toLowerCase() === "a" && args[4].toLowerCase() === "joke") postRandomJoke(data.event.channel);
            break;
        
        // case "nooneisevergonnausethiscommandinit":
        //     SlackHandlers.getSlackUsersList();
        //     break;

        default:
            break;

    }

}

function handleSlackAuthorization(data, res) {
    if(data.challenge) {
        res.type('text/plain'); 
        res.send(data.challenge);
        return true;
    } else {
        res.sendStatus(200);
        return false;
    }
}

function postRandomJoke(channel) {

    axios.get('https://icanhazdadjoke.com/slack')
    .then((response) => {
        let joke = response.data.attachments[0].text;
        return SlackHandlers.chatPostMessage(joke, channel);
    })
    .catch((err) => {
        bugsnagClient.notify(new Error(err));
        return SlackHandlers.chatPostMessage("The joke is a lie.", channel);
    });

}

// Posts all commands when user asks for help
async function postCommands(channel, userID) {

    let commands = [
        { command: "score", description: "Returns the score for the employee of the month." },
        { command: "tell me a joke", description: "You like dad jokes? This one is for you." },
        { command: "emoticon :YOUR_EMOTICON:", description: "Change your emoticon to whatever you like." }
    ];

    let output = "";

    for(let i = 0; i < commands.length; i++) {
        output += `- @TTBOT ${commands[i].command} - ${commands[i].description}\n`
    }

    let emoticon = await SettingsUsersHandler.getSettingsUserEmoticon(userID);

    output += `\nTo thank employees for being awesome, you can award them by giving them a ${emoticon}\nJust mention the person (@person) and add as many ${emoticon} emojis to the message as you want to give them that many points!`

    return SlackHandlers.chatPostEphemeralMessage(output, channel, userID);

}

// Make sure that the ping request doesn't return a 404 status
app.get('/', function(req, res) {
    res.sendStatus(200);
})

var server = app.listen(process.env.PORT, function() {
    var port = server.address().port;
    console.log('Server started on port', port, '...');
});