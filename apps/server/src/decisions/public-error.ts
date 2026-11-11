import { HttpException } from "@nestjs/common";

export type PublicErrorCode =
  | "invalid_api_key"
  | "policy_not_found"
  | "policy_not_live"
  | "payload_too_large"
  | "invalid_json"
  | "invalid_input"
  | "rate_limited"
  | "engine_unavailable";

const STATUS: Record<PublicErrorCode, number> = {
  invalid_api_key: 401,
  policy_not_found: 404,
  policy_not_live: 409,
  payload_too_large: 413,
  invalid_json: 400,
  invalid_input: 422,
  rate_limited: 429,
  engine_unavailable: 503,
};

/** Public API error: `{ "error": { "code", "message", "details"? } }` with the code's HTTP status. */
export class PublicApiError extends HttpException {
  constructor(
    readonly code: PublicErrorCode,
    message: string,
    details?: unknown,
  ) {
    super({ error: { code, message, ...(details === undefined ? {} : { details }) } }, STATUS[code]);
  }
}

export const publicErrorBody = (code: PublicErrorCode, message: string) => ({ status: STATUS[code], body: { error: { code, message } } });
