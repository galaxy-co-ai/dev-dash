import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { feedback, devTasks, devNotes, changelogEntries } from '@/db/schema';
import { count, eq, gte, sql, and, type SQL } from 'drizzle-orm';

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

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    const sevenDaysAgo = getDaysAgo(7);
    const fourteenDaysAgo = getDaysAgo(14);

    // Project filter conditions per table
    const pf = projectId ? eq(feedback.projectId, projectId) : undefined;
    const pt = projectId ? eq(devTasks.projectId, projectId) : undefined;
    const pn = projectId ? eq(devNotes.projectId, projectId) : undefined;
    const pc = projectId ? eq(changelogEntries.projectId, projectId) : undefined;

    // Helper: combine project filter with additional condition
    const withFilter = (projectFilter: SQL | undefined, condition: SQL): SQL =>
      projectFilter ? and(projectFilter, condition)! : condition;

    // ========================================
    // FEEDBACK STATS
    // ========================================
    const [feedbackTotal] = await db.select({ count: count() }).from(feedback).where(pf);
    const [feedbackNew] = await db.select({ count: count() }).from(feedback).where(withFilter(pf, eq(feedback.status, 'new')));
    const [feedbackInProgress] = await db.select({ count: count() }).from(feedback).where(withFilter(pf, eq(feedback.status, 'in_progress')));
    const [feedbackResolved] = await db.select({ count: count() }).from(feedback).where(withFilter(pf, eq(feedback.status, 'resolved')));

    // Feedback by reason for chart
    const feedbackByReason = await db
      .select({ reason: feedback.reason, count: count() })
      .from(feedback)
      .where(pf)
      .groupBy(feedback.reason);

    // ========================================
    // TASK STATS
    // ========================================
    const [tasksTotal] = await db.select({ count: count() }).from(devTasks).where(pt);
    const [tasksTodo] = await db.select({ count: count() }).from(devTasks).where(withFilter(pt, eq(devTasks.status, 'todo')));
    const [tasksInProgress] = await db.select({ count: count() }).from(devTasks).where(withFilter(pt, eq(devTasks.status, 'in_progress')));
    const [tasksDone] = await db.select({ count: count() }).from(devTasks).where(withFilter(pt, eq(devTasks.status, 'done')));
    const [tasksBacklog] = await db.select({ count: count() }).from(devTasks).where(withFilter(pt, eq(devTasks.status, 'backlog')));
    const [tasksReview] = await db.select({ count: count() }).from(devTasks).where(withFilter(pt, eq(devTasks.status, 'review')));

    // Tasks by priority
    const tasksByPriority = await db
      .select({ priority: devTasks.priority, count: count() })
      .from(devTasks)
      .where(pt)
      .groupBy(devTasks.priority);

    // Tasks by category
    const tasksByCategory = await db
      .select({ category: devTasks.category, count: count() })
      .from(devTasks)
      .where(pt)
      .groupBy(devTasks.category);

    // ========================================
    // NOTES STATS
    // ========================================
    const [notesTotal] = await db.select({ count: count() }).from(devNotes).where(pn);
    const [notesPinned] = await db.select({ count: count() }).from(devNotes).where(withFilter(pn, eq(devNotes.isPinned, true)));

    // ========================================
    // CHANGELOG STATS
    // ========================================
    const [changelogTotal] = await db.select({ count: count() }).from(changelogEntries).where(pc);

    // ========================================
    // TRENDS (last 7 days vs previous 7 days)
    // ========================================
    const [feedbackLast7Days] = await db
      .select({ count: count() })
      .from(feedback)
      .where(withFilter(pf, gte(feedback.createdAt, sevenDaysAgo)));

    const [feedbackPrev7Days] = await db
      .select({ count: count() })
      .from(feedback)
      .where(withFilter(pf, sql`${feedback.createdAt} >= ${fourteenDaysAgo} AND ${feedback.createdAt} < ${sevenDaysAgo}`));

    const [tasksCompletedLast7Days] = await db
      .select({ count: count() })
      .from(devTasks)
      .where(withFilter(pt, gte(devTasks.completedAt, sevenDaysAgo)));

    const [tasksCompletedPrev7Days] = await db
      .select({ count: count() })
      .from(devTasks)
      .where(withFilter(pt, sql`${devTasks.completedAt} >= ${fourteenDaysAgo} AND ${devTasks.completedAt} < ${sevenDaysAgo}`));

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
      .where(withFilter(pf, gte(feedback.createdAt, sevenDaysAgo)))
      .groupBy(sql`DATE(${feedback.createdAt})`);

    // Get tasks completed per day
    const tasksCompletedPerDay = await db
      .select({
        date: sql<string>`DATE(${devTasks.completedAt})::text`,
        count: count(),
      })
      .from(devTasks)
      .where(withFilter(pt, gte(devTasks.completedAt, sevenDaysAgo)))
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
