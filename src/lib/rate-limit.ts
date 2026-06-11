import { neon } from "@neondatabase/serverless";
import { type NextRequest } from "next/server";

/**
 * Shared request rate limiter.
 *
 * Two layers, because the per-route in-memory `Map` limiters only ever see one
 * serverless instance — on Vercel they reset on cold start and miss requests
 * routed to a sibling lambda, so on their own they barely throttle a determined
 * caller:
 *
 *   L1 — in-memory, per-instance. Instant, always available, no I/O.
 *   L2 — durable on Neon Postgres, shared across instances. A sliding window
 *        keyed on (bucket, identifier) that actually holds cluster-wide.
 *
 * Fail-soft by design: if `DATABASE_URL` is unset or Neon is unreachable, L2 is
 * skipped and L1 remains in force. A database blip must never lock everyone out
 * of login / contact / order-tracking — L1 is the floor, L2 is the ceiling.
 */

type Sql = ReturnType<typeof neon>;

let _sql: Sql | null = null;
let _schemaReady: Promise<void> | null = null;

function getSql(): Sql | null {
	const url = process.env.DATABASE_URL;
	if (!url) return null;
	if (!_sql) _sql = neon(url);
	return _sql;
}

async function ensureSchema(sql: Sql): Promise<void> {
	if (!_schemaReady) {
		_schemaReady = (async () => {
			await sql.query(
				`CREATE TABLE IF NOT EXISTS rate_limit_hits (
					id BIGSERIAL PRIMARY KEY,
					bucket TEXT NOT NULL,
					identifier TEXT NOT NULL,
					created_at TIMESTAMPTZ NOT NULL DEFAULT now()
				)`,
			);
			await sql.query(
				`CREATE INDEX IF NOT EXISTS idx_rate_limit_hits_lookup
					ON rate_limit_hits (bucket, identifier, created_at)`,
			);
		})().catch((err) => {
			_schemaReady = null; // allow a retry on the next call
			throw err;
		});
	}
	await _schemaReady;
}

// ── L1: in-memory, per-instance ──────────────────────────────────────────────
const memory = new Map<string, { count: number; resetAt: number }>();

function memoryAllows(key: string, max: number, windowMs: number, now: number): boolean {
	const entry = memory.get(key);
	if (!entry || entry.resetAt <= now) {
		memory.set(key, { count: 1, resetAt: now + windowMs });
		return true;
	}
	if (entry.count >= max) return false;
	entry.count++;
	return true;
}

export interface RateLimitOptions {
	/** Stable namespace for the limit, e.g. "auth:reset-password". */
	bucket: string;
	/** Per-caller key, usually the client IP (see getClientIp). */
	identifier: string;
	/** Max hits allowed per window. */
	max: number;
	/** Window length in milliseconds. */
	windowMs: number;
}

export interface RateLimitResult {
	ok: boolean;
	retryAfterSeconds: number;
}

/**
 * Best-effort client IP. On Vercel the platform sets `x-forwarded-for`; the
 * leftmost hop is the client. Falls back to `x-real-ip`, then "unknown" (which
 * skips the durable layer rather than bucketing unrelated callers together).
 */
export function getClientIp(request: NextRequest): string {
	return (
		request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
		request.headers.get("x-real-ip")?.trim() ||
		"unknown"
	);
}

/**
 * Record a hit and report whether `identifier` is still within `max` per
 * `windowMs` for `bucket`. Returns `ok: false` with a `Retry-After` hint when
 * the limit is exceeded. Never throws — an infrastructure error degrades to the
 * L1 result so a DB outage can't deny service.
 */
export async function rateLimit(opts: RateLimitOptions): Promise<RateLimitResult> {
	const { bucket, identifier, max, windowMs } = opts;
	const now = Date.now();
	const retryAfterSeconds = Math.ceil(windowMs / 1000);
	const key = `${bucket}:${identifier}`;

	// L1 — instant. A rejection here is authoritative; no need to touch the DB.
	if (!memoryAllows(key, max, windowMs, now)) {
		return { ok: false, retryAfterSeconds };
	}

	// L2 — durable. Skipped for unknown IPs (would bucket everyone together).
	const sql = getSql();
	if (!sql || !identifier || identifier === "unknown") {
		return { ok: true, retryAfterSeconds: 0 };
	}

	try {
		await ensureSchema(sql);
		const windowSeconds = windowMs / 1000;
		const rows = (await sql.query(
			`WITH purged AS (
				DELETE FROM rate_limit_hits
				WHERE bucket = $1 AND identifier = $2
					AND created_at <= now() - make_interval(secs => $3::double precision)
			),
			fresh AS (
				SELECT COUNT(*)::int AS count FROM rate_limit_hits
				WHERE bucket = $1 AND identifier = $2
					AND created_at > now() - make_interval(secs => $3::double precision)
			),
			ins AS (
				INSERT INTO rate_limit_hits (bucket, identifier)
				SELECT $1, $2 FROM fresh WHERE fresh.count < $4
				RETURNING 1
			)
			SELECT (SELECT count FROM fresh) AS count, (SELECT COUNT(*)::int FROM ins) AS inserted`,
			[bucket, identifier, windowSeconds, max],
		)) as Array<{ count: number; inserted: number }>;

		const inserted = rows[0]?.inserted ?? 1;
		return inserted > 0 ? { ok: true, retryAfterSeconds: 0 } : { ok: false, retryAfterSeconds };
	} catch (err) {
		console.error(`[rate-limit] durable check failed for bucket "${bucket}"; falling back to in-memory`, err);
		return { ok: true, retryAfterSeconds: 0 };
	}
}
