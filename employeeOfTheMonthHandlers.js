const EmployeeOfTheMonth = require('./models/employeeOfTheMonth.js');

const helpers = require('./helpers.js');
const settings = require('./settings.js');

module.exports.init = function(data) {

    let mentionedUserId = helpers.getMentionedUserId(helpers.getTextMessage(data));

    if(mentionedUserId === data.event.user) return helpers.chatPostMessage("You can't give points to yourself. Nice try.", data.event.channel);

    let amountOfPoints = helpers.getAmountOfPoints(helpers.getTextMessage(data));
    let date = new Date();
    let dateString = `${date.getMonth()}/${date.getFullYear()}`;

    EmployeeOfTheMonth.findOne({ month: dateString })
    .then(async result => {

        let month;

        if(result === null) {
            // console.log("Initializing new month...");
            month = await initNewMonth(dateString);
            
            // let monthToAnnounce = dateString;
            // announceWinners(monthToAnnounce);


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

module.exports.getScoreBoard = function(channel) {

    let date = new Date();
    let dateString = `${date.getMonth()}/${date.getFullYear()}`;

    EmployeeOfTheMonth.findOne({ month: dateString })
    .then(async result => {

        if(result === null) { return helpers.chatPostMessage("This month there are no points given yet.", channel)}

        let output = "";
        let usersList = await helpers.getSlackUsersList();

        // Sorting employees by score
        result.employees.sort(function(a, b) { return b.points - a.points });

        let icons = [":first_place_medal:", ":second_place_medal:", ":third_place_medal:", ":sports_medal:"];

        for(let i = 0; i < result.employees.length; i++) {

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

        return helpers.chatPostMessage("Behold the scoreboard", channel, attachments);

    })
    .catch(err => {
        console.log(err);
        return helpers.chatPostMessage("Something went wrong searching the database", data.event.channel);
    })

}

function announceWinners(date) {

    EmployeeOfTheMonth.findOne({ month: date })
    .then(result => {
        getScoreBoard(settings.botChannel);
        helpers.chatPostMessage("Congratulations to the winners! Good luck next month!", settings.botChannel)
    })
    .catch(err => {
        console.log("Something went wrong announcing the winners?",err);
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
            return resolve();
        })
        .catch(err => {
            console.log(err);
            return reject();
        })

    })

}

async function initNewMonth(date) {

    return new Promise(async (resolve, reject) => {

        let usersList = await helpers.getSlackUsersList();

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