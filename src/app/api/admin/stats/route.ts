import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { feedback, devTasks, devNotes, changelogEntries } from '@/db/schema';
import { count, eq, gte, sql } from 'drizzle-orm';

/**
 * Helper to verify admin authentication
 */
function verifyAdmin(request: NextRequest): boolean {
  const adminToken = request.cookies.get('admin_session')?.value;
  const expectedToken = process.env.ADMIN_SESSION_TOKEN;

  if (!expectedToken) {
    return !!adminToken;
  }

  return adminToken === expectedToken;
}

/**
 * Calculate percentage change between two values
 */
function calculatePercentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * Get date N days ago at midnight
 */
function getDaysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(0, 0, 0, 0);
  return date;
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Generate array of dates for the last N days
 */
function getDateRange(days: number): string[] {
  const dates: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    dates.push(formatDate(getDaysAgo(i)));
  }
  return dates;
}

/**
 * GET /api/admin/stats
 * Dashboard statistics for admin tables only
 */
export async function GET(request: NextRequest) {
  try {
    if (!verifyAdmin(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sevenDaysAgo = getDaysAgo(7);
    const fourteenDaysAgo = getDaysAgo(14);

    // ========================================
    // FEEDBACK STATS
    // ========================================
    const [feedbackTotal] = await db.select({ count: count() }).from(feedback);
    const [feedbackNew] = await db.select({ count: count() }).from(feedback).where(eq(feedback.status, 'new'));
    const [feedbackInProgress] = await db.select({ count: count() }).from(feedback).where(eq(feedback.status, 'in_progress'));
    const [feedbackResolved] = await db.select({ count: count() }).from(feedback).where(eq(feedback.status, 'resolved'));

    // Feedback by reason for chart
    const feedbackByReason = await db
      .select({ reason: feedback.reason, count: count() })
      .from(feedback)
      .groupBy(feedback.reason);

    // ========================================
    // TASK STATS
    // ========================================
    const [tasksTotal] = await db.select({ count: count() }).from(devTasks);
    const [tasksTodo] = await db.select({ count: count() }).from(devTasks).where(eq(devTasks.status, 'todo'));
    const [tasksInProgress] = await db.select({ count: count() }).from(devTasks).where(eq(devTasks.status, 'in_progress'));
    const [tasksDone] = await db.select({ count: count() }).from(devTasks).where(eq(devTasks.status, 'done'));
    const [tasksBacklog] = await db.select({ count: count() }).from(devTasks).where(eq(devTasks.status, 'backlog'));
    const [tasksReview] = await db.select({ count: count() }).from(devTasks).where(eq(devTasks.status, 'review'));

    // Tasks by priority
    const tasksByPriority = await db
      .select({ priority: devTasks.priority, count: count() })
      .from(devTasks)
      .groupBy(devTasks.priority);

    // Tasks by category
    const tasksByCategory = await db
      .select({ category: devTasks.category, count: count() })
      .from(devTasks)
      .groupBy(devTasks.category);

    // ========================================
    // NOTES STATS
    // ========================================
    const [notesTotal] = await db.select({ count: count() }).from(devNotes);
    const [notesPinned] = await db.select({ count: count() }).from(devNotes).where(eq(devNotes.isPinned, true));

    // ========================================
    // CHANGELOG STATS
    // ========================================
    const [changelogTotal] = await db.select({ count: count() }).from(changelogEntries);

    // ========================================
    // TRENDS (last 7 days vs previous 7 days)
    // ========================================
    const [feedbackLast7Days] = await db
      .select({ count: count() })
      .from(feedback)
      .where(gte(feedback.createdAt, sevenDaysAgo));

    const [feedbackPrev7Days] = await db
      .select({ count: count() })
      .from(feedback)
      .where(sql`${feedback.createdAt} >= ${fourteenDaysAgo} AND ${feedback.createdAt} < ${sevenDaysAgo}`);

    const [tasksCompletedLast7Days] = await db
      .select({ count: count() })
      .from(devTasks)
      .where(gte(devTasks.completedAt, sevenDaysAgo));

    const [tasksCompletedPrev7Days] = await db
      .select({ count: count() })
      .from(devTasks)
      .where(sql`${devTasks.completedAt} >= ${fourteenDaysAgo} AND ${devTasks.completedAt} < ${sevenDaysAgo}`);

    // ========================================
    // TIME-SERIES DATA (Last 7 days)
    // ========================================
    const dateRange = getDateRange(7);

    // Get feedback per day
    const feedbackPerDay = await db
      .select({
        date: sql<string>`DATE(${feedback.createdAt})::text`,
        count: count(),
      })
      .from(feedback)
      .where(gte(feedback.createdAt, sevenDaysAgo))
      .groupBy(sql`DATE(${feedback.createdAt})`);

    // Get tasks completed per day
    const tasksCompletedPerDay = await db
      .select({
        date: sql<string>`DATE(${devTasks.completedAt})::text`,
        count: count(),
      })
      .from(devTasks)
      .where(gte(devTasks.completedAt, sevenDaysAgo))
      .groupBy(sql`DATE(${devTasks.completedAt})`);

    // Build weekly activity data
    const weeklyActivity = dateRange.map(date => {
      const feedbackForDate = feedbackPerDay.find(f => f.date === date);
      const tasksForDate = tasksCompletedPerDay.find(t => t.date === date);

      return {
        date,
        feedback: feedbackForDate?.count ?? 0,
        tasksCompleted: tasksForDate?.count ?? 0,
      };
    });

    return NextResponse.json({
      feedback: {
        total: feedbackTotal.count,
        new: feedbackNew.count,
        inProgress: feedbackInProgress.count,
        resolved: feedbackResolved.count,
      },
      tasks: {
        total: tasksTotal.count,
        todo: tasksTodo.count,
        inProgress: tasksInProgress.count,
        done: tasksDone.count,
        backlog: tasksBacklog.count,
        review: tasksReview.count,
        completionRate: tasksTotal.count > 0
          ? Math.round((tasksDone.count / tasksTotal.count) * 100)
          : 0,
      },
      notes: {
        total: notesTotal.count,
        pinned: notesPinned.count,
      },
      changelog: {
        total: changelogTotal.count,
      },
      trends: {
        feedbackLast7Days: feedbackLast7Days.count,
        feedbackChange: calculatePercentChange(feedbackLast7Days.count, feedbackPrev7Days.count),
        tasksCompletedLast7Days: tasksCompletedLast7Days.count,
        tasksCompletedChange: calculatePercentChange(tasksCompletedLast7Days.count, tasksCompletedPrev7Days.count),
      },
      chartData: {
        weeklyActivity,
        feedbackByReason: feedbackByReason.map(r => ({
          reason: r.reason || 'general',
          count: r.count,
        })),
        tasksByPriority: tasksByPriority.map(p => ({
          priority: p.priority || 'medium',
          count: p.count,
        })),
        tasksByCategory: tasksByCategory.map(c => ({
          category: c.category || 'feature',
          count: c.count,
        })),
      },
    });
  } catch (error) {
    console.error('Stats API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
