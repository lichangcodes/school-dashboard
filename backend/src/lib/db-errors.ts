// Postgres error codes we map to client-facing HTTP errors.
// https://www.postgresql.org/docs/current/errcodes-appendix.html
export const PG_FOREIGN_KEY_VIOLATION = "23503";
export const PG_UNIQUE_VIOLATION = "23505";

// Drizzle wraps driver errors in DrizzleQueryError; the Postgres code lives on `cause`.
export const getPgErrorCode = (error: unknown): string | undefined => {
  const cause = (error as { cause?: { code?: unknown } } | null)?.cause;
  return typeof cause?.code === "string" ? cause.code : undefined;
};
