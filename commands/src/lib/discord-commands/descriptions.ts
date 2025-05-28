import { Locale } from "discord.js";
import DEFAULT from "lib/discord-commands/descriptions/default.json";
import ZHTW from "lib/discord-commands/descriptions/zh-tw.json";

interface Description {
    "get": string
    "reset": string,
    "mute": string,
    "mute-enable": string,
    "prefix": string,
    "prefix-set": string,
    "prefix-set-value": string,
    "prefix-unset": string,
    "prefix-join": string,
    "prefix-join-set": string,
    "prefix-join-set-value": string,
    "prefix-join-unset": string,
    "prefix-leave": string,
    "prefix-leave-set": string,
    "prefix-leave-set-value": string,
    "prefix-leave-unset": string,
    "message": string,
    "message-set": string,
    "message-set-value": string,
    "message-unset": string,
    "message-join": string,
    "message-join-set": string,
    "message-join-set-value": string,
    "message-join-unset": string,
    "message-leave": string,
    "message-leave-set": string,
    "message-leave-set-value": string,
    "message-leave-unset": string,
    "suffix": string,
    "suffix-set": string,
    "suffix-set-value": string,
    "suffix-unset": string,
    "suffix-join": string,
    "suffix-join-set": string,
    "suffix-join-set-value": string,
    "suffix-join-unset": string,
    "suffix-leave": string,
    "suffix-leave-set": string,
    "suffix-leave-set-value": string,
    "suffix-leave-unset": string,
    "inheritGlobal": string,
    "inheritGlobal-enable": string,
    "language": string,
    "language-set": string,
    "language-set-value": string,
    "language-unset": string,
    "language-join": string,
    "language-join-set": string,
    "language-join-set-value": string,
    "language-join-unset": string,
    "language-leave": string,
    "language-leave-set": string,
    "language-leave-set-value": string,
    "language-leave-unset": string,
    "voice": string,
    "voice-set": string,
    "voice-set-value": string,
    "voice-unset": string,
    "voice-join": string,
    "voice-join-set": string,
    "voice-join-set-value": string,
    "voice-join-unset": string,
    "voice-leave": string,
    "voice-leave-set": string,
    "voice-leave-set-value": string,
    "voice-leave-unset": string
}

export function t(language: Locale, key: keyof Description): [Locale, string] {
    const description = translationMap(language);
    return [language, description[key]];
}

function translationMap(language: string): Description {
    switch (language) {
        case Locale.ChineseTW:
            return ZHTW;
        default:
            return DEFAULT;
    }
}