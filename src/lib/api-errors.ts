/**
 * Translate API error responses that carry a stable `code`. Server routes
 * keep a human-readable `error`
 * string (fallback + logs) and ADD `code` + `params`; the client maps
 * the code to a translation key with params, falling back to the raw
 * error string when there's no code (legacy responses, non-auth APIs).
 */
import type { TranslationKey } from "@/lib/i18n/translations";

export interface ApiErrorBody {
  error?: string;
  code?: string;
  params?: Record<string, string | number>;
}

const CODE_TO_KEY: Record<string, TranslationKey> = {
  too_many_attempts: "error.tooManyAttempts",
  account_locked: "error.accountLocked",
  current_password_required: "error.currentPasswordRequired",
  current_password_incorrect: "error.currentPasswordIncorrect",
};

export function translateApiError(
  body: ApiErrorBody,
  t: (key: TranslationKey, params?: Record<string, string | number>) => string,
): string {
  if (body.code && CODE_TO_KEY[body.code]) {
    return t(CODE_TO_KEY[body.code], body.params);
  }
  return body.error ?? "";
}
