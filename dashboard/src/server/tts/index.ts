import { createServerFn } from "@tanstack/react-start";
import { sessionMiddleware } from "#/server/middlware";
import { getAccessTokenHandler, getVoiceModelsHandler } from "./handlers";

export const getAccessToken = createServerFn().middleware([sessionMiddleware]).handler(getAccessTokenHandler);

export const getVoiceModels = createServerFn().middleware([sessionMiddleware]).handler(getVoiceModelsHandler);
