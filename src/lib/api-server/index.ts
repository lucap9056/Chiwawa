import express, { Request, Response, NextFunction } from "express";
import { HttpStatusCode } from "axios";
import session from "express-session";

import { Server } from "http";

import App from "/app";

import { OAuth2 } from "api/discord-api";

import indexRouter from "routes/index";
import appRouter from "routes/app";
import usersRouter from "routes/users";


class APIServer {

    private server: Server;

    constructor(app: App) {
        const server = express();

        const { config, mongoDB } = app;

        const oauth2 = config.api.oauth2.isEnabled ?
            new OAuth2(
                config.api.oauth2.clientId,
                config.api.oauth2.clientSecret,
                config.api.redirectUri
            ) :
            undefined;

        server.use((req: Request, _, next: NextFunction) => {
            req.chiwawa = app;
            req.oauth2 = oauth2;
            next();
        });

        const maxAge = (config.api.oauth2.isEnabled) ? 604800 * 1000 : 3600 * 1000;

        if (config.database.isEnabled) {

            server.use(session({
                secret: config.api.sessionSecret,
                resave: false,
                saveUninitialized: true,
                store: mongoDB.session,
                cookie: {
                    httpOnly: true,
                    sameSite: 'strict',
                    maxAge
                }
            }));

        } else {

            server.use(session({
                secret: config.api.sessionSecret,
                resave: false,
                saveUninitialized: true,
                cookie: {
                    httpOnly: true,
                    sameSite: 'strict',
                    maxAge
                }
            }));
        }

        server.use(express.json());

        server.use("/", indexRouter);

        server.use("/app", appRouter);

        if (mongoDB) {
            server.use("/users", usersRouter);
        }

        server.use((err: Error, _: Request, res: Response, next: NextFunction) => {

            console.error(err.stack || err.message);

            res.status(HttpStatusCode.InternalServerError).end();

            next();
        });

        this.server = server.listen(config.api.port, () => {
            console.log("API Server Ready");
        });
    }

    public Close(): Promise<void> {
        return new Promise((reslove, reject) => {
            this.server.on("close", reslove);
            this.server.close((err) => {
                if (err) reject(err);
            });
        });
    }
}

export default APIServer;