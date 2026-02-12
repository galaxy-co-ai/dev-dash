import type Anthropic from '@anthropic-ai/sdk';

/**
 * AI tool definitions for Claude tool use.
 * 7 tools: 3 read, 4 write — giving Claude full project intelligence.
 */
export const aiTools: Anthropic.Tool[] = [
  // ── READ TOOLS ──────────────────────────────────────────
  {
    name: 'get_project_overview',
    description:
      'Get a comprehensive overview of the current project state. Returns phases, blockers, task statistics by status and phase, and optionally the full task list, notes, and changelog. Call this first to understand the project before making changes.',
    input_schema: {
      type: 'object' as const,
      properties: {
        include_tasks: {
          type: 'boolean',
          description: 'Include the full task list (default: false, just returns stats)',
        },
        include_notes: {
          type: 'boolean',
          description: 'Include project notes (default: false)',
        },
        include_changelog: {
          type: 'boolean',
          description: 'Include recent changelog entries (default: false)',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_tasks',
    description:
      'Query tasks with optional filters. Use this when you need to find specific tasks by status, priority, phase, or category.',
    input_schema: {
      type: 'object' as const,
      properties: {
        status: {
          type: 'string',
          enum: ['backlog', 'todo', 'in_progress', 'review', 'done'],
          description: 'Filter by task status',
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'urgent'],
          description: 'Filter by priority',
        },
        category: {
          type: 'string',
          enum: ['feature', 'bug', 'refactor', 'design', 'docs', 'test', 'chore'],
          description: 'Filter by category',
        },
        phase_id: {
          type: 'string',
          description: 'Filter by phase ID (e.g. "1", "2")',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_feedback_summary',
    description:
      'Get a summary of user feedback for the project. Returns counts by status and the 10 most recent feedback items.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },

  // ── WRITE TOOLS ─────────────────────────────────────────
  {
    name: 'set_project_phases',
    description:
      'Replace the project\'s SOW phases array. IMPORTANT: Always call get_project_overview first to read existing phases, then merge your changes before writing. Each phase has deliverables that track scope of work completion.',
    input_schema: {
      type: 'object' as const,
      properties: {
        phases: {
          type: 'array',
          description: 'The complete phases array to set on the project',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number', description: 'Phase number (1, 2, 3...)' },
              name: { type: 'string', description: 'Phase name' },
              status: {
                type: 'string',
                enum: ['complete', 'in_progress', 'pending', 'blocked'],
              },
              deliverables: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', description: 'Deliverable name' },
                    status: {
                      type: 'string',
                      enum: ['complete', 'in_progress', 'pending', 'blocked'],
                    },
                    note: { type: 'string', description: 'Optional note' },
                  },
                  required: ['name', 'status'],
                },
              },
            },
            required: ['id', 'name', 'status', 'deliverables'],
          },
        },
      },
      required: ['phases'],
    },
  },
  {
    name: 'set_project_blockers',
    description:
      'Replace the project\'s blockers array. Always read existing blockers first (via get_project_overview), merge changes, then write back.',
    input_schema: {
      type: 'object' as const,
      properties: {
        blockers: {
          type: 'array',
          description: 'The complete blockers array to set on the project',
          items: {
            type: 'object',
            properties: {
              item: { type: 'string', description: 'What is blocked' },
              owner: { type: 'string', description: 'Who owns resolving this' },
              impact: { type: 'string', description: 'Impact description' },
            },
            required: ['item', 'owner', 'impact'],
          },
        },
      },
      required: ['blockers'],
    },
  },
  {
    name: 'create_tasks',
    description:
      'Create multiple tasks in batch (up to 50). Use this to populate tasks from an SOW or create a set of related tasks. Each task can be linked to a phase via phase_id and phase_name.',
    input_schema: {
      type: 'object' as const,
      properties: {
        tasks: {
          type: 'array',
          description: 'Array of tasks to create (max 50)',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string', description: 'Task title (required)' },
              description: { type: 'string', description: 'Task description' },
              status: {
                type: 'string',
                enum: ['backlog', 'todo', 'in_progress', 'review', 'done'],
                description: 'Initial status (default: backlog)',
              },
              priority: {
                type: 'string',
                enum: ['low', 'medium', 'high', 'urgent'],
                description: 'Priority level (default: medium)',
              },
              category: {
                type: 'string',
                enum: ['feature', 'bug', 'refactor', 'design', 'docs', 'test', 'chore'],
                description: 'Task category (default: feature)',
              },
              phase_id: {
                type: 'string',
                description: 'Phase ID to link this task to (e.g. "1")',
              },
              phase_name: {
                type: 'string',
                description: 'Phase name for display (e.g. "Foundation")',
              },
              sow_deliverable: {
                type: 'string',
                description: 'SOW deliverable this task fulfills',
              },
            },
            required: ['title'],
          },
        },
      },
      required: ['tasks'],
    },
  },
  {
    name: 'update_tasks',
    description:
      'Update multiple existing tasks in batch. Use this to change status, priority, or phase assignments on existing tasks.',
    input_schema: {
      type: 'object' as const,
      properties: {
        updates: {
          type: 'array',
          description: 'Array of task updates',
          items: {
            type: 'object',
            properties: {
              task_id: { type: 'string', description: 'UUID of the task to update' },
              status: {
                type: 'string',
                enum: ['backlog', 'todo', 'in_progress', 'review', 'done'],
              },
              priority: {
                type: 'string',
                enum: ['low', 'medium', 'high', 'urgent'],
              },
              phase_id: { type: 'string', description: 'Phase ID to assign' },
              phase_name: { type: 'string', description: 'Phase name for display' },
            },
            required: ['task_id'],
          },
        },
      },
      required: ['updates'],
    },
  },
];
