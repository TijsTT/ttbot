const cron = require('node-cron');

cron.schedule('0 9 * * 1', () => {
    let date = new Date();
    if(date.getDate() < 8) employeeOfTheMonthHandlers.announceWinners();
});

cron.schedule('0 0 * * *', () => {
    dailyStandupHandler.possiblyInit();
})