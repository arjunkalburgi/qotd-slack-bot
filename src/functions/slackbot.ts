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

app.event(SlackEvents.APP_MENTION, async({ say }) => {
  await (say as SayFn)("The QotD bot is running in this channel. " + timeTillMsg());
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
    body: "Hello, world!"
  };
}