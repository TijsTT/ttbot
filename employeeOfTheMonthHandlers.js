// Here every function that's connected to the EmployeeOfTheMonth collection is located.

const mongoose = require('mongoose');
const EmployeeOfTheMonth = require('./models/employeeOfTheMonth.js');

const helpers = require('./helpers');
const slackHandlers = require('./slackHandlers');

// Initializes the process of adding points to an employee
module.exports.init = async function(data) {

    let mentionedUserId = helpers.getMentionedUserId(helpers.getTextMessage(data));

    if(mentionedUserId === helpers.getUserId(data)) return slackHandlers.chatPostMessage("You can't give points to yourself. Nice try.", data.event.channel);

    let amountOfPoints = await helpers.getAmountOfPoints(helpers.getTextMessage(data), helpers.getUserId(data));
    let date = new Date();
    let dateString = `${date.getMonth()}/${date.getFullYear()}`;

    EmployeeOfTheMonth.findOne({ month: dateString })
    .then(async result => {

        let month;

        if(result === null) {
            console.log('init new month');
            month = await initNewMonth(dateString);

        } else {
            console.log('month found');
            month = result;
        }

        let output = await addPointsToUser(month, mentionedUserId, amountOfPoints, data);

        slackHandlers.chatPostMessage(output, process.env.BOT_CHANNEL);

    })
    .catch(err => {
        console.log(err);
    })

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
        console.log(err);
        return slackHandlers.chatPostMessage("Something went wrong searching the database", data.event.channel);
    })

}

// Adds a given amount of points to a given user for a given month
async function addPointsToUser(month, userID, amountOfPoints, data) {

    return new Promise(async (resolve, reject) => {

        let newUser = true;
        
        for(let i = 0; i < month.employees.length; i++) {

            if(month.employees[i].userID === userID) {
                month.employees[i].points += amountOfPoints;
                newUser = false;
            }
    
        }

        if(newUser && userID !== "USLACKBOT" && userID !== process.env.BOT_ID) {
            month.employees.push({
                _id: mongoose.Types.ObjectId(),
                userID: userID,
                points: amountOfPoints
            })
        }

        let usernameGiver = await slackHandlers.getSlackUsernameById(helpers.getUserId(data));
        let usernameReceiver = await slackHandlers.getSlackUsernameById(userID);
        
        month.save()
        .then(result => {
            return resolve(`${usernameGiver} just awarded ${amountOfPoints} points to ${usernameReceiver}!`);
        })
        .catch(err => {
            console.log(err);
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
            console.log(err);
            reject();
        })

    })

}

// Handles announcing the winners when the month is over
module.exports.announceWinners = function() {

    if(helpers.isFirstMondayOfTheMonth()) {
        if(!helpers.isTimeToStop()) return;
    } else {
        return;
    }

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
        console.log("Something went wrong announcing the winners?", err);
    })

}