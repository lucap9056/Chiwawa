import { Request, Response } from "express";
import { HttpStatusCode } from "axios";

import App from "/app";

export default function GET_ROOT(req: Request, res: Response) {
    const { userId } = req.session;

    if (!userId) {
        return res.status(HttpStatusCode.Unauthorized).end();
    }

    const { config } = req.chiwawa;

    if (config.adminIds.includes(userId)) {
        return res.status(HttpStatusCode.Ok).json(Object.assign({}, config, { configPath: undefined }));
    }

    return res.sendStatus(HttpStatusCode.Forbidden);
}