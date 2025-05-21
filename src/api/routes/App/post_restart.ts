import { Request, Response } from "express";
import { HttpStatusCode } from "axios";


export default function POST_RESTART(req: Request, res: Response) {
    const { userId } = req.session;

    if (!userId) {
        return res.status(HttpStatusCode.Unauthorized).end();
    }

    const { config } = req.chiwawa;

    if (config.adminIds.includes(userId)) {

        return res.status(HttpStatusCode.Ok).end();
    }

    res.status(HttpStatusCode.Forbidden).end();
}