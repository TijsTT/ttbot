const mongoose = require('mongoose');

const dailyStandupUserSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    userID: String,
    standups: [
        {
            _id: mongoose.Schema.Types.ObjectId,
            answer1: String,
            answer2: String,
            answer3: String,
            answer4: String,
            time: Date
        }
    ],
})

module.exports = mongoose.model("DailyStandupUser", dailyStandupUserSchema);