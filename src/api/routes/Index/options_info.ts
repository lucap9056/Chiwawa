import { Request, Response } from "express";
import { HttpStatusCode } from "axios";

export default function OPTIONS_INFO(req: Request, res: Response) {
    res.setHeader("Allow", "GET");
    res.sendStatus(HttpStatusCode.Ok);
}