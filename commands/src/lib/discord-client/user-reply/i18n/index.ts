import { Locale } from "discord.js";
import DEFAULT from "lib/discord-client/user-reply/i18n/translations/default.json";
import ZHTW from "lib/discord-client/user-reply/i18n/translations/zh-tw.json";

const getTranslationMap = (language: Locale): Record<string, string> => {
    switch (language) {
        case Locale.ChineseTW:
            return ZHTW;
        default:
            return DEFAULT;
    }
}

const getDefault = (key: string) => (DEFAULT as Record<string, string>)[key] || key;

export default (language: Locale) => {
    const translationMap = getTranslationMap(language);

    return {
        t: (key: string, values: Record<string, string> = {}) => {
            let translatedMessage = translationMap[key] || getDefault(key);

            for (const valueKey in values) {
                const placeholder = `{{${valueKey}}}`;
                translatedMessage = translatedMessage.replace(new RegExp(placeholder, 'g'), values[valueKey]);
            }

            return translatedMessage;
        }
    }
}
