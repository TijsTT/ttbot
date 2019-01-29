// This is the place for all helper functions. Mostly functions with a return value, used in other functions.

const settingsUserHandler = require('./settingsUserHandler');

// Returns if a user is mentioned in the given text
module.exports.userMentioned = function(text) {

    if(text.includes("<@")) return true;
    return false;
    
}

// Returns if the given text contains the set emoticon
module.exports.emoticonUsed = async function(text, userID) {

    let userEmoticon = await settingsUserHandler.getSettingsUserEmoticon(userID);

    if(!userEmoticon) return false;

    if(text.includes(userEmoticon)) return true;
    return false;

}

// Returns the amount of set emoticons in the given text
module.exports.getAmountOfPoints = async function(text, userID) {

    let userEmoticon = await settingsUserHandler.getSettingsUserEmoticon(userID);

    let regex = new RegExp(module.exports.escapeRegExp(userEmoticon), "g");
    let count = (text.match(regex) || []).length;

    return count

}

// Returns the id of the mentioned user
module.exports.getMentionedUserId = function(text) {

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

// Returns the text message from a Slack data object
module.exports.getTextMessage = function(data) {

    let text = "";

    if(data.event.subtype && data.event.subtype === "message_changed") {
        text = data.event.message.text;
    } else {
        text = data.event.text;
    }

    return text;

}

// Returns the user id from a Slack data object
module.exports.getUserId = function(data) {

    let userID = "";

    if(data.event.subtype && data.event.subtype === "message_changed") {
        userID = data.event.message.user;
    } else {
        userID = data.event.user;
    }

    return userID;

}

// Returns if today is first monday of the month
module.exports.isFirstMondayOfTheMonth = function() {

    let date = new Date();

    if(date.getUTCDate() < 8 && date.getUTCDay() == 0) return true;

    return false;

}

// Returns if it's time to stop... and show last months results
module.exports.isTimeToStop = function() {

    let date = new Date();

    if(date.getUTCHours() == 8) return true;

    return false;

}

// Returns if it's a workday today
module.exports.isWorkDay = function() {

    let date = new Date();

    if(date.getUTCDay() < 5) return true;

    return false;

}

module.exports.escapeRegExp = function(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}