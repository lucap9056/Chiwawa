import { Request, Response } from "express";
import { HttpStatusCode } from "axios";

function ME(req: Request, res: Response) {
    const { userId } = req.session;

    if (!userId) {

        return res.status(HttpStatusCode.Unauthorized).end();
    }

    const { mongoDB } = req.chiwawa;

    if (!mongoDB) {
        return res.status(HttpStatusCode.ServiceUnavailable).end();
    }

    mongoDB.user.Del(userId)
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