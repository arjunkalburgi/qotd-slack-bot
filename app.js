const { App } = require('@slack/bolt');
require('dotenv').config();

const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET
});

(async () => {
    await app.start(process.env.PORT || 3000);
    console.log('⚡️ Bolt app is running!');
    
    startApp();
})();

function startApp() {
    var now = new Date();
    var then = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,  // the next day, ...
        13, 0, 0            // ... at 13:00:00 hours
    );
    var msToThen = then.getTime() - now.getTime();

    setTimeout(function() {
        messageChannels();
        resetQuestion();
    }, msToThen);
}

async function messageChannels() {
    try {
        const result = await app.client.conversations.list({
            token: process.env.SLACK_BOT_TOKEN
        });
        
        for (const channel of result.channels.filter(c => c.is_member)) {

            const msg = await getQuestion();

            try {
                // Call the chat.postMessage method using the WebClient
                await app.client.chat.postMessage({
                    channel: channel.id,
                    text: "<!channel> " + msg
                });
            } catch (error) { console.error(error); }
        }
    }
    catch (error) { console.error(error); }
}

async function getQuestion() {
    let url = 'https://api.sheety.co/1d451b7406988a7d18b381d137c82628/defaultQotDQuestions/questions';
    return await fetch(url)
        .then((response) => response.json())
        .then(json => {
            let questions = json.questions;
            let qotd = questions[Math.floor((Math.random()*questions.length))]
            return qotd.question;
        });
}