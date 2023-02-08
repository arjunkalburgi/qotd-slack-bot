export enum SlackEvents {
    APP_MENTION = "app_mention",
}

export interface IHandlerResponse {
    statusCode: number;
    body: string;
}