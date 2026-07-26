import mysql from 'mysql2/promise';
import { DB_CONFIG } from './env';

// Direct DB access exists ONLY for fixture cleanup, never for setup or
// assertions (setup goes through the real API; assertions go through the
// real UI) — see e2e/README section in the web README for why this is
// necessary rather than a shortcut: several entities this suite deliberately
// drives into a locked state (§11) have NO delete endpoint at all once
// locked (an approved surat_ijin, a payroll_run, a kasbon mid-deduction),
// exactly mirroring how apps/api/test/*.e2e-spec.ts already clean up their
// own fixtures — direct model .destroy() calls, not a REST DELETE. A single
// shared pool (not one connection per test) since Playwright runs specs in
// parallel workers by default.
let pool: mysql.Pool | undefined;

export function getPool(): mysql.Pool {
  pool ??= mysql.createPool({
    host: DB_CONFIG.host,
    port: DB_CONFIG.port,
    user: DB_CONFIG.user,
    password: DB_CONFIG.password,
    database: DB_CONFIG.database,
    connectionLimit: 5,
  });
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}

type SqlParam = string | number | null;

export async function exec(sql: string, params: SqlParam[] = []): Promise<void> {
  await getPool().execute(sql, params);
}

export async function count(sql: string, params: SqlParam[] = []): Promise<number> {
  const [rows] = await getPool().execute(sql, params);
  return (rows as Array<{ n: number }>)[0].n;
}

export async function queryRows<T>(sql: string, params: SqlParam[] = []): Promise<T[]> {
  const [rows] = await getPool().execute(sql, params);
  return rows as T[];
}
