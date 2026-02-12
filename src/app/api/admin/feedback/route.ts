import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, desc, eq, and, or } from '@/db';
import { like } from 'drizzle-orm';
import { feedback, type NewFeedback } from '@/db/schema';

/**
 * POST /api/admin/feedback
 * Create new feedback entry (called from feedback widget)
 * Also auto-creates a task for bugs and feature suggestions
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const userContextSchema = z.object({
      viewportWidth: z.number().optional(),
      viewportHeight: z.number().optional(),
      scrollPosition: z.number().optional(),
      deviceType: z.enum(['mobile', 'tablet', 'desktop']).optional(),
      browserName: z.string().optional(),
      browserVersion: z.string().optional(),
      osName: z.string().optional(),
      referrer: z.string().optional(),
      timeOnPage: z.number().optional(),
      interactionCount: z.number().optional(),
      lastAction: z.string().optional(),
    }).optional();

    const targetElementInfoSchema = z.object({
      selector: z.string().optional(),
      tagName: z.string().optional(),
      className: z.string().optional(),
      id: z.string().optional(),
      text: z.string().optional(),
      rect: z.object({
        x: z.number(),
        y: z.number(),
        width: z.number(),
        height: z.number(),
      }).optional(),
      screenshotUrl: z.string().optional(),
    }).optional();

    const schema = z.object({
      reason: z.enum(['bug', 'suggestion', 'general']),
      subOption: z.string().min(1),
      customReason: z.string().optional(),
      notes: z.string().optional(),
      page: z.string().min(1),
      userAgent: z.string().optional(),
      timestamp: z.string().datetime(),
      projectId: z.string().uuid().optional(),
      // New context fields
      targetElement: z.string().optional(),
      targetElementInfo: targetElementInfoSchema,
      sessionId: z.string().optional(),
      userId: z.string().optional(),
      userContext: userContextSchema,
    });

    const validated = schema.parse(body);

    // Auto-determine priority based on feedback type
    let priority: 'low' | 'medium' | 'high' | 'critical' = 'medium';
    if (validated.reason === 'bug') {
      // Bugs related to pages not loading are critical
      if (validated.subOption === 'page-not-loading') {
        priority = 'critical';
      } else if (validated.subOption === 'button-not-working') {
        priority = 'high';
      } else {
        priority = 'medium';
      }
    } else if (validated.reason === 'suggestion') {
      priority = 'low';
    }

    const newFeedback: NewFeedback = {
      reason: validated.reason,
      subOption: validated.subOption,
      customReason: validated.customReason || null,
      priority,
      notes: validated.notes || null,
      page: validated.page,
      projectId: validated.projectId || null,
      targetElement: validated.targetElement || null,
      targetElementInfo: validated.targetElementInfo || null,
      sessionId: validated.sessionId || null,
      userId: validated.userId || null,
      userAgent: validated.userAgent || null,
      userContext: validated.userContext || null,
      feedbackTimestamp: new Date(validated.timestamp),
      status: 'new',
    };

    const [created] = await db.insert(feedback).values(newFeedback).returning();

    return NextResponse.json({ success: true, feedback: created }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid feedback data', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Failed to submit feedback:', error);
    return NextResponse.json(
      { error: 'Failed to submit feedback' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/feedback
 * List all feedback entries with optional filters, search, and pagination
 */
export async function GET(request: NextRequest) {
  try {
    // Check admin authentication
    const adminToken = request.cookies.get('admin_session')?.value;
    const expectedToken = process.env.ADMIN_SESSION_TOKEN;
    if (!adminToken || (expectedToken && adminToken !== expectedToken)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const reason = searchParams.get('reason');
    const priority = searchParams.get('priority');
    const search = searchParams.get('search');
    const projectId = searchParams.get('projectId');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Build filter conditions
    const conditions = [];
    if (projectId) {
      conditions.push(eq(feedback.projectId, projectId));
    }
    
    if (status && ['new', 'reviewed', 'in_progress', 'resolved', 'wont_fix'].includes(status)) {
      conditions.push(eq(feedback.status, status as typeof feedback.status.enumValues[number]));
    }
    if (reason && ['bug', 'suggestion', 'general'].includes(reason)) {
      conditions.push(eq(feedback.reason, reason as typeof feedback.reason.enumValues[number]));
    }
    if (priority && ['low', 'medium', 'high', 'critical'].includes(priority)) {
      conditions.push(eq(feedback.priority, priority as typeof feedback.priority.enumValues[number]));
    }
    
    // Search across multiple text fields
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      conditions.push(
        or(
          like(feedback.customReason, searchTerm),
          like(feedback.notes, searchTerm),
          like(feedback.subOption, searchTerm),
          like(feedback.page, searchTerm),
          like(feedback.adminNotes, searchTerm),
          like(feedback.targetElement, searchTerm)
        )
      );
    }

    // Combine all conditions with AND
    const whereClause = conditions.length > 0 
      ? conditions.length === 1 
        ? conditions[0] 
        : and(...conditions)
      : undefined;

    // Get total count for pagination
    const countResult = await db
      .select({ count: feedback.id })
      .from(feedback)
      .where(whereClause);
    
    const total = countResult.length;

    // Get paginated results
    const results = await db
      .select()
      .from(feedback)
      .where(whereClause)
      .orderBy(desc(feedback.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({ 
      feedback: results,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + results.length < total,
      }
    });
  } catch (error) {
    console.error('Failed to fetch feedback:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feedback' },
      { status: 500 }
    );
  }
}
