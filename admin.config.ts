/**
 * Admin Panel Configuration
 *
 * Customize this file for your project. All project-specific content
 * (branding, phases, blockers, AI prompts, database tables) is centralized here.
 */

import { devTasks, devNotes, feedback, changelogEntries, aiMemories, projects } from './src/db/schema';
import type { PgTable } from 'drizzle-orm/pg-core';

// ============================================
// Project Identity
// ============================================
export const project = {
  name: 'My Project',
  subtitle: 'Development Dashboard',
  logoPath: '/placeholder-logo.svg',
  logoAlt: 'Project Logo',
  siteUrl: '/',
};

// ============================================
// AI Configuration
// ============================================
export const ai = {
  enabled: true,
  model: 'claude-sonnet-4-20250514',
  projectContext: `You are an AI assistant helping with a web application project.
You have access to the project's task database and persistent memories from past conversations.

You can help with:
- Project planning and sprint management
- Technical architecture decisions
- Code review and debugging strategies
- Feature prioritization
- Identifying blockers and solutions

Be concise but helpful. When discussing tasks or project status, reference specific items when relevant.`,
};

// ============================================
// Database Tables (Database Explorer)
// ============================================
export const database = {
  /** Tables available in the database explorer */
  tables: {
    dev_tasks: devTasks,
    dev_notes: devNotes,
    feedback: feedback,
    changelog_entries: changelogEntries,
    ai_memories: aiMemories,
    projects: projects,
  } as Record<string, PgTable>,

  /** Tables that allow create/update/delete operations */
  editableTables: new Set([
    'feedback',
    'dev_tasks',
    'dev_notes',
  ]),
};

// ============================================
// Command Bar Prompts (Cursor Agent mode)
// ============================================
export const cursorPrompts = {
  audit: {
    name: 'Project Audit',
    prompt: `Run a comprehensive project audit for ${project.name}. Please:

1. Check git status for uncommitted changes
2. Analyze the dev_tasks table for task distribution
3. Check for any linter errors in recently modified files
4. Review the current sprint status
5. Identify any blocking issues or stalled work

Provide a structured report with:
- Overall project health (Good/Warning/Critical)
- Active blockers
- Recommended next actions`,
  },
  syncSprint: {
    name: 'Sync Sprint',
    prompt: `Sync the sprint board for ${project.name}. Please:

1. Query the dev_tasks table for all in-progress tasks
2. Check each task's checklist completion status
3. Auto-advance any tasks where all checklist items are complete
4. Move todo tasks to in_progress if checklist work has started
5. Update the database with any status changes

Report what was synced and any tasks that were advanced.`,
  },
  suggestNext: {
    name: 'Suggest Next Steps',
    prompt: `Analyze the current project state and suggest what to work on next. Please:

1. Review the dev_tasks table for priority and status
2. Identify tasks that are nearly complete (high checklist progress)
3. Look for high-priority items that are blocked
4. Consider dependencies between tasks

Provide 3-5 specific, actionable recommendations ranked by priority.`,
  },
  findBlockers: {
    name: 'Find Blockers',
    prompt: `Identify all blocking issues in the ${project.name} project. Please:

1. Query dev_tasks for items with 'blocked' or 'backlog' status
2. Find tasks marked as awaiting input
3. Check for stalled in-progress tasks (no recent checklist activity)
4. Review any TODO comments in the codebase

Categorize blockers as:
- Dependencies (waiting on external)
- Technical Blockers (bugs, missing APIs)
- Stalled Work (no progress)`,
  },
  generateReport: {
    name: 'Generate Report',
    prompt: `Generate a comprehensive progress report for ${project.name}. Please:

1. Query the dev_tasks table for complete statistics
2. List recent completions (last 7 days if timestamps available)
3. Summarize active work in progress
4. Highlight any risks or blockers

Format as an executive summary suitable for stakeholder review, including:
- Overall Progress: X%
- Key Accomplishments
- Active Work
- Blockers & Risks
- Next Milestones`,
  },
};

// ============================================
// Default Export — single config object
// ============================================
const config = {
  project,
  ai,
  database,
  cursorPrompts,
};

export default config;
export type AdminConfig = typeof config;
