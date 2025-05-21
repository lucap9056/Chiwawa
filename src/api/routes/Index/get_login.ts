import { Request, Response } from "express";
import { HttpStatusCode } from "axios";


export default function GET_LOGIN(req: Request, res: Response) {

    const { userId } = req.session;
    const { config } = req.chiwawa;

    if (userId) {
        return res.status(HttpStatusCode.MovedPermanently).redirect(config.api.redirectUri);
    }

    const { oauth2 } = req;

    if (oauth2) {
        return res.status(HttpStatusCode.MovedPermanently).redirect(oauth2.getAuthorizeUrl);
    }

    return res.status(HttpStatusCode.ServiceUnavailable).end();
}