import { App, ExpressReceiver, ReceiverEvent } from "@slack/bolt";
import { APIGatewayEvent } from "aws-lambda";
import * as dotenv from "dotenv";
import { IHandlerResponse, SlackEvents } from "../constants";
import {
    generateReceiverEvent,
    isUrlVerificationRequest,
    parseRequestBody,
    SayFn,
    timeTillMsg,
    timeTillThen,
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
    await (say as SayFn)("The QotD bot is running in this channel. " + timeTillMsg());
});

let timeoutID: NodeJS.Timeout;
function startApp(channel_id: string) {
    let msToThen = timeTillThen();
    
    timeoutID = setTimeout(async function() {
        const msg = await getQuestion();
        try {
            await app.client.chat.postMessage({
                channel: channel_id,
                text: "<!channel> " + msg
            });
        } catch (error) { console.error(error); }
        startApp(channel_id);
    }, msToThen.ms);
}

app.command('/start_qotd', async({body, ack}) => {
    ack();
    
    startApp(body.channel_id);
    
    await app.client.chat.postEphemeral({
        token: process.env.SLACK_BOT_TOKEN,
        channel: body.channel_id,
        text: "QotD bot set! " + timeTillMsg(),
        user: body.user_id
    });
});

app.command('/pause_qotd', async({body, ack}) => {
    ack();
    
    clearTimeout(timeoutID);
    
    await app.client.chat.postEphemeral({
        token: process.env.SLACK_BOT_TOKEN,
        channel: body.channel_id,
        text: "OotD bot is disabled in this channel." ,
        user: body.user_id
    });
});

app.command('/check_qotd', async({body, ack}) => {
    ack();
    await app.client.chat.postEphemeral({
        token: process.env.SLACK_BOT_TOKEN,
        channel: body.channel_id,
        text: "The QotD bot is running in this channel. " + timeTillMsg(),
        user: body.user_id
    });
});