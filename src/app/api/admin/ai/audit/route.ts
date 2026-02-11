import { NextResponse } from 'next/server';
import { db } from '@/db';
import { devTasks } from '@/db/schema';

/**
 * POST /api/admin/ai/audit
 * Performs a project health audit - analyzes tasks, phases, blockers
 */
export async function POST() {
  try {
    // Fetch all tasks
    const tasks = await db.select().from(devTasks);
    
    // Analyze task distribution
    const total = tasks.length;
    const done = tasks.filter(t => t.status === 'done').length;
    const inProgress = tasks.filter(t => t.status === 'in_progress').length;
    const blocked = tasks.filter(t => t.status === 'backlog').length;
    const todo = tasks.filter(t => t.status === 'todo').length;
    const urgent = tasks.filter(t => t.priority === 'urgent' && t.status !== 'done').length;
    
    // Analyze by phase
    const phaseStats: Record<string, { total: number; done: number }> = {};
    tasks.forEach(task => {
      if (task.phaseId) {
        if (!phaseStats[task.phaseId]) {
          phaseStats[task.phaseId] = { total: 0, done: 0 };
        }
        phaseStats[task.phaseId].total++;
        if (task.status === 'done') {
          phaseStats[task.phaseId].done++;
        }
      }
    });

    // Find incomplete phases
    const incompletePhases = Object.entries(phaseStats)
      .filter(([, stats]) => stats.done < stats.total)
      .map(([id, stats]) => {
        const phaseName = tasks.find(t => t.phaseId === id)?.phaseName || `Phase ${id}`;
        return `${phaseName}: ${stats.done}/${stats.total} complete`;
      });

    // Calculate overall progress
    const progress = total > 0 ? Math.round((done / total) * 100) : 0;
    
    // Generate details
    const details = [
      `Overall progress: ${progress}% (${done}/${total} tasks)`,
      `In progress: ${inProgress} tasks`,
      `To do: ${todo} tasks`,
      `Backlog/Blocked: ${blocked} tasks`,
      urgent > 0 ? `⚠️ ${urgent} urgent task${urgent > 1 ? 's' : ''} pending` : '✓ No urgent items pending',
    ];

    // Generate suggestions
    const suggestions: string[] = [];
    
    if (urgent > 0) {
      suggestions.push('Address urgent tasks first - they may be blocking other work');
    }
    
    if (blocked > todo + inProgress) {
      suggestions.push('Many tasks in backlog - consider prioritizing and moving to "To Do"');
    }
    
    if (inProgress > 5) {
      suggestions.push('Many tasks in progress - consider completing some before starting new ones');
    }
    
    if (incompletePhases.length > 0 && incompletePhases.length <= 3) {
      suggestions.push(`Focus on completing: ${incompletePhases.slice(0, 2).join(', ')}`);
    }

    if (suggestions.length === 0) {
      suggestions.push('Project is in good shape! Keep up the momentum.');
    }

    return NextResponse.json({
      success: true,
      title: 'Project Audit Complete',
      summary: `Project is ${progress}% complete with ${inProgress} tasks in progress and ${urgent} urgent items.`,
      details,
      suggestions,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      title: 'Audit Failed',
      summary: 'Could not complete project audit.',
      details: [error instanceof Error ? error.message : 'Unknown error'],
    }, { status: 500 });
  }
}
