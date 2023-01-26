const { App } = require('@slack/bolt');
require('dotenv').config();

const timeTillThen = () => {
    var now = new Date();
    var then = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,  // the next day, ...
        13, 0, 0            // ... at 13:00:00 hours
    );
    return then.getTime() - now.getTime();
}

const bot = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET
});

(async () => {
    await bot.start(process.env.PORT || 3000);
    console.log('⚡️ Bolt bot is running!');
    
    startApp();
})();

bot.event('app_mention', ({ event, say }) => {
    var msToThen = timeTillThen();

    var seconds = Math.floor((msToThen / 1000) % 60),
        minutes = Math.floor((msToThen / (1000 * 60)) % 60),
        hours = Math.floor((msToThen / (1000 * 60 * 60)) % 24);
      
    say(`Hey! The QotD bot is running in this channel. Your next message is in 
        ${hours + "h " + minutes + "m and " + seconds + "s"}, <@${event.user}>!`);
});

function startApp() {
    var msToThen = timeTillThen();

    setTimeout(function() {
        messageChannels();
        startApp();
    }, msToThen);
}

async function messageChannels() {
    try {
        const result = await bot.client.conversations.list({
            token: process.env.SLACK_BOT_TOKEN
        });
        
        for (const channel of result.channels.filter(c => c.is_member)) {

            const msg = await getQuestion();

            try {
                // Call the chat.postMessage method using the WebClient
                await bot.client.chat.postMessage({
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