const mongoose = require('mongoose');

const settingsUserSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    emoticon: String,
    userID: String,
    username: String
})

module.exports = mongoose.model("settingsUser", settingsUserSchema);