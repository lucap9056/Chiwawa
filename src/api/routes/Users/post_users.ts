import { Request, Response } from "express";
import { HttpStatusCode } from "axios";

import MongoDB, { Notification, Notifications, MessageTemplate } from "lib/database";

const IsMessageTemplate = (obj: any): obj is MessageTemplate => {
    return typeof obj === 'object'
        && typeof obj.prefix === 'string'
        && typeof obj.content === 'string'
        && (typeof obj.suffix === 'undefined' || typeof obj.suffix === 'string')
        && (typeof obj.language === 'undefined' || typeof obj.language === 'string')
        && (typeof obj.voice === 'undefined' || typeof obj.voice === 'string');
};


const IsNotification = (obj: any): obj is Notification => {
    return typeof obj === 'object'
        && typeof obj.inheritGlobal === 'boolean'
        && typeof obj.muted === 'boolean'
        && IsMessageTemplate(obj.joinMessage)
        && IsMessageTemplate(obj.leaveMessage);
};


const IsUser = (obj: any): obj is Notifications => {
    return typeof obj === 'object'
        && IsNotification(obj.globalSettings)
        && typeof obj.guildSettings === 'object'
        && Object.values(obj.guildSettings).every(IsNotification);
};

function ME(req: Request, res: Response) {
    const { userId } = req.session;

    if (!userId) {

        return res.status(HttpStatusCode.Unauthorized).end();
    }

    const { mongoDB } = req.chiwawa;

    if (!mongoDB) {
        return res.status(HttpStatusCode.ServiceUnavailable).end();
    }

    const user = req.body;

    if (!IsUser(user)) {
        return res.status(HttpStatusCode.BadRequest).end();
    }

    user.id = userId;

    mongoDB.user.Set(user)
        .then(() => {
            res.sendStatus(HttpStatusCode.NoContent);
        })
        .catch((err: Error) => {
            res.status(HttpStatusCode.InternalServerError).end(err.message);
        });
}

export default {
    ME
}