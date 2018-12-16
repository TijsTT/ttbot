require('dotenv').config();
const express = require('express');
var app = express();

var bodyParser = require('body-parser');
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

// FOR EVENT AUTHORIZATION (DOCS: https://api.slack.com/bot-users)
// app.post('/', function(req, res) {
//     console.log(req.body.challenge);
//     res.type('text/plain'); 
//     res.send(req.body.challenge);
// });

var request = require('request');

function chatPostMessage(data, message){

    var clientServerOptions = {
        uri: 'https://slack.com/api/chat.postMessage',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.BOT_USER_OAUTH_ACCESS_TOKEN}`
        },
        body: JSON.stringify({
            "text": `<@${data.event.user}> ${message}`,
            "channel": data.event.channel,
        })
    }

    request(clientServerOptions, (err) => {
        if(err) console.log("Something went wrong posting the message.\n", err);
    });

}

app.post("/", function(req, res, next) {

    let data = req.body;

    if(data.event.type === "app_mention") {
        if(data.event.text.includes("ping")) {
            // Make call to chat.postMessage using bot's token
            chatPostMessage(data, "Pong!");
        }
    } else if(data.event.type === "message") {
        console.log("Message was sent");
    }

    res.sendStatus(200);

});

var server = app.listen(process.env.PORT, function() {
    var port = server.address().port;
    console.log('Server started on port', port, '...');
});