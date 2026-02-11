/**
 * Database client configuration
 * Uses Neon serverless driver with Drizzle ORM
 *
 * To swap to a different driver (e.g., node-postgres):
 *   1. Install: npm install pg drizzle-orm/node-postgres
 *   2. Replace neon() with new Pool({ connectionString: ... })
 *   3. Replace drizzle(sql, ...) with drizzle(pool, ...)
 */

import { neon } from '@neondatabase/serverless';
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http';

import * as schema from './schema';

// Lazy-init: Neon validates the URL at call time, so we defer
// until the first query. This lets the app build without DATABASE_URL.
let _db: NeonHttpDatabase<typeof schema> | null = null;

function getDb(): NeonHttpDatabase<typeof schema> {
  if (!_db) {
    const sql = neon(process.env.DATABASE_URL!, {
      fetchOptions: { cache: 'no-store' },
    });
    _db = drizzle(sql, { schema });
  }
  return _db;
}

export const db = new Proxy({} as NeonHttpDatabase<typeof schema>, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});

// Export schema for use in queries
export { schema };

// Re-export common Drizzle utilities
export { eq, and, or, desc, asc, isNull, sql as rawSql } from 'drizzle-orm';
