import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, desc, eq } from '@/db';
import { devTasks, type NewDevTask } from '@/db/schema';
import { logTaskCreated } from '@/lib/changelog';

/**
 * Helper to verify admin authentication
 */
function verifyAdmin(request: NextRequest): boolean {
  const adminToken = request.cookies.get('admin_session')?.value;
  const expectedToken = process.env.ADMIN_SESSION_TOKEN;
  if (!expectedToken) return !!adminToken;
  return adminToken === expectedToken;
}

/**
 * GET /api/admin/tasks
 * List all tasks with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    if (!verifyAdmin(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const category = searchParams.get('category');

    let query = db.select().from(devTasks);

    if (status && ['backlog', 'todo', 'in_progress', 'review', 'done'].includes(status)) {
      query = query.where(eq(devTasks.status, status as typeof devTasks.status.enumValues[number])) as typeof query;
    }

    const results = await query.orderBy(desc(devTasks.createdAt));

    // Filter in JS for multiple conditions (simpler for now)
    let filtered = results;
    if (priority && ['low', 'medium', 'high', 'urgent'].includes(priority)) {
      filtered = filtered.filter(t => t.priority === priority);
    }
    if (category && ['feature', 'bug', 'refactor', 'design', 'docs', 'test', 'chore'].includes(category)) {
      filtered = filtered.filter(t => t.category === category);
    }

    return NextResponse.json({ tasks: filtered });
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/tasks
 * Create a new task
 */
export async function POST(request: NextRequest) {
  try {
    if (!verifyAdmin(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const schema = z.object({
      title: z.string().min(1).max(200),
      description: z.string().optional(),
      status: z.enum(['backlog', 'todo', 'in_progress', 'review', 'done']).optional(),
      priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
      category: z.enum(['feature', 'bug', 'refactor', 'design', 'docs', 'test', 'chore']).optional(),
      feedbackId: z.string().uuid().optional(),
      dueDate: z.string().datetime().optional(),
    });

    const validated = schema.parse(body);

    const newTask: NewDevTask = {
      title: validated.title,
      description: validated.description || null,
      status: validated.status || 'backlog',
      priority: validated.priority || 'medium',
      category: validated.category || 'feature',
      feedbackId: validated.feedbackId || null,
      dueDate: validated.dueDate ? new Date(validated.dueDate) : null,
    };

    const [created] = await db.insert(devTasks).values(newTask).returning();

    // Log to changelog (async, non-blocking)
    logTaskCreated(created.title).catch((err) => {
      console.error('Failed to log task creation to changelog', err);
    });

    return NextResponse.json({ success: true, task: created }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid task data', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
}
