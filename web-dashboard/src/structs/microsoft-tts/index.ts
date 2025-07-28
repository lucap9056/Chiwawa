
export interface IssueToken {
    region: string;
    token: string;
    expiresAt: number;
}

export const createEmptyIssueToken = (): IssueToken =>
({
    region: "",
    token: "",
    expiresAt: 0,
});