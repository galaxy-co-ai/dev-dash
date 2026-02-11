import { NextResponse } from 'next/server';
import { db } from '@/db';
import { devTasks } from '@/db/schema';

/**
 * POST /api/admin/ai/find-blockers
 * Identifies blocking issues and stalled tasks
 */
export async function POST() {
  try {
    const tasks = await db.select().from(devTasks);
    
    const blockers: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Find tasks in backlog (often blocked)
    const backlogTasks = tasks.filter(t => t.status === 'backlog');
    
    // Categorize blockers
    const clientBlockers = backlogTasks.filter(t => 
      t.description?.toLowerCase().includes('awaiting') ||
      t.description?.toLowerCase().includes('client') ||
      t.description?.toLowerCase().includes('credentials')
    );

    const technicalBlockers = backlogTasks.filter(t => 
      t.description?.toLowerCase().includes('error') ||
      t.description?.toLowerCase().includes('bug') ||
      t.description?.toLowerCase().includes('fix')
    );

    // Report client blockers
    if (clientBlockers.length > 0) {
      blockers.push(`🔒 ${clientBlockers.length} item${clientBlockers.length > 1 ? 's' : ''} awaiting client action:`);
      clientBlockers.slice(0, 3).forEach(t => {
        blockers.push(`   • ${t.title}`);
      });
    }

    // Report technical blockers
    if (technicalBlockers.length > 0) {
      blockers.push(`🔧 ${technicalBlockers.length} technical blocker${technicalBlockers.length > 1 ? 's' : ''}:`);
      technicalBlockers.slice(0, 3).forEach(t => {
        blockers.push(`   • ${t.title}`);
      });
    }

    // Find stalled tasks (in progress for a while)
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
    const stalledTasks = inProgressTasks.filter(t => {
      // Check if task has checklist items but none completed recently
      const checklist = t.checklist || [];
      if (checklist.length === 0) return false;
      const completed = checklist.filter(i => i.completed).length;
      return completed === 0; // No progress on checklist
    });

    if (stalledTasks.length > 0) {
      warnings.push(`⚠️ ${stalledTasks.length} task${stalledTasks.length > 1 ? 's' : ''} started but no checklist progress:`);
      stalledTasks.slice(0, 3).forEach(t => {
        warnings.push(`   • ${t.title}`);
      });
    }

    // Find urgent items not being worked on
    const urgentBacklog = tasks.filter(t => 
      t.priority === 'urgent' && (t.status === 'backlog' || t.status === 'todo')
    );
    
    if (urgentBacklog.length > 0) {
      warnings.push(`🚨 ${urgentBacklog.length} urgent item${urgentBacklog.length > 1 ? 's' : ''} not in progress`);
    }

    // Generate suggestions
    if (clientBlockers.length > 0) {
      suggestions.push('Follow up with client on pending credentials and account setups');
    }

    if (technicalBlockers.length > 0) {
      suggestions.push('Schedule time to address technical blockers');
    }

    if (stalledTasks.length > 0) {
      suggestions.push('Break down stalled tasks into smaller checklist items');
    }

    if (urgentBacklog.length > 0) {
      suggestions.push('Prioritize starting urgent tasks');
    }

    // Combine all findings
    const details = [...blockers, ...warnings];

    if (details.length === 0) {
      details.push('✅ No blockers detected!');
      details.push('All tasks are progressing normally.');
    }

    return NextResponse.json({
      success: true,
      title: 'Blocker Analysis',
      summary: blockers.length > 0 
        ? `Found ${clientBlockers.length + technicalBlockers.length} blockers and ${stalledTasks.length} stalled tasks.`
        : 'No major blockers found. Project is flowing smoothly!',
      details,
      suggestions: suggestions.length > 0 ? suggestions : ['Continue current momentum!'],
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      title: 'Analysis Failed',
      summary: 'Could not analyze blockers.',
      details: [error instanceof Error ? error.message : 'Unknown error'],
    }, { status: 500 });
  }
}
