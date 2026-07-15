import { z } from "zod";

export const messageTemplateSchema = z.object({
    prefix: z.string(),
    content: z.string(),
    suffix: z.string().optional(),
    language: z.string().optional(),
    voiceModel: z.string().optional(),
});

export const speechNoticeSchema = z.object({
    inheritGlobal: z.boolean(),
    muted: z.boolean(),
    joinMessage: messageTemplateSchema.or(z.undefined()),
    leaveMessage: messageTemplateSchema.or(z.undefined()),
});

export const appConfigSchema = z.object({
    defaultJoinSuffix: z.string(),
    defaultLeaveSuffix: z.string(),
    defaultVoiceModel: z.string(),
    ttsRegion: z.string().optional(),
    ttsApiKey: z.string().optional(),
    admins: z.array(z.string()),
});
