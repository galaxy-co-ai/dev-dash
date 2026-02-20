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
// Default Export — single config object
// ============================================
const config = {
  project,
  ai,
  database,
};

export default config;
export type AdminConfig = typeof config;
