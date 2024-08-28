import { Request, Response } from "express";
import { HttpStatusCode } from "axios";

export default function DELETE_LOGIN(req: Request, res: Response) {
    req.session.destroy(err => {
        if (err) {
            res.status(HttpStatusCode.InternalServerError).end();
        } else {
            res.status(HttpStatusCode.NoContent).end();
        }
    })
}