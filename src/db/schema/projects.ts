import { pgTable, uuid, text, timestamp, jsonb, uniqueIndex } from 'drizzle-orm/pg-core';

/**
 * Per-project SOW phase — stored as JSONB on the project record
 */
export interface ProjectDeliverable {
  name: string;
  status: 'complete' | 'in_progress' | 'pending' | 'blocked';
  note?: string;
}

export interface ProjectPhase {
  id: number;
  name: string;
  status: 'complete' | 'in_progress' | 'pending' | 'blocked';
  deliverables: ProjectDeliverable[];
}

/**
 * Per-project blocker — stored as JSONB on the project record
 */
export interface ProjectBlocker {
  item: string;
  owner: string;
  impact: string;
}

/**
 * Projects table — top-level entity for multi-project dashboards
 */
export const projects = pgTable(
  'projects',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    description: text('description'),
    // Per-project SOW data (moved from admin.config.ts)
    phases: jsonb('phases').$type<ProjectPhase[]>().default([]),
    blockers: jsonb('blockers').$type<ProjectBlocker[]>().default([]),
    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('projects_slug_idx').on(table.slug),
  ]
);

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
