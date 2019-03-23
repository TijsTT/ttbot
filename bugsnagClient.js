var bugsnag = require('@bugsnag/js');
var bugsnagClient = bugsnag({
    apiKey: process.env.BUGSNAG_API_KEY,
    notifyReleaseStages: [ 'production', 'staging' ]
});
bugsnagClient.app.releaseStage = process.env.APP_ENV;

module.exports.bugsnagClient = bugsnagClient;