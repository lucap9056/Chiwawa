"use server";
import { GetIssueToken } from "services/microsoft-tts";
import { IssueToken } from "structs/microsoft-tts";
import { buildSerializableOutcome, SerializableOutcome } from "resultant.js/rustify";

export const GetAccessToken = async (): Promise<SerializableOutcome<IssueToken>> => buildSerializableOutcome<IssueToken>(() => GetIssueToken());