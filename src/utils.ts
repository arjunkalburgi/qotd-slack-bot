import { ReceiverEvent } from "@slack/bolt";
import { ChatPostMessageResponse } from '@slack/web-api';

export function parseRequestBody(stringBody: string | null, contentType: string | undefined): any | undefined {
    try {
        if (!stringBody) {
            return "";
        }

        let result: any = {};

        if (contentType && contentType === "application/json") {
            return JSON.parse(stringBody);
        }

        let keyValuePairs: string[] = stringBody.split("&");
        keyValuePairs.forEach(function (pair: string): void {
            let individualKeyValuePair: string[] = pair.split("=");
            result[individualKeyValuePair[0]] = decodeURIComponent(individualKeyValuePair[1] || "");
        });
        return JSON.parse(JSON.stringify(result));

    } catch {
        return "";
    }
}

export function generateReceiverEvent(payload: any): ReceiverEvent {
    return {
        body: payload,
        ack: async (response): Promise<any> => {
            return {
              statusCode: 200,
              body: response ?? ""
            };
        }
    };
}

export function isUrlVerificationRequest(payload: any): boolean {
    if (payload && payload.type && payload.type === "url_verification") {
        return true;
    }
    return false;
}

export interface SayFn {
    (message: string): Promise<ChatPostMessageResponse>;
}

export const timeTillThen = () => {
  var now = new Date();
  var then = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,  // the next day, ...
      13, 0, 0            // ... at 13:00:00 hours
  );
  
  const msToThen = then.getTime() - now.getTime();
  return { 
    ms: msToThen, 
    seconds: Math.floor((msToThen / 1000) % 60),
    minutes: Math.floor((msToThen / (1000 * 60)) % 60),
    hours: Math.floor((msToThen / (1000 * 60 * 60)) % 24)
  };
}

export const timeTillMsg = () => { 
    var then = timeTillThen();
    return `The next message is in ${then.hours + "h " + then.minutes + "m and " + then.seconds + "s"}!`
}

export async function getQuestion() {
    let url = 'https://api.sheety.co/1d451b7406988a7d18b381d137c82628/defaultQotDQuestions/questions';
    return await fetch(url)
        .then((response) => response.json())
        .then(json => {
            let questions = json.questions;
            let qotd = questions[Math.floor((Math.random()*questions.length))]
            return qotd.question;
        });
}