import { Request, Response } from "express";
import { HttpStatusCode } from "axios";

import MongoDB, { Notification, Notifications, MessageTemplate } from "@components/database";
import AppManager from "@src/components/appManager";

async function ME(req: Request, res: Response) {
    const { userId } = req.session;


    if (!userId) {

        return res.sendStatus(HttpStatusCode.Unauthorized);
    }

    const { mongoDB }: AppManager = req.appManager;

    if (!mongoDB) {
        return res.sendStatus(HttpStatusCode.ServiceUnavailable);
    }

    const user = await mongoDB.user.Get(userId) || MongoDB.EmptyUser(userId);

    return res.json(user);
}

async function SOMEONE(req: Request, res: Response) {

    const { id } = req.params;

    const { mongoDB }: AppManager = req.appManager;

    if (!mongoDB) {
        return res.sendStatus(HttpStatusCode.ServiceUnavailable);
    }

    const user = await mongoDB.user.Get(id);

    if (user) {
        return res.json(user);
    }

    res.sendStatus(HttpStatusCode.NotFound);
}

export default {
    ME,
    SOMEONE
}