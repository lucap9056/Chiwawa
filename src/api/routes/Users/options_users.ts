import { Request, Response } from "express";
import { HttpStatusCode } from "axios";

function ME(req: Request, res: Response) {
    res.setHeader("Allow", "GET, POST");
    res.sendStatus(HttpStatusCode.Ok);
}

function SOMEONE(req: Request, res: Response) {
    res.setHeader("Allow", "GET");
    res.sendStatus(HttpStatusCode.Ok);
}

export default {
    ME,
    SOMEONE
}