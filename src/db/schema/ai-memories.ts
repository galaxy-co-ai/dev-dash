import { pgTable, uuid, text, timestamp, index, pgEnum } from 'drizzle-orm/pg-core';

// Memory categories for organization
export const memoryCategory = pgEnum('memory_category', [
  'decision',
  'preference',
  'context',
  'blocker',
  'insight',
  'todo',
]);

export const aiMemories = pgTable('ai_memories', {
  id: uuid('id').defaultRandom().primaryKey(),
  content: text('content').notNull(),
  category: memoryCategory('category').notNull().default('insight'),
  source: text('source').default('chat'),
  importance: text('importance').default('normal'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at'),
}, (table) => ({
  categoryIdx: index('ai_memories_category_idx').on(table.category),
  importanceIdx: index('ai_memories_importance_idx').on(table.importance),
  createdAtIdx: index('ai_memories_created_at_idx').on(table.createdAt),
}));

export type AIMemory = typeof aiMemories.$inferSelect;
export type NewAIMemory = typeof aiMemories.$inferInsert;
