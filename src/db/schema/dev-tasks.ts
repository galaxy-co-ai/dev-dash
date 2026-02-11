import { pgTable, uuid, text, timestamp, index, pgEnum, jsonb } from 'drizzle-orm/pg-core';

/**
 * Checklist item type for task sub-items
 */
export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

/**
 * Task status enum - kanban-style workflow
 */
export const taskStatusEnum = pgEnum('task_status', [
  'backlog',
  'todo',
  'in_progress',
  'review',
  'done',
]);

/**
 * Task priority enum
 */
export const taskPriorityEnum = pgEnum('task_priority', [
  'low',
  'medium',
  'high',
  'urgent',
]);

/**
 * Task category enum - type of development work
 */
export const taskCategoryEnum = pgEnum('task_category', [
  'feature',
  'bug',
  'refactor',
  'design',
  'docs',
  'test',
  'chore',
]);

/**
 * Dev tasks table - internal task tracking for project management
 */
export const devTasks = pgTable(
  'dev_tasks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    // Task details
    title: text('title').notNull(),
    description: text('description'),
    // Checklist items - array of { id: string, text: string, completed: boolean }
    checklist: jsonb('checklist').$type<ChecklistItem[]>().default([]),
    // SOW Phase tracking - links task to a phase in the scope of work
    phaseId: text('phase_id'), // e.g., "1", "2", "3"
    phaseName: text('phase_name'), // e.g., "Discovery & Kickoff", "Foundations"
    sowDeliverable: text('sow_deliverable'), // Original SOW deliverable name for reference
    // Classification
    status: taskStatusEnum('status').default('backlog').notNull(),
    priority: taskPriorityEnum('priority').default('medium').notNull(),
    category: taskCategoryEnum('category').default('feature').notNull(),
    // Linking - plain UUID, no foreign key constraint for template portability
    feedbackId: uuid('feedback_id'),
    // Scheduling
    dueDate: timestamp('due_date', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('dev_tasks_status_idx').on(table.status),
    index('dev_tasks_priority_idx').on(table.priority),
    index('dev_tasks_category_idx').on(table.category),
    index('dev_tasks_feedback_idx').on(table.feedbackId),
    index('dev_tasks_created_idx').on(table.createdAt),
  ]
);

export type DevTask = typeof devTasks.$inferSelect;
export type NewDevTask = typeof devTasks.$inferInsert;
