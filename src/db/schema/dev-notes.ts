import { pgTable, uuid, text, timestamp, boolean, index, pgEnum } from 'drizzle-orm/pg-core';

/**
 * Note category enum - types of development notes
 */
export const noteCategoryEnum = pgEnum('note_category', [
  'architecture',
  'decision',
  'idea',
  'reference',
  'todo',
  'meeting',
  'general',
]);

/**
 * Dev notes table - internal notes for project documentation
 */
export const devNotes = pgTable(
  'dev_notes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    // Note content
    title: text('title').notNull(),
    content: text('content').notNull(),
    // Classification
    category: noteCategoryEnum('category').default('general').notNull(),
    // Display
    isPinned: boolean('is_pinned').default(false).notNull(),
    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('dev_notes_category_idx').on(table.category),
    index('dev_notes_pinned_idx').on(table.isPinned),
    index('dev_notes_created_idx').on(table.createdAt),
  ]
);

export type DevNote = typeof devNotes.$inferSelect;
export type NewDevNote = typeof devNotes.$inferInsert;
