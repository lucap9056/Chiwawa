import { Request, Response } from "express";
import { HttpStatusCode } from "axios";

export default function OPTIONS_LOGIN(req: Request, res: Response) {
    res.setHeader("Allow", "GET, POST, DELETE");
    res.sendStatus(HttpStatusCode.Ok);
}