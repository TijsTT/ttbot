const bugsnagClient = require('./bugsnagClient');
const cron = require('node-cron');
const axios = require('axios');

// Interval loop to prevent server from going into sleep mode
cron.schedule('*/5 * * * *', () => {
    axios.get(process.env.APP_ENV === "development" ? `http://localhost:${process.env.PORT}` : process.env.APP_URL)
    .then(() => console.log('Pinging server so it doesn\'t go to sleep...'))
    .catch(err => {
        bugsnagClient.notify(new Error(err));
    })
});

cron.schedule('0 9 * * 1', () => {
    let date = new Date();
    if(date.getDate() < 8) employeeOfTheMonthHandlers.announceWinners();
});

cron.schedule('0 0 * * *', () => {
    dailyStandupHandler.possiblyInit();
})