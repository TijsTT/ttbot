const mongoose = require('mongoose');

const employeeOfTheMonthSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    month: String,
    employees: [
        {
            _id: mongoose.Schema.Types.ObjectId,
            userID: String,
            points: Number
        }
    ],
})

module.exports = mongoose.model("EmployeeOfTheMonth", employeeOfTheMonthSchema);