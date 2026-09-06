export type Env = { DB: D1Database; FILES: R2Bucket; ASSETS?: Fetcher; ADMIN_PASSWORD_HASH?: string; APP_ORIGIN?: string };
export type Variables = { sessionHash: string };
export type SettingsRow = { project_id: string; project_code: string; countries: string; access_hash: string | null; enabled: number; details?: import("../shared/reimbursement").ProjectDetails };
