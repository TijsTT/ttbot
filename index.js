require('dotenv').config();
const express = require('express');
const request = require('request');
const mongoose = require('mongoose');
const cron = require('node-cron');

const helpers = require('./helpers');
const slackHandlers = require('./slackHandlers');
const dailyStandupHandler = require('./dailyStandupHandler');
const settingsUsersHandler = require('./settingsUserHandler');

var app = express();

// Bodyparser middleware
var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Database connection
mongoose.connect(`mongodb://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}/${process.env.DB_NAME}`, { 
	useNewUrlParser: true,
}).then(result => console.log("Connected to the database."))
.catch(err => console.log("Something went wrong when connecting to the database."));

const employeeOfTheMonthHandlers = require('./employeeOfTheMonthHandlers'); 

app.post("/", async function(req, res) {

    let data = req.body;

    if(data.challenge) {

        // FOR EVENT AUTHORIZATION (DOCS: https://api.slack.com/bot-users)
        res.type('text/plain'); 
        res.send(data.challenge);
        return;

    } else {
        res.sendStatus(200);
    }

    if(data.event.subtype && data.event.subtype === 'bot_message') return;

    console.log('\n', data);

    // if the message contained a mention
    if(data.event.type === "app_mention") {

        return handleCommands(data);

    // if the message is a standard message
    } else if(data.event.type === "message") {

        let text = helpers.getTextMessage(data);

        // if a point was given
        if(await helpers.emoticonUsed(text, helpers.getUserId(data)) && helpers.userMentioned(text)) {

            return employeeOfTheMonthHandlers.init(data);
     
        }

    }


});

// Handles all possible commands
async function handleCommands(data) {

    let message = helpers.getTextMessage(data);

    let args = message.split(" ");
	let command = args[1].toLowerCase();

    switch(command) {

        case "help":
            postCommands(data.event.channel, helpers.getUserId(data));
            break;

        case "score":
            employeeOfTheMonthHandlers.getScoreBoard(data.event.channel);
            break;

        case "emoticon":
            settingsUsersHandler.changeSettingsUserEmoticon(helpers.getUserId(data), args[2]);
            break;

        case "joke":
            postRandomJoke(data.event.channel);
            break;

        case "dailystandupuser":
            let dailyStandupUserID = await helpers.getMentionedUserId(helpers.getTextMessage(data));
            dailyStandupHandler.addDailyStandupUser(dailyStandupUserID);
            break;

        default:
            break;

    }

}

function postRandomJoke(channel) {

    let clientServerOptions = {
        uri: 'https://icanhazdadjoke.com/slack',
        method: 'GET'
    }

    request(clientServerOptions, (err, result) => {

        if(err) return "Something went wrong getting a joke.";

        let joke = JSON.parse(result.body);
        return slackHandlers.chatPostMessage(joke.attachments[0].text, channel);

    }); 

}

// Posts all commands when user asks for help
async function postCommands(channel, userID) {

    let commands = [
        { command: "score", description: "Returns the score for the employee of the month." },
        { command: "joke", description: "You like dad jokes? This one is for you." },
        { command: "emoticon :YOUR_EMOTICON:", description: "Change your emoticon to whatever you like." }
    ];

    let output = "";

    for(let i = 0; i < commands.length; i++) {
        output += `- @TTBOT ${commands[i].command} - ${commands[i].description}\n`
    }

    let emoticon = await settingsUsersHandler.getSettingsUserEmoticon(userID);

    output += `\nTo thank employees for being awesome, you can award them by giving them a ${emoticon}\nJust mention the person (@person) and add as many ${emoticon} emojis to the message as you want to give them that many points!`

    return slackHandlers.chatPostMessage(output, channel);

}

// Interval loop to prevent server from going into sleep mode
cron.schedule('*/5 * * * *', () => {
    console.log('Pinging server so it doesn\'t go to sleep...');
    request({ uri: 'https://ttbot-slack.herokuapp.com/', method: 'GET' }, (err) => {
        if(err) console.log('Something went wrong while pinging the ttbot.', err);
    })
});

// This interval will check every hour if the winners can be announced
cron.schedule('* 32 16 18 1', () => {
    employeeOfTheMonthHandlers.announceWinners();
});

// This interval will check every hour if the daily standup should be initiated
cron.schedule('0 0 * * *', () => {
    dailyStandupHandler.possiblyInit();
})

// Make sure that the ping request doesn't return a 404 status
app.get('/', function(req, res) {
    res.sendStatus(200);
})

var server = app.listen(process.env.PORT, function() {
    var port = server.address().port;
    console.log('Server started on port', port, '...');
});