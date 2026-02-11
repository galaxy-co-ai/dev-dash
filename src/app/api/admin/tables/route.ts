import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/db';
import { sql } from 'drizzle-orm';
import { database } from '@/admin.config';

/**
 * Check admin authentication
 */
async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const adminToken = cookieStore.get('admin_session')?.value;
  const expectedToken = process.env.ADMIN_SESSION_TOKEN;

  if (!adminToken) return false;
  if (expectedToken && adminToken !== expectedToken) return false;
  return true;
}

/**
 * GET /api/admin/tables
 * Returns record counts for all registered tables
 */
export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const tableEntries = Object.entries(database.tables);

    const counts = await Promise.all(
      tableEntries.map(([, table]) =>
        db.select({ count: sql<number>`count(*)` }).from(table)
      )
    );

    const tables: Record<string, number> = {};
    tableEntries.forEach(([name], idx) => {
      tables[name] = Number(counts[idx][0]?.count ?? 0);
    });

    return NextResponse.json({ tables });
  } catch (error) {
    console.error('Error fetching table counts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch table data' },
      { status: 500 }
    );
  }
}
