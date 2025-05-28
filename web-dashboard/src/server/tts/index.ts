"use server";
import { GetIssueToken } from "services/microsoft-tts";
import { IssueToken } from "structs/microsoft-tts";
import { Result } from "structs/rs-result";

export const GetAccessToken = async () => Result<IssueToken>(async (Ok) => {
    const issueToken = await GetIssueToken();
    Ok(issueToken);
});