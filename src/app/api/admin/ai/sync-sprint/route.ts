import { NextResponse } from 'next/server';
import { db, eq } from '@/db';
import { devTasks } from '@/db/schema';

/**
 * POST /api/admin/ai/sync-sprint
 * Analyzes current sprint and suggests task updates based on checklist progress
 */
export async function POST() {
  try {
    // Fetch active tasks (todo and in_progress)
    const tasks = await db.select().from(devTasks);
    const activeTasks = tasks.filter(t => 
      t.status === 'todo' || t.status === 'in_progress'
    );

    const updates: string[] = [];
    const autoAdvanced: string[] = [];

    // Check each task for checklist completion
    for (const task of activeTasks) {
      const checklist = task.checklist || [];
      
      if (checklist.length > 0) {
        const completed = checklist.filter(item => item.completed).length;
        const total = checklist.length;
        
        // If all items complete, advance the task
        if (completed === total) {
          const statusOrder = ['backlog', 'todo', 'in_progress', 'review', 'done'];
          const currentIndex = statusOrder.indexOf(task.status);
          
          if (currentIndex < statusOrder.length - 1) {
            const newStatus = statusOrder[currentIndex + 1];
            
            await db
              .update(devTasks)
              .set({ 
                status: newStatus as typeof task.status,
                updatedAt: new Date(),
                ...(newStatus === 'done' ? { completedAt: new Date() } : {}),
              })
              .where(eq(devTasks.id, task.id));
            
            autoAdvanced.push(`"${task.title}" → ${newStatus.replace('_', ' ')}`);
          }
        } else if (completed > 0 && task.status === 'todo') {
          // If some items complete but task is still in todo, move to in_progress
          await db
            .update(devTasks)
            .set({ 
              status: 'in_progress',
              updatedAt: new Date(),
            })
            .where(eq(devTasks.id, task.id));
          
          updates.push(`"${task.title}" started (${completed}/${total} items done)`);
        }
      }
    }

    // Calculate sprint stats
    const refreshedTasks = await db.select().from(devTasks);
    const inProgress = refreshedTasks.filter(t => t.status === 'in_progress').length;
    const todo = refreshedTasks.filter(t => t.status === 'todo').length;
    const review = refreshedTasks.filter(t => t.status === 'review').length;

    const details = [
      `Active sprint: ${inProgress} in progress, ${todo} to do, ${review} in review`,
      ...autoAdvanced.map(a => `✓ Advanced: ${a}`),
      ...updates,
    ];

    if (autoAdvanced.length === 0 && updates.length === 0) {
      details.push('No tasks were auto-advanced. Check off more items to progress.');
    }

    const suggestions = [];
    
    if (inProgress === 0 && todo > 0) {
      suggestions.push('No tasks in progress - pick one from "To Do" to start');
    }
    
    if (review > 2) {
      suggestions.push(`${review} tasks in review - consider completing reviews before starting new work`);
    }

    return NextResponse.json({
      success: true,
      title: 'Sprint Synchronized',
      summary: `Analyzed ${activeTasks.length} active tasks. ${autoAdvanced.length} auto-advanced.`,
      details,
      suggestions: suggestions.length > 0 ? suggestions : undefined,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      title: 'Sync Failed',
      summary: 'Could not synchronize sprint status.',
      details: [error instanceof Error ? error.message : 'Unknown error'],
    }, { status: 500 });
  }
}
