import { db, eq, and, desc } from '@/db';
import {
  projects,
  devTasks,
  devNotes,
  changelogEntries,
  feedback,
  type ProjectPhase,
  type ProjectBlocker,
  type NewDevTask,
} from '@/db/schema';
import { logChangelog, logTaskCreated } from '@/lib/changelog';

/**
 * Execute an AI tool call against the database.
 * Returns the JSON result to feed back to Claude as tool_result.
 */
export async function executeTool(
  toolName: string,
  input: Record<string, unknown>,
  projectId: string
): Promise<unknown> {
  switch (toolName) {
    case 'get_project_overview':
      return getProjectOverview(input, projectId);
    case 'get_tasks':
      return getTasks(input, projectId);
    case 'get_feedback_summary':
      return getFeedbackSummary(projectId);
    case 'set_project_phases':
      return setProjectPhases(input, projectId);
    case 'set_project_blockers':
      return setProjectBlockers(input, projectId);
    case 'create_tasks':
      return createTasks(input, projectId);
    case 'update_tasks':
      return updateTasks(input, projectId);
    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

// ── READ TOOLS ──────────────────────────────────────────

async function getProjectOverview(
  input: Record<string, unknown>,
  projectId: string
) {
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!project) return { error: 'Project not found' };

  // Task stats — always included
  const allTasks = await db
    .select()
    .from(devTasks)
    .where(eq(devTasks.projectId, projectId));

  const tasksByStatus: Record<string, number> = {};
  const tasksByPhase: Record<string, number> = {};
  for (const t of allTasks) {
    tasksByStatus[t.status] = (tasksByStatus[t.status] || 0) + 1;
    if (t.phaseId) {
      const key = `Phase ${t.phaseId}: ${t.phaseName || 'Unnamed'}`;
      tasksByPhase[key] = (tasksByPhase[key] || 0) + 1;
    }
  }

  const result: Record<string, unknown> = {
    name: project.name,
    description: project.description,
    phases: project.phases || [],
    blockers: project.blockers || [],
    task_stats: {
      total: allTasks.length,
      by_status: tasksByStatus,
      by_phase: tasksByPhase,
    },
  };

  // Optional full task list
  if (input.include_tasks) {
    result.tasks = allTasks.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      category: t.category,
      phase_id: t.phaseId,
      phase_name: t.phaseName,
      sow_deliverable: t.sowDeliverable,
    }));
  }

  // Optional notes
  if (input.include_notes) {
    const notes = await db
      .select()
      .from(devNotes)
      .where(eq(devNotes.projectId, projectId))
      .orderBy(desc(devNotes.createdAt))
      .limit(20);
    result.notes = notes.map((n) => ({
      id: n.id,
      title: n.title,
      category: n.category,
      content: n.content?.slice(0, 500),
      is_pinned: n.isPinned,
    }));
  }

  // Optional changelog
  if (input.include_changelog) {
    const entries = await db
      .select()
      .from(changelogEntries)
      .where(eq(changelogEntries.projectId, projectId))
      .orderBy(desc(changelogEntries.createdAt))
      .limit(20);
    result.changelog = entries.map((e) => ({
      type: e.type,
      title: e.title,
      description: e.description,
      created_at: e.createdAt,
    }));
  }

  return result;
}

async function getTasks(
  input: Record<string, unknown>,
  projectId: string
) {
  const conditions = [eq(devTasks.projectId, projectId)];

  if (input.status) {
    conditions.push(
      eq(devTasks.status, input.status as typeof devTasks.status.enumValues[number])
    );
  }
  if (input.priority) {
    conditions.push(
      eq(devTasks.priority, input.priority as typeof devTasks.priority.enumValues[number])
    );
  }
  if (input.category) {
    conditions.push(
      eq(devTasks.category, input.category as typeof devTasks.category.enumValues[number])
    );
  }
  if (input.phase_id) {
    conditions.push(eq(devTasks.phaseId, input.phase_id as string));
  }

  const where = conditions.length === 1 ? conditions[0] : and(...conditions);
  const tasks = await db
    .select()
    .from(devTasks)
    .where(where)
    .orderBy(desc(devTasks.createdAt));

  return {
    count: tasks.length,
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      category: t.category,
      phase_id: t.phaseId,
      phase_name: t.phaseName,
      sow_deliverable: t.sowDeliverable,
    })),
  };
}

async function getFeedbackSummary(projectId: string) {
  const items = await db
    .select()
    .from(feedback)
    .where(eq(feedback.projectId, projectId))
    .orderBy(desc(feedback.createdAt));

  const byStatus: Record<string, number> = {};
  for (const f of items) {
    byStatus[f.status] = (byStatus[f.status] || 0) + 1;
  }

  return {
    total: items.length,
    by_status: byStatus,
    recent: items.slice(0, 10).map((f) => ({
      id: f.id,
      reason: f.reason,
      sub_option: f.subOption,
      priority: f.priority,
      notes: f.notes?.slice(0, 200),
      status: f.status,
      page: f.page,
      created_at: f.createdAt,
    })),
  };
}

// ── WRITE TOOLS ─────────────────────────────────────────

async function setProjectPhases(
  input: Record<string, unknown>,
  projectId: string
) {
  const phases = input.phases as ProjectPhase[];
  if (!Array.isArray(phases)) {
    return { error: 'phases must be an array' };
  }

  await db
    .update(projects)
    .set({ phases, updatedAt: new Date() })
    .where(eq(projects.id, projectId));

  // Log changelog
  await logChangelog({
    type: 'update',
    title: `SOW phases updated (${phases.length} phases)`,
    description: phases.map((p) => `Phase ${p.id}: ${p.name}`).join(', '),
    isAutoGenerated: true,
    projectId,
  });

  return {
    success: true,
    phase_count: phases.length,
    phases: phases.map((p) => ({ id: p.id, name: p.name, status: p.status })),
  };
}

async function setProjectBlockers(
  input: Record<string, unknown>,
  projectId: string
) {
  const blockers = input.blockers as ProjectBlocker[];
  if (!Array.isArray(blockers)) {
    return { error: 'blockers must be an array' };
  }

  await db
    .update(projects)
    .set({ blockers, updatedAt: new Date() })
    .where(eq(projects.id, projectId));

  if (blockers.length > 0) {
    await logChangelog({
      type: 'blocker',
      title: `Blockers updated (${blockers.length} items)`,
      description: blockers.map((b) => b.item).join(', '),
      isAutoGenerated: true,
      projectId,
    });
  }

  return { success: true, blocker_count: blockers.length };
}

async function createTasks(
  input: Record<string, unknown>,
  projectId: string
) {
  const tasksInput = input.tasks as Array<Record<string, unknown>>;
  if (!Array.isArray(tasksInput) || tasksInput.length === 0) {
    return { error: 'tasks must be a non-empty array' };
  }
  if (tasksInput.length > 50) {
    return { error: 'Maximum 50 tasks per batch' };
  }

  const newTasks: NewDevTask[] = tasksInput.map((t) => ({
    title: t.title as string,
    description: (t.description as string) || null,
    status:
      (t.status as typeof devTasks.status.enumValues[number]) || 'backlog',
    priority:
      (t.priority as typeof devTasks.priority.enumValues[number]) || 'medium',
    category:
      (t.category as typeof devTasks.category.enumValues[number]) || 'feature',
    phaseId: (t.phase_id as string) || null,
    phaseName: (t.phase_name as string) || null,
    sowDeliverable: (t.sow_deliverable as string) || null,
    projectId,
  }));

  const created = await db.insert(devTasks).values(newTasks).returning();

  // Log changelog entries for batch creation (single entry, not per-task)
  await logChangelog({
    type: 'feature',
    title: `Created ${created.length} tasks via AI`,
    description: created
      .slice(0, 5)
      .map((t) => t.title)
      .join(', ') + (created.length > 5 ? ` (+${created.length - 5} more)` : ''),
    isAutoGenerated: true,
    projectId,
  });

  return {
    success: true,
    created_count: created.length,
    tasks: created.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      phase_id: t.phaseId,
    })),
  };
}

async function updateTasks(
  input: Record<string, unknown>,
  projectId: string
) {
  const updates = input.updates as Array<Record<string, unknown>>;
  if (!Array.isArray(updates) || updates.length === 0) {
    return { error: 'updates must be a non-empty array' };
  }

  const results: Array<{ task_id: string; success: boolean; error?: string }> =
    [];

  for (const update of updates) {
    const taskId = update.task_id as string;
    if (!taskId) {
      results.push({ task_id: 'unknown', success: false, error: 'Missing task_id' });
      continue;
    }

    // Verify the task belongs to this project
    const [existing] = await db
      .select()
      .from(devTasks)
      .where(and(eq(devTasks.id, taskId), eq(devTasks.projectId, projectId)))
      .limit(1);

    if (!existing) {
      results.push({ task_id: taskId, success: false, error: 'Task not found in project' });
      continue;
    }

    const setValues: Record<string, unknown> = { updatedAt: new Date() };
    if (update.status) setValues.status = update.status;
    if (update.priority) setValues.priority = update.priority;
    if (update.phase_id !== undefined) setValues.phaseId = update.phase_id;
    if (update.phase_name !== undefined) setValues.phaseName = update.phase_name;

    await db
      .update(devTasks)
      .set(setValues)
      .where(eq(devTasks.id, taskId));

    // Log status changes to changelog
    if (update.status && update.status !== existing.status) {
      await logChangelog({
        type: 'update',
        title: `Task status changed: ${existing.title}`,
        description: `${existing.status} → ${update.status}`,
        previousStatus: existing.status,
        newStatus: update.status as string,
        isAutoGenerated: true,
        projectId,
      });
    }

    results.push({ task_id: taskId, success: true });
  }

  return {
    success: results.every((r) => r.success),
    updated_count: results.filter((r) => r.success).length,
    results,
  };
}
