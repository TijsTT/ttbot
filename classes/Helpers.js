module.exports = class Helpers {

    // Checks if the given user is a bot
    static checkIfUserIsBot(user) {
        return (user.is_bot || user.id === "USLACKBOT");
    }

    // Returns if a user is mentioned in the given text
    static userMentioned(text) {

        if(text.includes("<@")) return true;
        return false;
        
    }

    // Returns if the given text contains the set emoticon
    static async emoticonUsed(text, emoticon) {

        if(!emoticon) return false;

        if(text.includes(emoticon)) return true;
        return false;

    }

    // Returns the amount of set emoticons in the given text
    static async getAmountOfPoints(text, emoticon) {

        let regex = new RegExp(module.exports.escapeRegExp(emoticon), "g");
        let count = (text.match(regex) || []).length;

        return count

    }

    // Returns the id of the mentioned user
    static getMentionedUsersId(text) {

        let regex = new RegExp("<@[^<]*>", "g");
        let mentionedUsers = text.match(regex);

        for(let i = 0; i < mentionedUsers.length; i++) {
            mentionedUsers[i] = mentionedUsers[i].slice(2, mentionedUsers[i].length - 1);
        }

        return mentionedUsers;

    }

    // Returns the text message from a Slack data object
    static getTextMessage(data) {

        let text = "";

        if(data.event.subtype && data.event.subtype === "message_changed") {
            text = data.event.message.text;
        } else {
            text = data.event.text;
        }

        return text;

    }

    // Returns the user id from a Slack data object
    static getUserId(data) {

        let userID = "";

        if(data.event.subtype && data.event.subtype === "message_changed") {
            userID = data.event.message.user;
        } else {
            userID = data.event.user;
        }

        return userID;

    }

    // Returns if today is first monday of the month
    static isFirstMondayOfTheMonth() {

        let date = new Date();

        if(date.getUTCDate() < 8 && date.getUTCDay() == 0) return true;

        return false;

    }

    // Returns if it's time to stop... and show last months results
    static isTimeToStop() {

        let date = new Date();

        if(date.getUTCHours() == 8) return true;

        return false;

    }

    // Returns if it's a workday today
    static isWorkDay() {

        let date = new Date();

        if(date.getUTCDay() < 5) return true;

        return false;

    }

    static escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
    }

}