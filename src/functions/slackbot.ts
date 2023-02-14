import { App, ExpressReceiver, ReceiverEvent } from "@slack/bolt";
import { APIGatewayEvent } from "aws-lambda";
import * as dotenv from "dotenv";
import { IHandlerResponse, SlackEvents } from "../constants";
import {
    generateReceiverEvent,
    isUrlVerificationRequest,
    parseRequestBody,
    SayFn,
    timeTillMsgStr,
    timeOfThen,
    getQuestion,
} from "../utils";

dotenv.config();

const expressReceiver: ExpressReceiver = new ExpressReceiver({
    signingSecret: `${process.env.SLACK_SIGNING_SECRET}`,
    processBeforeResponse: true
});

const app: App = new App({
    signingSecret: `${process.env.SLACK_SIGNING_SECRET}`,
    token: `${process.env.SLACK_BOT_TOKEN}`,
    receiver: expressReceiver
});

export async function handler(event: APIGatewayEvent): Promise<IHandlerResponse> {
    const payload: any = parseRequestBody(event.body, event.headers["content-type"]);
    
    if(isUrlVerificationRequest(payload)) {
        return {
            statusCode: 200,
            body: payload?.challenge
        };
    }
    
    const slackEvent: ReceiverEvent = generateReceiverEvent(payload);
    await app.processEvent(slackEvent);
    
    return {
        statusCode: 200,
        body: ""
    };
}

app.event(SlackEvents.APP_MENTION, async({ say }) => {
    await (say as SayFn)("The QotD bot is running in this channel. " + timeTillMsgStr());
});

// need to implement auto start of the next one.

app.command('/start_qotd', async({body, ack}) => {
    ack();

    const msg = await getQuestion();
    try {
        var a = await app.client.chat.scheduleMessage({
            channel: body.channel_id,
            text: "<!channel> " + msg,
            post_at: timeOfThen() / 1000
        });
        console.log(a);
        await app.client.chat.postEphemeral({
            token: process.env.SLACK_BOT_TOKEN,
            channel: body.channel_id,
            text: "QotD bot is now set! " + timeTillMsgStr(),
            user: body.user_id
        });
    } catch (error) { 
        console.error(error);
        await app.client.chat.postEphemeral({
            token: process.env.SLACK_BOT_TOKEN,
            channel: body.channel_id,
            text: "Something is wrong with the QotD bot! Please try again",
            user: body.user_id
        });
    }
});

app.command('/pause_qotd', async({body, ack}) => {
    ack();
    const now = new Date();
    let tomorrow = now; 
    tomorrow.setDate(now.getDate() + 1);
    let result;
    
    try {
        result = await app.client.chat.scheduledMessages.list({
            channel: body.channel_id,
            latest: now.getTime() / 1000,
            oldest: tomorrow.getTime() / 1000
        });
        if (result.scheduled_messages !== undefined && typeof(result.scheduled_messages[0].id) === "string") {
            await app.client.chat.deleteScheduledMessage({
                channel: body.channel_id,
                scheduled_message_id: result.scheduled_messages[0].id
            });
        }
        await app.client.chat.postEphemeral({
            token: process.env.SLACK_BOT_TOKEN,
            channel: body.channel_id,
            user: body.user_id,
            // text: "QotD bot is now disabled in this channel."
            text: JSON.stringify(result)
        });
    } catch (error) {
        console.error(error);
        await app.client.chat.postEphemeral({
            token: process.env.SLACK_BOT_TOKEN,
            channel: body.channel_id,
            text: "Something is wrong with the QotD bot! Please try again",
            user: body.user_id
        });
    }
});

app.command('/check_qotd', async({body, ack}) => {
    ack();
    const now = new Date();
    let tomorrow = now; 
    tomorrow.setFullYear(now.getFullYear() + 1);

    try {
        const result = await app.client.chat.scheduledMessages.list({
            channel: body.channel_id,
            latest: now.getTime() / 1000,
            oldest: tomorrow.getTime() / 1000
        });
        console.log({result, latest: now.getTime() / 1000, oldest: tomorrow.getTime() / 1000});
        var text = (result.scheduled_messages !== undefined && result.scheduled_messages.length > 0) ? 
            "The QotD bot is running in this channel. " + timeTillMsgStr() :
            "The QotD bot is not running in this channel";
        await app.client.chat.postEphemeral({
            token: process.env.SLACK_BOT_TOKEN,
            channel: body.channel_id,
            user: body.user_id,
            // text
            text: text + " " + JSON.stringify(result)
        });
    } catch (error) {
        console.error(error);
        await app.client.chat.postEphemeral({
            token: process.env.SLACK_BOT_TOKEN,
            channel: body.channel_id,
            text: "Something is wrong with the QotD bot! Please try again",
            user: body.user_id
        });
    }
});