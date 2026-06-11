import { neon } from "@neondatabase/serverless";
import type { Affiliate, AffiliateApplication, AffiliateWithStats, Commission } from "./types";

/**
 * Affiliate storage on Neon Postgres (serverless HTTP driver).
 *
 * Replaces the original better-sqlite3 implementation, which depended on a
 * writable local filesystem and silently broke when the storefront moved
 * from Hetzner to Vercel (read-only, ephemeral lambdas). Neon's HTTP driver
 * is stateless per request — no pools to leak, works on Vercel functions.
 *
 * `DATABASE_URL` is injected by the Vercel↔Neon integration.
 */

type Sql = ReturnType<typeof neon>;

let _sql: Sql | null = null;
let _schemaReady: Promise<void> | null = null;

function getSql(): Sql {
	if (_sql) return _sql;
	const url = process.env.DATABASE_URL;
	if (!url) {
		throw new Error("[affiliate] DATABASE_URL is not configured");
	}
	_sql = neon(url);
	return _sql;
}

/**
 * Idempotent schema bootstrap — runs once per lambda instance. The Neon HTTP
 * driver executes one statement per request, so statements run sequentially.
 */
const SCHEMA_STATEMENTS = [
	`CREATE TABLE IF NOT EXISTS affiliates (
		id SERIAL PRIMARY KEY,
		code TEXT NOT NULL,
		name TEXT NOT NULL,
		email TEXT NOT NULL,
		commission_rate DOUBLE PRECISION NOT NULL CHECK (commission_rate > 0 AND commission_rate <= 1),
		active BOOLEAN NOT NULL DEFAULT TRUE,
		created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
		updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
	)`,
	`CREATE UNIQUE INDEX IF NOT EXISTS idx_affiliates_code_lower ON affiliates (lower(code))`,
	// Saleor voucher GID minted at approval — needed to deactivate/delete the
	// voucher if the affiliate is ever removed. Nullable: legacy rows and
	// manually-provisioned vouchers don't have it.
	`ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS voucher_id TEXT`,
	`CREATE TABLE IF NOT EXISTS commissions (
		id SERIAL PRIMARY KEY,
		affiliate_id INTEGER NOT NULL REFERENCES affiliates(id),
		order_id TEXT UNIQUE NOT NULL,
		order_number TEXT NOT NULL,
		order_total DOUBLE PRECISION NOT NULL,
		discount_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
		commission_amount DOUBLE PRECISION NOT NULL,
		currency TEXT NOT NULL DEFAULT 'USD',
		status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'reversed')),
		created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
		paid_at TIMESTAMPTZ
	)`,
	// Widen the status check on databases created before 'reversed' existed
	// (refund/cancellation reversal). Drop+add is idempotent across restarts.
	`ALTER TABLE commissions DROP CONSTRAINT IF EXISTS commissions_status_check`,
	`ALTER TABLE commissions ADD CONSTRAINT commissions_status_check CHECK (status IN ('pending', 'approved', 'paid', 'reversed'))`,
	`CREATE INDEX IF NOT EXISTS idx_commissions_affiliate ON commissions (affiliate_id)`,
	`CREATE INDEX IF NOT EXISTS idx_commissions_status ON commissions (status)`,
	`CREATE TABLE IF NOT EXISTS affiliate_applications (
		id SERIAL PRIMARY KEY,
		name TEXT NOT NULL,
		email TEXT NOT NULL,
		website TEXT NOT NULL DEFAULT '',
		social_media TEXT NOT NULL DEFAULT '',
		promotion_plan TEXT NOT NULL DEFAULT '',
		status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
		admin_notes TEXT,
		ip TEXT,
		created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
		reviewed_at TIMESTAMPTZ
	)`,
	`CREATE UNIQUE INDEX IF NOT EXISTS idx_applications_email_lower ON affiliate_applications (lower(email))`,
	`CREATE INDEX IF NOT EXISTS idx_applications_status ON affiliate_applications (status)`,
];

async function db(): Promise<Sql> {
	const sql = getSql();
	if (!_schemaReady) {
		_schemaReady = (async () => {
			for (const statement of SCHEMA_STATEMENTS) {
				await sql.query(statement);
			}
		})().catch((err) => {
			// Allow a retry on the next call instead of caching the failure.
			_schemaReady = null;
			throw err;
		});
	}
	await _schemaReady;
	return sql;
}

/** True when the error is a Postgres unique-constraint violation. */
export function isUniqueViolation(error: unknown): boolean {
	return (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		(error as { code?: string }).code === "23505"
	);
}

// ============================================================================
// Affiliate CRUD
// ============================================================================

export async function createAffiliate(data: {
	code: string;
	name: string;
	email: string;
	commission_rate: number;
	voucher_id?: string | null;
}): Promise<Affiliate> {
	const sql = await db();
	const rows = (await sql.query(
		`INSERT INTO affiliates (code, name, email, commission_rate, voucher_id)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING *`,
		[data.code, data.name, data.email, data.commission_rate, data.voucher_id ?? null],
	)) as Affiliate[];
	return rows[0]!;
}

export async function getAffiliateById(id: number): Promise<Affiliate | null> {
	const sql = await db();
	const rows = (await sql.query(`SELECT * FROM affiliates WHERE id = $1`, [id])) as Affiliate[];
	return rows[0] ?? null;
}

export async function getAffiliateByCode(code: string): Promise<Affiliate | null> {
	const sql = await db();
	const rows = (await sql.query(`SELECT * FROM affiliates WHERE lower(code) = lower($1)`, [
		code,
	])) as Affiliate[];
	return rows[0] ?? null;
}

export async function updateAffiliate(
	id: number,
	data: Partial<Pick<Affiliate, "name" | "email" | "commission_rate" | "active">>,
): Promise<Affiliate | null> {
	const sets: string[] = [];
	const values: unknown[] = [];

	const push = (column: string, value: unknown) => {
		values.push(value);
		sets.push(`${column} = $${values.length}`);
	};

	if (data.name !== undefined) push("name", data.name);
	if (data.email !== undefined) push("email", data.email);
	if (data.commission_rate !== undefined) push("commission_rate", data.commission_rate);
	if (data.active !== undefined) push("active", data.active);

	if (sets.length === 0) return getAffiliateById(id);

	sets.push("updated_at = now()");
	values.push(id);

	const sql = await db();
	const rows = (await sql.query(
		`UPDATE affiliates SET ${sets.join(", ")} WHERE id = $${values.length} RETURNING *`,
		values,
	)) as Affiliate[];
	return rows[0] ?? null;
}

export async function listAffiliates(): Promise<AffiliateWithStats[]> {
	const sql = await db();
	return (await sql.query(
		`SELECT
			a.*,
			COALESCE(SUM(c.commission_amount), 0)::double precision AS total_commissions,
			COALESCE(SUM(CASE WHEN c.status = 'pending' THEN c.commission_amount ELSE 0 END), 0)::double precision AS pending_amount,
			COALESCE(SUM(CASE WHEN c.status = 'approved' THEN c.commission_amount ELSE 0 END), 0)::double precision AS approved_amount,
			COALESCE(SUM(CASE WHEN c.status = 'paid' THEN c.commission_amount ELSE 0 END), 0)::double precision AS paid_amount,
			COUNT(c.id)::int AS order_count
		FROM affiliates a
		LEFT JOIN commissions c ON c.affiliate_id = a.id
		GROUP BY a.id
		ORDER BY a.created_at DESC`,
	)) as AffiliateWithStats[];
}

// ============================================================================
// Commission CRUD
// ============================================================================

/**
 * Idempotent on order_id: Saleor retries any non-2xx delivery, so the same
 * ORDER_PAID can arrive more than once (including concurrently). ON CONFLICT
 * DO NOTHING makes the duplicate a no-op at the database level — returns
 * `null` when the commission already existed.
 */
export async function recordCommission(data: {
	affiliate_id: number;
	order_id: string;
	order_number: string;
	order_total: number;
	discount_amount: number;
	commission_amount: number;
	currency: string;
}): Promise<Commission | null> {
	const sql = await db();
	const rows = (await sql.query(
		`INSERT INTO commissions (affiliate_id, order_id, order_number, order_total, discount_amount, commission_amount, currency)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 ON CONFLICT (order_id) DO NOTHING
		 RETURNING *`,
		[
			data.affiliate_id,
			data.order_id,
			data.order_number,
			data.order_total,
			data.discount_amount,
			data.commission_amount,
			data.currency,
		],
	)) as Commission[];
	return rows[0] ?? null;
}

export async function getCommissionByOrderId(orderId: string): Promise<Commission | null> {
	const sql = await db();
	const rows = (await sql.query(`SELECT * FROM commissions WHERE order_id = $1`, [orderId])) as Commission[];
	return rows[0] ?? null;
}

/**
 * Reverse a commission when its order is refunded or cancelled, so a clawed-back
 * order is never paid out. Idempotent: a row already `reversed` matches nothing
 * and returns `null`; a non-existent order also returns `null`. A reversal wins
 * even over an already-`paid` commission (it flags the off-platform clawback).
 */
export async function reverseCommissionByOrderId(orderId: string): Promise<Commission | null> {
	const sql = await db();
	const rows = (await sql.query(
		`UPDATE commissions SET status = 'reversed'
		 WHERE order_id = $1 AND status <> 'reversed'
		 RETURNING *`,
		[orderId],
	)) as Commission[];
	return rows[0] ?? null;
}

export async function listCommissions(filters?: {
	affiliate_id?: number;
	status?: string;
	limit?: number;
	offset?: number;
}): Promise<{ commissions: Commission[]; total: number }> {
	const where: string[] = [];
	const values: unknown[] = [];

	if (filters?.affiliate_id) {
		values.push(filters.affiliate_id);
		where.push(`c.affiliate_id = $${values.length}`);
	}
	if (filters?.status) {
		values.push(filters.status);
		where.push(`c.status = $${values.length}`);
	}

	const whereClause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
	const limit = filters?.limit || 50;
	const offset = filters?.offset || 0;

	const sql = await db();

	const countRows = (await sql.query(
		`SELECT COUNT(*)::int AS count FROM commissions c ${whereClause}`,
		values,
	)) as Array<{ count: number }>;
	const total = countRows[0]?.count ?? 0;

	const commissions = (await sql.query(
		`SELECT c.*, a.code AS affiliate_code, a.name AS affiliate_name
		 FROM commissions c
		 JOIN affiliates a ON a.id = c.affiliate_id
		 ${whereClause}
		 ORDER BY c.created_at DESC
		 LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
		[...values, limit, offset],
	)) as Commission[];

	return { commissions, total };
}

export async function updateCommissionStatus(
	ids: number[],
	status: "pending" | "approved" | "paid",
): Promise<number> {
	const sql = await db();
	const rows = (await sql.query(
		`UPDATE commissions
		 SET status = $1,
		     paid_at = CASE WHEN $1 = 'paid' THEN now() ELSE NULL END
		 WHERE id = ANY($2::int[])
		 RETURNING id`,
		[status, ids],
	)) as Array<{ id: number }>;
	return rows.length;
}

// ============================================================================
// Affiliate Applications
// ============================================================================

export async function createApplication(data: {
	name: string;
	email: string;
	website: string;
	social_media: string;
	promotion_plan: string;
	ip?: string;
}): Promise<AffiliateApplication> {
	const sql = await db();
	const rows = (await sql.query(
		`INSERT INTO affiliate_applications (name, email, website, social_media, promotion_plan, ip)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING *`,
		[data.name, data.email, data.website, data.social_media, data.promotion_plan, data.ip ?? null],
	)) as AffiliateApplication[];
	return rows[0]!;
}

/**
 * Re-submission after a rejection: the email column is unique, so a fresh
 * INSERT would violate the constraint. Reset the existing row to pending
 * with the new content instead.
 */
export async function resubmitApplication(
	id: number,
	data: { name: string; website: string; social_media: string; promotion_plan: string; ip?: string },
): Promise<AffiliateApplication | null> {
	const sql = await db();
	const rows = (await sql.query(
		`UPDATE affiliate_applications
		 SET name = $1, website = $2, social_media = $3, promotion_plan = $4, ip = $5,
		     status = 'pending', admin_notes = NULL, reviewed_at = NULL, created_at = now()
		 WHERE id = $6 AND status = 'rejected'
		 RETURNING *`,
		[data.name, data.website, data.social_media, data.promotion_plan, data.ip ?? null, id],
	)) as AffiliateApplication[];
	return rows[0] ?? null;
}

export async function getApplicationByEmail(email: string): Promise<AffiliateApplication | null> {
	const sql = await db();
	const rows = (await sql.query(`SELECT * FROM affiliate_applications WHERE lower(email) = lower($1)`, [
		email,
	])) as AffiliateApplication[];
	return rows[0] ?? null;
}

/**
 * Durable rate-limit backing: applications from one IP in the last 15
 * minutes. (In-memory counters reset per lambda instance on Vercel, so the
 * route combines both checks.)
 */
export async function countRecentApplicationsByIp(ip: string): Promise<number> {
	const sql = await db();
	const rows = (await sql.query(
		`SELECT COUNT(*)::int AS count
		 FROM affiliate_applications
		 WHERE ip = $1 AND created_at > now() - interval '15 minutes'`,
		[ip],
	)) as Array<{ count: number }>;
	return rows[0]?.count ?? 0;
}

export async function listApplications(filters?: {
	status?: string;
	limit?: number;
	offset?: number;
}): Promise<{ applications: AffiliateApplication[]; total: number }> {
	const where: string[] = [];
	const values: unknown[] = [];

	if (filters?.status) {
		values.push(filters.status);
		where.push(`status = $${values.length}`);
	}

	const whereClause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
	const limit = filters?.limit || 50;
	const offset = filters?.offset || 0;

	const sql = await db();

	const countRows = (await sql.query(
		`SELECT COUNT(*)::int AS count FROM affiliate_applications ${whereClause}`,
		values,
	)) as Array<{ count: number }>;
	const total = countRows[0]?.count ?? 0;

	const applications = (await sql.query(
		`SELECT * FROM affiliate_applications ${whereClause}
		 ORDER BY created_at DESC
		 LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
		[...values, limit, offset],
	)) as AffiliateApplication[];

	return { applications, total };
}

export async function updateApplicationStatus(
	id: number,
	status: "approved" | "rejected",
	admin_notes?: string,
): Promise<AffiliateApplication | null> {
	const sql = await db();
	const rows = (await sql.query(
		`UPDATE affiliate_applications
		 SET status = $1, admin_notes = $2, reviewed_at = now()
		 WHERE id = $3
		 RETURNING *`,
		[status, admin_notes ?? null, id],
	)) as AffiliateApplication[];
	return rows[0] ?? null;
}
