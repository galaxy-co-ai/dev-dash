import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, desc } from '@/db';
import { devNotes, type NewDevNote } from '@/db/schema';

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
 * GET /api/admin/notes
 * List all notes with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    if (!verifyAdmin(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const pinnedOnly = searchParams.get('pinned') === 'true';

    let results = await db
      .select()
      .from(devNotes)
      .orderBy(desc(devNotes.isPinned), desc(devNotes.createdAt));

    // Filter in JS for simplicity
    if (category && ['architecture', 'decision', 'idea', 'reference', 'todo', 'meeting', 'general'].includes(category)) {
      results = results.filter(n => n.category === category);
    }
    if (pinnedOnly) {
      results = results.filter(n => n.isPinned);
    }

    return NextResponse.json({ notes: results });
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch notes' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/notes
 * Create a new note
 */
export async function POST(request: NextRequest) {
  try {
    if (!verifyAdmin(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const schema = z.object({
      title: z.string().min(1).max(200),
      content: z.string().min(1),
      category: z.enum(['architecture', 'decision', 'idea', 'reference', 'todo', 'meeting', 'general']).optional(),
      isPinned: z.boolean().optional(),
    });

    const validated = schema.parse(body);

    const newNote: NewDevNote = {
      title: validated.title,
      content: validated.content,
      category: validated.category || 'general',
      isPinned: validated.isPinned || false,
    };

    const [created] = await db.insert(devNotes).values(newNote).returning();

    return NextResponse.json({ success: true, note: created }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid note data', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create note' },
      { status: 500 }
    );
  }
}
