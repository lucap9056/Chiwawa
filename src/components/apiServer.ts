import express, { Request, Response, NextFunction } from "express";
import { HttpStatusCode } from "axios";
import session from "express-session";

import { Server } from "http";

import AppManager from "@components/appManager";

import { OAuth2 } from "@src/api/discordAPI";

import indexRouter from "@routes/Index";
import appRouter from "@routes/App";
import usersRouter from "@routes/Users";


class APIServer {

    private server: Server;

    constructor(appManager: AppManager) {
        const app = express();

        const { config, mongoDB } = appManager;

        const oauth2 = config.api.oauth2.isEnabled ?
            new OAuth2(
                config.api.oauth2.clientId,
                config.api.oauth2.clientSecret,
                config.api.redirectUri
            ) :
            undefined;

        app.use((req: Request, _, next: NextFunction) => {
            req.appManager = appManager;
            req.oauth2 = oauth2;
            next();
        });

        const maxAge = (config.api.oauth2.isEnabled) ? 604800 * 1000 : 3600 * 1000;

        if (config.database.isEnabled) {

            app.use(session({
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

            app.use(session({
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

        app.use(express.json());

        app.use("/", indexRouter);

        app.use("/app", appRouter);

        if (mongoDB) {
            app.use("/users", usersRouter);
        }

        app.use((err: Error, _: Request, res: Response, next: NextFunction) => {

            console.error(err.stack || err.message);

            res.status(HttpStatusCode.InternalServerError).end();

            next();
        });

        const server = app.listen(config.api.port, () => {
            console.log("API Server Ready");
        });

        this.server = server;
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