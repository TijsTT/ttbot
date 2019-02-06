// Here every function that's connected to the EmployeeOfTheMonth collection is located.
var bugsnag = require('@bugsnag/js');
const bugsnagClient = bugsnag('c69a52cb2a5e0676d817d567ff3d34ed');
const mongoose = require('mongoose');
const EmployeeOfTheMonth = require('./models/employeeOfTheMonth.js');

const helpers = require('./helpers');
const slackHandlers = require('./slackHandlers');

// Initializes the process of adding points to an employee
module.exports.init = async function(data) {

    let mentionedUsersId = helpers.getMentionedUsersId(helpers.getTextMessage(data));

    for(let i = 0; i < mentionedUsersId.length; i++) {

        if(mentionedUsersId[i] === process.env.BOT_ID) continue;

        if(mentionedUsersId[i] === helpers.getUserId(data)) {
            
            let usernameGiver = await slackHandlers.getSlackUsernameById(helpers.getUserId(data));
            slackHandlers.chatPostMessage(`You can't give points to yourself ${usernameGiver}. Nice try.`, process.env.BOT_CHANNEL);
        
        } else {
            
            let amountOfPoints = await helpers.getAmountOfPoints(helpers.getTextMessage(data), helpers.getUserId(data));
            let date = new Date();
            let dateString = `${date.getMonth()}/${date.getFullYear()}`;

            EmployeeOfTheMonth.findOne({ month: dateString })
            .then(async result => {

                let month;

                if(result === null) {
                    month = await initNewMonth(dateString);

                } else {
                    month = result;
                }
                
                let output = await addPointsToUser(month, mentionedUsersId[i], amountOfPoints, data);

                slackHandlers.chatPostMessage(output, process.env.BOT_CHANNEL);

            })
            .catch(err => {
                bugsnagClient.notify(new Error(err));
            })

        }

    }

}

// Returns the scoreboard at this time
module.exports.getScoreBoard = function(channel) {

    let date = new Date();
    let dateString = `${date.getMonth()}/${date.getFullYear()}`;

    EmployeeOfTheMonth.findOne({ month: dateString })
    .then(async result => {

        if(result === null) { return slackHandlers.chatPostMessage("This month there are no points given yet.", channel)}

        let output = "";
        let usersList = await slackHandlers.getSlackUsersList();

        // Sorting employees by score
        result.employees.sort(function(a, b) { return b.points - a.points });

        let icons = [":first_place_medal:", ":second_place_medal:", ":third_place_medal:", ":sports_medal:"];

        for(let i = 0; i < result.employees.length; i++) {

            if(parseInt(result.employees[i].points) === 0) continue;

            let username = "";
            for(let j = 0; j < usersList.length; j++) {
                if(result.employees[i].userID === usersList[j].userID) {
                    username = usersList[j].username;
                    break;
                }
            }

            // Makes up for an early problem where bots were saved in the db to get points
            if(username === "") continue;

            let icon;
            i < 3 ? icon = icons[i] : icon = icons[3];

            output += `${icon} ${username}: ${result.employees[i].points}\n`;

        }

        let attachments = [{
            "text": output,
            "color": "#58b4e5"
        }]

        return slackHandlers.chatPostMessage("Behold the scoreboard", channel, attachments);

    })
    .catch(err => {
        bugsnagClient.notify(new Error(err));
        return slackHandlers.chatPostMessage("Something went wrong searching the database", data.event.channel);
    })

}

// Adds a given amount of points to a given user for a given month
async function addPointsToUser(month, userID, amountOfPoints, data) {

    return new Promise(async (resolve, reject) => {

        let newUser = true;
        let isUser = false;
        let usersList = await slackHandlers.getSlackUsersList();
        let usernameGiver = await slackHandlers.getSlackUsernameById(helpers.getUserId(data));
        let usernameReceiver = await slackHandlers.getSlackUsernameById(userID);

        for(let i = 0; i < usersList.length; i++) {
            if(usersList[i].userID === userID) {
                isUser = true;
            }
        }

        if(!isUser) return resolve(`That's very nice of you ${usernameGiver}, but bots are not allowed to receive points :upside_down_face:`)
        
        for(let i = 0; i < month.employees.length; i++) {

            if(month.employees[i].userID === userID) {
                month.employees[i].points += amountOfPoints;
                newUser = false;
            }
    
        }

        if(newUser) {
            month.employees.push({
                _id: mongoose.Types.ObjectId(),
                userID: userID,
                points: amountOfPoints
            })
        }
        
        month.save()
        .then(async result => {
            return resolve(`${usernameGiver} just awarded ${amountOfPoints} points to ${usernameReceiver}!`);
        })
        .catch(err => {
            bugsnagClient.notify(new Error(err));
            return reject(`Something went wrong while adding the points you awarded ${usernameGiver}. Devs should look into this.`);
        })

    })

}

// Creates a new month employeeOfTheMonth object
async function initNewMonth(date) {

    return new Promise(async (resolve, reject) => {

        let usersList = await slackHandlers.getSlackUsersList();

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
            bugsnagClient.notify(new Error(err));
            reject();
        })

    })

}

// Handles announcing the winners when the month is over
module.exports.announceWinners = function() {

    let date = new Date();
    let dateMonth, dateYear;
    date.getMonth() == 0 ? dateMonth = 11 : dateMonth = date.getMonth() - 1;
    date.getMonth() == 0 ? dateYear = date.getFullYear() - 1 : dateYear = date.getFullYear();
    let dateString = `${dateMonth}/${dateYear}`;

    EmployeeOfTheMonth.findOne({ month: dateString })
    .then(result => {
        module.exports.getScoreBoard(process.env.BOT_CHANNEL);
        slackHandlers.chatPostMessage("@channel Congratulations to everyone! Good luck next month!", process.env.BOT_CHANNEL)
    })
    .catch(err => {
        bugsnagClient.notify(new Error(err));
    })

}