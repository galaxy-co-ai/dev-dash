import { pgTable, uuid, text, timestamp, index, pgEnum, jsonb } from 'drizzle-orm/pg-core';

/**
 * Feedback status enum - tracks the lifecycle of feedback items
 */
export const feedbackStatusEnum = pgEnum('feedback_status', [
  'new',
  'reviewed',
  'in_progress',
  'resolved',
  'wont_fix',
]);

/**
 * Feedback reason enum - primary feedback category
 */
export const feedbackReasonEnum = pgEnum('feedback_reason', [
  'bug',
  'suggestion',
  'general',
]);

/**
 * Feedback priority enum - urgency/severity level
 */
export const feedbackPriorityEnum = pgEnum('feedback_priority', [
  'low',
  'medium',
  'high',
  'critical',
]);

/**
 * User context - granular information about what the user was doing
 */
export interface FeedbackUserContext {
  viewportWidth?: number;
  viewportHeight?: number;
  scrollPosition?: number;
  deviceType?: 'mobile' | 'tablet' | 'desktop';
  browserName?: string;
  browserVersion?: string;
  osName?: string;
  referrer?: string;
  timeOnPage?: number;
  interactionCount?: number;
  lastAction?: string;
}

/**
 * Target element info - captured when user selects a specific element
 */
export interface TargetElementInfo {
  selector?: string;
  tagName?: string;
  className?: string;
  id?: string;
  text?: string;
  rect?: { x: number; y: number; width: number; height: number };
  screenshotUrl?: string;
}

/**
 * Feedback table - stores user feedback from the feedback widget
 */
export const feedback = pgTable(
  'feedback',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    // Feedback categorization
    reason: feedbackReasonEnum('reason').notNull(),
    subOption: text('sub_option').notNull(),
    customReason: text('custom_reason'),
    // Priority/severity
    priority: feedbackPriorityEnum('priority').default('medium').notNull(),
    // User input
    notes: text('notes'),
    // Context - page and element
    page: text('page').notNull(),
    targetElement: text('target_element'),
    targetElementInfo: jsonb('target_element_info').$type<TargetElementInfo>(),
    // Context - user session
    sessionId: text('session_id'),
    userId: text('user_id'),
    // Context - environment
    userAgent: text('user_agent'),
    userContext: jsonb('user_context').$type<FeedbackUserContext>(),
    feedbackTimestamp: timestamp('feedback_timestamp', { withTimezone: true }).notNull(),
    // Admin management
    status: feedbackStatusEnum('status').default('new').notNull(),
    adminNotes: text('admin_notes'),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    // Auto-generated task link
    taskId: uuid('task_id'),
    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('feedback_status_idx').on(table.status),
    index('feedback_reason_idx').on(table.reason),
    index('feedback_priority_idx').on(table.priority),
    index('feedback_created_idx').on(table.createdAt),
    index('feedback_session_idx').on(table.sessionId),
  ]
);

export type Feedback = typeof feedback.$inferSelect;
export type NewFeedback = typeof feedback.$inferInsert;
