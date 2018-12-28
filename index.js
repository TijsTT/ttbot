require('dotenv').config();
const express = require('express');
const request = require('request');
const mongoose = require('mongoose');

const settings = require('./settings');
const helpers = require('./helpers');
const slackHandlers = require('./slackHandlers');
const dailyStandupHandler = require('./dailyStandupHandler');

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

app.post("/", function(req, res) {

    let data = req.body;

    if(data.challenge) {

        // FOR EVENT AUTHORIZATION (DOCS: https://api.slack.com/bot-users)
        res.type('text/plain'); 
        res.send(data.challenge);
        return;

    } else {
        res.sendStatus(200);
    }

    console.log('\n', data);

    if(data.event.type === "app_mention") {
        // console.log('app was mentioned');

        return handleCommands(data);

    } else if(data.event.type === "message") {
        // console.log('message was sent');

        let text = helpers.getTextMessage(data);

        if(helpers.emoticonUsed(text) && helpers.userMentioned(text)) {
            // console.log('point was given');

            return employeeOfTheMonthHandlers.init(data);
     
        }

    }


});

async function handleCommands(data) {

    let message = data.event.text;

    let args = message.split(" ");
	let command = args[1].toLowerCase();

    switch(command) {

        case "help":
            postCommands(data.event.channel);
            break;

        case "score":
            employeeOfTheMonthHandlers.getScoreBoard(data.event.channel);
            break;

        case "joke":
            postRandomJoke(data.event.channel);
            break;

        case "dailystandupuser":
            let dailyStandupUserID = await helpers.getMentionedUserId(args[2]);
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

function postCommands(channel) {

    let commands = [
        { command: "score", description: "Returns the score for the employee of the month." },
        { command: "joke", description: "You like dad jokes? This one is for you." }
    ];

    let output = "";

    for(let i = 0; i < commands.length; i++) {
        output += `- @TTBOT ${commands[i].command} - ${commands[i].description}\n`
    }

    output += `\nTo thank employees for being awesome, you can award them by giving them a ${settings.emoticon}\nJust mention the person (@person) and add as many ${settings.emoticon} emojis to the message as you want to give them that many points!`

    return slackHandlers.chatPostMessage(output, channel);

}

// Interval loop to prevent server from going into sleep mode
setInterval(() => {
    console.log('Pinging server so it doesn\'t go to sleep...');
    request({ uri: 'https://ttbot-slack.herokuapp.com/', method: 'GET' }, (err) => {
        if(err) console.log('Something went wrong while pinging the ttbot.', err);
    })
}, 300000);

// This interval will check every hour if the winners can be announced
employeeOfTheMonthHandlers.announceWinners();
setInterval(() => {
    employeeOfTheMonthHandlers.announceWinners();
}, 3600000);

// This interval will check every hour if the daily standup should be initiated
dailyStandupHandler.possiblyInit();
setInterval(() => {
    dailyStandupHandler.possiblyInit();
}, 3600000);

// Make sure that the ping request doesn't return a 404 status
app.get('/', function(req, res) {
    res.sendStatus(200);
})

var server = app.listen(process.env.PORT, function() {
    var port = server.address().port;
    console.log('Server started on port', port, '...');
});