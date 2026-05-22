export const COOKIE_NAME = "app_session_id";

// ─── Top Name Config ─────────────────────────────────────────────────────────
// Current production limit. Enforce in app, not in DB column (DB stores up to 32).
export const MAX_TOP_NAME_LENGTH = 14;
export const TOP_NAME_REGEX = /^[A-Za-z0-9 ]+$/; // letters, numbers, spaces only
export const TOP_NAME_PATTERN = "^[A-Za-z0-9 ]+$"; // regex string for Zod validation

// Basic profanity blocklist — extend as needed
export const PROFANITY_BLOCKLIST = [
  "fuck", "shit", "cunt", "bitch", "dick", "cock", "ass", "bastard",
  "wanker", "twat", "piss", "bollocks", "arsehole", "asshole",
];
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = 'Please login (10001)';
export const NOT_ADMIN_ERR_MSG = 'You do not have required permission (10002)';
