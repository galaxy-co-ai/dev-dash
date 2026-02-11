import { type NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { aiMemories } from '@/db/schema';
import { desc, isNull, or, gt } from 'drizzle-orm';
import { z } from 'zod';

// GET - List all active memories
export async function GET() {
  try {
    const memories = await db
      .select()
      .from(aiMemories)
      .where(
        or(
          isNull(aiMemories.expiresAt),
          gt(aiMemories.expiresAt, new Date())
        )
      )
      .orderBy(desc(aiMemories.createdAt))
      .limit(100);

    return NextResponse.json({
      success: true,
      memories,
      count: memories.length,
    });
  } catch (error) {
    console.error('Error fetching memories:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch memories',
    }, { status: 500 });
  }
}

// POST - Add a new memory manually
const addMemorySchema = z.object({
  content: z.string().min(1),
  category: z.enum(['decision', 'preference', 'context', 'blocker', 'insight', 'todo']).optional(),
  importance: z.enum(['low', 'normal', 'high', 'critical']).optional(),
  expiresAt: z.string().datetime().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = addMemorySchema.parse(body);

    const [memory] = await db
      .insert(aiMemories)
      .values({
        content: validated.content,
        category: validated.category || 'insight',
        importance: validated.importance || 'normal',
        source: 'manual',
        expiresAt: validated.expiresAt ? new Date(validated.expiresAt) : null,
      })
      .returning();

    return NextResponse.json({
      success: true,
      memory,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request',
        details: error.errors,
      }, { status: 400 });
    }

    console.error('Error adding memory:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to add memory',
    }, { status: 500 });
  }
}
