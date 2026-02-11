import { NextResponse } from 'next/server';
import { db } from '@/db';
import { devTasks } from '@/db/schema';

/**
 * POST /api/admin/ai/generate-report
 * Generates a progress report suitable for stakeholder updates
 */
export async function POST() {
  try {
    const tasks = await db.select().from(devTasks);
    
    // Calculate overall stats
    const total = tasks.length;
    const done = tasks.filter(t => t.status === 'done').length;
    const inProgress = tasks.filter(t => t.status === 'in_progress').length;
    const review = tasks.filter(t => t.status === 'review').length;
    const todo = tasks.filter(t => t.status === 'todo').length;
    const backlog = tasks.filter(t => t.status === 'backlog').length;
    
    const progress = total > 0 ? Math.round((done / total) * 100) : 0;

    // Group by phase
    const phaseStats: Record<string, { 
      name: string;
      total: number; 
      done: number;
      status: string;
    }> = {};
    
    tasks.forEach(t => {
      if (t.phaseId && t.phaseName) {
        if (!phaseStats[t.phaseId]) {
          phaseStats[t.phaseId] = { name: t.phaseName, total: 0, done: 0, status: 'pending' };
        }
        phaseStats[t.phaseId].total++;
        if (t.status === 'done') {
          phaseStats[t.phaseId].done++;
        }
      }
    });

    // Determine phase statuses
    Object.values(phaseStats).forEach(phase => {
      if (phase.done === phase.total) {
        phase.status = '✅ Complete';
      } else if (phase.done > 0) {
        phase.status = '🔄 In Progress';
      } else {
        phase.status = '⏳ Pending';
      }
    });

    // Build report
    const details: string[] = [];
    
    // Executive summary
    details.push(`📊 PROJECT STATUS: ${progress}% Complete`);
    details.push('');
    details.push(`   ✅ Completed: ${done} tasks`);
    details.push(`   🔄 In Progress: ${inProgress + review} tasks`);
    details.push(`   📋 To Do: ${todo} tasks`);
    details.push(`   ⏳ Backlog: ${backlog} tasks`);
    details.push('');
    
    // Phase breakdown
    details.push('📋 PHASE BREAKDOWN:');
    Object.entries(phaseStats)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .forEach(([id, phase]) => {
        const pct = Math.round((phase.done / phase.total) * 100);
        details.push(`   ${phase.status} Phase ${id}: ${phase.name} (${pct}%)`);
      });

    // Recent completions
    const recentlyCompleted = tasks
      .filter(t => t.status === 'done' && t.completedAt)
      .sort((a, b) => 
        new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime()
      )
      .slice(0, 3);

    if (recentlyCompleted.length > 0) {
      details.push('');
      details.push('🎉 RECENTLY COMPLETED:');
      recentlyCompleted.forEach(t => {
        details.push(`   • ${t.title}`);
      });
    }

    // Currently active
    const activeNow = tasks
      .filter(t => t.status === 'in_progress')
      .slice(0, 3);

    if (activeNow.length > 0) {
      details.push('');
      details.push('🔧 CURRENTLY ACTIVE:');
      activeNow.forEach(t => {
        details.push(`   • ${t.title}`);
      });
    }

    // Blockers summary
    const blockedCount = tasks.filter(t => 
      t.status === 'backlog' && 
      (t.description?.toLowerCase().includes('awaiting') || 
       t.description?.toLowerCase().includes('blocked'))
    ).length;

    const suggestions = [];
    
    if (blockedCount > 0) {
      suggestions.push(`${blockedCount} items blocked - follow up on pending dependencies`);
    }

    // Estimate completion
    const remainingWork = total - done;
    if (remainingWork > 0 && inProgress > 0) {
      suggestions.push(`${remainingWork} tasks remaining to complete`);
    }

    return NextResponse.json({
      success: true,
      title: 'Progress Report Generated',
      summary: `Project is ${progress}% complete. ${done} of ${total} deliverables finished.`,
      details,
      suggestions: suggestions.length > 0 ? suggestions : ['Project is on track!'],
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      title: 'Report Failed',
      summary: 'Could not generate progress report.',
      details: [error instanceof Error ? error.message : 'Unknown error'],
    }, { status: 500 });
  }
}
