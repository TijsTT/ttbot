require('dotenv').config();
const express = require('express');
const request = require('request');
const mongoose = require('mongoose');
const cron = require('node-cron');

var app = express();

var bugsnag = require('@bugsnag/js');
const bugsnagClient = bugsnag('c69a52cb2a5e0676d817d567ff3d34ed');

const helpers = require('./helpers');
const slackHandlers = require('./slackHandlers');
const dailyStandupHandler = require('./dailyStandupHandler');
const settingsUsersHandler = require('./settingsUserHandler');

// Bodyparser middleware
var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Database connection
mongoose.connect(`mongodb://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}/${process.env.DB_NAME}`, { 
	useNewUrlParser: true,
}).then(result => console.log("Connected to the database."))
.catch(err => bugsnagClient.notify(new Error(err)));

const employeeOfTheMonthHandlers = require('./employeeOfTheMonthHandlers'); 

app.post("/", async function(req, res) {

    let data = req.body;
    let userID = helpers.getUserId(data);

    handleSlackAuthorization(data, res);

    if(data.event.subtype && data.event.subtype === 'bot_message') return;
    if(userID === undefined) return;

    // log the incoming message
    console.log('\n', data);

    // if the message contained a mention
    if(data.event.type === "app_mention") {

        return handleCommands(data);

    // if the message is a standard message
    } else if(data.event.type === "message") {

        let text = helpers.getTextMessage(data);

        // if a point was given
        if(await helpers.emoticonUsed(text, userID) && helpers.userMentioned(text)) {
            return employeeOfTheMonthHandlers.init(data);
        }

    }

});

// Handles all possible commands
async function handleCommands(data) {

    let message = helpers.getTextMessage(data);
    let args = message.split(" ");

    if(!args[1]) return;

    switch(args[1].toLowerCase()) {

        case "help":
            postCommands(data.event.channel, helpers.getUserId(data));
            break;

        case "score":
            let date = new Date();
            let currentMonth = `${date.getMonth()}/${date.getFullYear()}`;
            employeeOfTheMonthHandlers.getScoreBoard(data.event.channel, currentMonth);
            break;

        case "emoticon":
            if(args[2]) settingsUsersHandler.changeSettingsUserEmoticon(helpers.getUserId(data), args[2]);
            else {
                let userID = helpers.getUserId(data);
                let userEmoticon = await settingsUsersHandler.getSettingsUserEmoticon(userID);
                slackHandlers.chatPostEphemeralMessage(`Your emoticon is ${userEmoticon}`, data.event.channel, userID);
            }
            break;
        case "emojilist":
            settingsUsersHandler.postAllSettingsUserEmoticons();
            break;

        case "tell":
            if(args[2].toLowerCase() === "me" && args[3].toLowerCase() === "a" && args[4].toLowerCase() === "joke") postRandomJoke(data.event.channel);
            break;
        
        // case "nooneisevergonnausethiscommandinit":
        //     slackHandlers.getSlackUsersList();
        //     break;

        // case "dailystandupuser":
        //     let dailyStandupUserID = await helpers.getMentionedUsersId(helpers.getTextMessage(data))[0];
        //     dailyStandupHandler.addDailyStandupUser(dailyStandupUserID);
        //     break;

        default:
            break;

    }

}

function handleSlackAuthorization(data, res) {
    if(data.challenge) {
        res.type('text/plain'); 
        res.send(data.challenge);
        return;
    } else {
        res.sendStatus(200);
    }
}

function postRandomJoke(channel) {

    // let clientServerOptions = {
    //     uri: 'https://icanhazdadjoke.com/slack',
    //     method: 'GET'
    // }

    // request(clientServerOptions, (err, result) => {

    //     if(err) {
    //         bugsnagClient.notify(new Error(err));
    //         return slackHandlers.chatPostMessage("The joke is a lie.", channel);
    //     }

    //     let joke = JSON.parse(result.body);
    //     return slackHandlers.chatPostMessage(joke.attachments[0].text, channel);

    // }); 

    axios.get('https://icanhazdadjoke.com/slack')
    .then(result => {
        let joke = JSON.parse(result.body);
        return slackHandlers.chatPostMessage(joke.attachments[0].text, channel);
    })
    .catch(err => {
        bugsnagClient.notify(new Error(err));
        return slackHandlers.chatPostMessage("The joke is a lie.", channel);
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

    let emoticon = await settingsUsersHandler.getSettingsUserEmoticon(userID);

    output += `\nTo thank employees for being awesome, you can award them by giving them a ${emoticon}\nJust mention the person (@person) and add as many ${emoticon} emojis to the message as you want to give them that many points!`

    return slackHandlers.chatPostEphemeralMessage(output, channel, userID);

}

// Interval loop to prevent server from going into sleep mode
cron.schedule('*/5 * * * *', () => {
    console.log('Pinging server so it doesn\'t go to sleep...');
    request({ uri: 'https://ttbot-slack.herokuapp.com/', method: 'GET' }, (err) => {
        if(err) bugsnagClient.notify(new Error(err));;
    })
});

cron.schedule('0 9 * * 1', () => {
    let date = new Date();
    if(date.getDate() < 8) employeeOfTheMonthHandlers.announceWinners();
});

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