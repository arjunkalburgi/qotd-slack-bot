import { App, ExpressReceiver, ReceiverEvent } from "@slack/bolt";
import { APIGatewayEvent } from "aws-lambda";
import * as dotenv from "dotenv";
import { IHandlerResponse, SlackEvents } from "../constants";
import {
  generateReceiverEvent,
  isUrlVerificationRequest,
  parseRequestBody,
  SayFn } from "../utils";

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

const timeTillThen = () => {
  var now = new Date();
  var then = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,  // the next day, ...
      13, 0, 0            // ... at 13:00:00 hours
  );
  
  const msToThen = then.getTime() - now.getTime();
  return { 
    seconds: Math.floor((msToThen / 1000) % 60),
    minutes: Math.floor((msToThen / (1000 * 60)) % 60),
    hours: Math.floor((msToThen / (1000 * 60 * 60)) % 24)
  };
}

app.event(SlackEvents.APP_MENTION, async({ say }) => {
  console.log("*** slack event")

  var then = timeTillThen();
  const msg = `Hey! The QotD bot is running in this channel. Your next message is
   in ${then.hours + "h " + then.minutes + "m and " + then.seconds + "s"}!`
  
  await (say as SayFn)(msg);
});

app.message(async ({ say }) => {
  await say("Hi :wave:");
});

export async function handler(event: APIGatewayEvent): Promise<IHandlerResponse> {
  const payload: any = parseRequestBody(event.body, event.headers["content-type"]);

  if(isUrlVerificationRequest(payload)) {
    return {
      statusCode: 200,
      body: payload?.challenge
    };
  }

  console.log("*** slack handler", JSON.stringify(payload));
  if (payload.event.type === "app_mention") {
    var then = timeTillThen();
    const msg = `Hey! The QotD bot is running in this channel. Your next message is
     in ${then.hours + "h " + then.minutes + "m and " + then.seconds + "s"}!`
    app.client.chat.postMessage({
      token: process.env.SLACK_TOKEN,
      channel: payload.event.channel,
      thread_ts: payload.event.ts,
      text: msg
    });
  }

  const slackEvent: ReceiverEvent = generateReceiverEvent(payload);
  await app.processEvent(slackEvent);

  return {
    statusCode: 200,
    body: "Hello, world!"
  };
}