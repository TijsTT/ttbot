require('dotenv').config();
const express = require('express');
const request = require('request');
const mongoose = require('mongoose');

const helpers = require('./helpers');
const settings = require('./settings');

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

function handleCommands(data) {

    let message = data.event.text;

    let args = message.split(" ");
	let command = args[1].toLowerCase();

    switch(command) {

        case "score":
            employeeOfTheMonthHandlers.getScoreBoard(data.event.channel);
            break;

        default:
            break;

    }

}

var server = app.listen(process.env.PORT, function() {
    var port = server.address().port;
    console.log('Server started on port', port, '...');
});