import { Request, Response } from "express";
import { HttpStatusCode } from "axios";

export default function OPTIONS_ROOT(req: Request, res: Response) {
    res.setHeader("Allow", "POST");
    res.sendStatus(HttpStatusCode.Ok);
}