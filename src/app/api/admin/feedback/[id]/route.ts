import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, eq } from '@/db';
import { feedback } from '@/db/schema';

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
 * GET /api/admin/feedback/[id]
 * Get a single feedback entry
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
      .from(feedback)
      .where(eq(feedback.id, id))
      .limit(1);

    if (!result) {
      return NextResponse.json({ error: 'Feedback not found' }, { status: 404 });
    }

    return NextResponse.json({ feedback: result });
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch feedback' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/feedback/[id]
 * Update feedback status or admin notes
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

    const schema = z.object({
      status: z.enum(['new', 'reviewed', 'in_progress', 'resolved', 'wont_fix']).optional(),
      priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
      adminNotes: z.string().optional(),
    });

    const validated = schema.parse(body);

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (validated.status) {
      updateData.status = validated.status;
      if (validated.status === 'resolved') {
        updateData.resolvedAt = new Date();
      }
    }

    if (validated.priority) {
      updateData.priority = validated.priority;
    }

    if (validated.adminNotes !== undefined) {
      updateData.adminNotes = validated.adminNotes;
    }

    const [updated] = await db
      .update(feedback)
      .set(updateData)
      .where(eq(feedback.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Feedback not found' }, { status: 404 });
    }

    return NextResponse.json({ feedback: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid update data', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update feedback' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/feedback/[id]
 * Delete a feedback entry
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
      .delete(feedback)
      .where(eq(feedback.id, id))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: 'Feedback not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'Failed to delete feedback' },
      { status: 500 }
    );
  }
}
