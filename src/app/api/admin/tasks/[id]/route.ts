import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, eq } from '@/db';
import { devTasks } from '@/db/schema';
import { logTaskStatusChange } from '@/lib/changelog';

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
 * GET /api/admin/tasks/[id]
 * Get a single task
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!verifyAdmin(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const [result] = await db
      .select()
      .from(devTasks)
      .where(eq(devTasks.id, id))
      .limit(1);

    if (!result) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json({ task: result });
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch task' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/tasks/[id]
 * Update a task
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!verifyAdmin(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const checklistItemSchema = z.object({
      id: z.string(),
      text: z.string(),
      completed: z.boolean(),
    });

    const schema = z.object({
      title: z.string().min(1).max(200).optional(),
      description: z.string().nullable().optional(),
      status: z.enum(['backlog', 'todo', 'in_progress', 'review', 'done']).optional(),
      priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
      category: z.enum(['feature', 'bug', 'refactor', 'design', 'docs', 'test', 'chore']).optional(),
      dueDate: z.string().datetime().nullable().optional(),
      checklist: z.array(checklistItemSchema).optional(),
      autoAdvance: z.boolean().optional(), // If true, auto-advance status when all checklist items complete
    });

    const validated = schema.parse(body);

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (validated.title !== undefined) updateData.title = validated.title;
    if (validated.description !== undefined) updateData.description = validated.description;
    if (validated.checklist !== undefined) updateData.checklist = validated.checklist;
    
    // Handle status changes
    if (validated.status !== undefined) {
      updateData.status = validated.status;
      if (validated.status === 'done') {
        updateData.completedAt = new Date();
      }
    }
    
    // Auto-advance logic: if all checklist items are complete, advance to next status
    if (validated.autoAdvance && validated.checklist) {
      const allComplete = validated.checklist.length > 0 && 
        validated.checklist.every(item => item.completed);
      
      if (allComplete) {
        // Get current task to determine next status
        const [currentTask] = await db
          .select()
          .from(devTasks)
          .where(eq(devTasks.id, id))
          .limit(1);
        
        if (currentTask) {
          const statusOrder = ['backlog', 'todo', 'in_progress', 'review', 'done'];
          const currentIndex = statusOrder.indexOf(currentTask.status);
          if (currentIndex < statusOrder.length - 1) {
            const nextStatus = statusOrder[currentIndex + 1];
            updateData.status = nextStatus;
            if (nextStatus === 'done') {
              updateData.completedAt = new Date();
            }
          }
        }
      }
    }
    
    if (validated.priority !== undefined) updateData.priority = validated.priority;
    if (validated.category !== undefined) updateData.category = validated.category;
    if (validated.dueDate !== undefined) {
      updateData.dueDate = validated.dueDate ? new Date(validated.dueDate) : null;
    }

    // Get current task to check for status change
    const [currentTask] = await db
      .select()
      .from(devTasks)
      .where(eq(devTasks.id, id))
      .limit(1);

    if (!currentTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const [updated] = await db
      .update(devTasks)
      .set(updateData)
      .where(eq(devTasks.id, id))
      .returning();

    // Log status change to changelog (async, non-blocking)
    if (updateData.status && updateData.status !== currentTask.status) {
      logTaskStatusChange(
        currentTask.title,
        currentTask.status,
        updateData.status as string
      ).catch(() => {});
    }

    return NextResponse.json({ task: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid update data', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/tasks/[id]
 * Delete a task
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!verifyAdmin(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const [deleted] = await db
      .delete(devTasks)
      .where(eq(devTasks.id, id))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    );
  }
}
