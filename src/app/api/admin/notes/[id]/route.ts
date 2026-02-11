import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, eq } from '@/db';
import { devNotes } from '@/db/schema';

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
 * GET /api/admin/notes/[id]
 * Get a single note
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
      .from(devNotes)
      .where(eq(devNotes.id, id))
      .limit(1);

    if (!result) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    return NextResponse.json({ note: result });
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch note' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/notes/[id]
 * Update a note
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
      title: z.string().min(1).max(200).optional(),
      content: z.string().min(1).optional(),
      category: z.enum(['architecture', 'decision', 'idea', 'reference', 'todo', 'meeting', 'general']).optional(),
      isPinned: z.boolean().optional(),
    });

    const validated = schema.parse(body);

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (validated.title !== undefined) updateData.title = validated.title;
    if (validated.content !== undefined) updateData.content = validated.content;
    if (validated.category !== undefined) updateData.category = validated.category;
    if (validated.isPinned !== undefined) updateData.isPinned = validated.isPinned;

    const [updated] = await db
      .update(devNotes)
      .set(updateData)
      .where(eq(devNotes.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    return NextResponse.json({ note: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid update data', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update note' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/notes/[id]
 * Delete a note
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
      .delete(devNotes)
      .where(eq(devNotes.id, id))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'Failed to delete note' },
      { status: 500 }
    );
  }
}
