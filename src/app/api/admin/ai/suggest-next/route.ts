import { NextResponse } from 'next/server';
import { db } from '@/db';
import { devTasks } from '@/db/schema';

/**
 * POST /api/admin/ai/suggest-next
 * AI suggests what to work on next based on priorities and dependencies
 */
export async function POST() {
  try {
    const tasks = await db.select().from(devTasks);
    
    // Find tasks that need attention
    const urgent = tasks.filter(t => 
      t.priority === 'urgent' && t.status !== 'done'
    );
    
    const _highPriority = tasks.filter(t =>
      t.priority === 'high' && t.status !== 'done' && t.status !== 'review'
    );
    void _highPriority; // Reserved for future AI suggestions
    
    const inProgress = tasks.filter(t => t.status === 'in_progress');
    const inReview = tasks.filter(t => t.status === 'review');
    const todo = tasks.filter(t => t.status === 'todo');
    
    // Find tasks with partial checklists
    const partiallyComplete = inProgress.filter(t => {
      const checklist = t.checklist || [];
      if (checklist.length === 0) return false;
      const completed = checklist.filter(i => i.completed).length;
      return completed > 0 && completed < checklist.length;
    });

    // Build suggestions based on priority
    const suggestions: string[] = [];
    const details: string[] = [];

    // Priority 1: Urgent items
    if (urgent.length > 0) {
      suggestions.push(`🔴 URGENT: "${urgent[0].title}" - tackle this first!`);
      if (urgent.length > 1) {
        details.push(`${urgent.length} urgent items total`);
      }
    }

    // Priority 2: Items in review (complete them first)
    if (inReview.length > 0) {
      suggestions.push(`Complete review: "${inReview[0].title}"`);
    }

    // Priority 3: Partially complete items (finish what you started)
    if (partiallyComplete.length > 0) {
      const task = partiallyComplete[0];
      const checklist = task.checklist || [];
      const remaining = checklist.filter(i => !i.completed).length;
      suggestions.push(`Continue "${task.title}" - ${remaining} item${remaining > 1 ? 's' : ''} left`);
    }

    // Priority 4: High priority from todo
    const highPriorityTodo = todo.filter(t => t.priority === 'high' || t.priority === 'urgent');
    if (highPriorityTodo.length > 0 && suggestions.length < 3) {
      suggestions.push(`Start: "${highPriorityTodo[0].title}" (high priority)`);
    }

    // Priority 5: Anything in todo
    if (suggestions.length < 3 && todo.length > 0) {
      const next = todo.find(t => !highPriorityTodo.includes(t));
      if (next) {
        suggestions.push(`Consider: "${next.title}"`);
      }
    }

    // Build summary
    details.push(`${inProgress.length} in progress, ${todo.length} to do, ${inReview.length} in review`);
    
    if (inProgress.length >= 3) {
      details.push('⚠️ Many items in progress - consider focusing on fewer tasks');
    }

    // Phase-based insight
    const phaseProgress: Record<string, { total: number; done: number }> = {};
    tasks.forEach(t => {
      if (t.phaseId && t.phaseName) {
        if (!phaseProgress[t.phaseId]) {
          phaseProgress[t.phaseId] = { total: 0, done: 0 };
        }
        phaseProgress[t.phaseId].total++;
        if (t.status === 'done') {
          phaseProgress[t.phaseId].done++;
        }
      }
    });

    // Find nearly complete phases
    Object.entries(phaseProgress).forEach(([id, stats]) => {
      const remaining = stats.total - stats.done;
      if (remaining > 0 && remaining <= 2 && stats.done > 0) {
        const phaseName = tasks.find(t => t.phaseId === id)?.phaseName;
        details.push(`${phaseName} is ${remaining} task${remaining > 1 ? 's' : ''} from complete!`);
      }
    });

    if (suggestions.length === 0) {
      suggestions.push('All caught up! Consider reviewing backlog for new work.');
    }

    return NextResponse.json({
      success: true,
      title: 'Next Steps Recommended',
      summary: suggestions[0] || 'Analyzing project state...',
      details,
      suggestions: suggestions.slice(0, 4),
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      title: 'Analysis Failed',
      summary: 'Could not generate recommendations.',
      details: [error instanceof Error ? error.message : 'Unknown error'],
    }, { status: 500 });
  }
}
